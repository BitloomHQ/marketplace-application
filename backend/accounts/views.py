from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import User, CustomerAddress
from .helpers import (
    active_service_keys,
    dashboard_services,
    effective_role,
    is_active_service_key,
    is_provider_role,
    media_url,
    provider_list_payload,
    provider_rating,
    serialize_address,
    serialize_service_category,
    user_base_payload,
)
from .google_maps import (
    autocomplete_places,
    geocode_address_text,
    maps_configured,
    place_details,
    reverse_geocode,
)
from services.models import Review
from adminpanel.models import ServiceCategory

# =====================================
# DASHBOARD & ADDRESSES
# =====================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_api(request):
    user = request.user
    role = effective_role(user)
    dashboard_data = user_base_payload(user, request)

    if is_provider_role(role):
        average_rating, total_reviews = provider_rating(user)
        dashboard_data["average_rating"] = average_rating
        dashboard_data["total_reviews"] = total_reviews

    if role == "customer":
        dashboard_data["dashboard_type"] = "Customer Dashboard"
        categories = list(dashboard_services())
        active = [c for c in categories if c.status == "active"]
        dashboard_data["popular_services"] = [
            serialize_service_category(c, request) for c in active[:3]
        ]
        dashboard_data["services"] = [
            serialize_service_category(c, request) for c in categories
        ]
        dashboard_data["features"] = [
            "Book Services",
            "View Bookings",
            "Track Requests",
            "Popular Services",
            "Coming Soon Services",
        ]

    elif role == "admin":
        dashboard_data["dashboard_type"] = "Admin Dashboard"
        dashboard_data["features"] = [
            "Manage Providers",
            "Manage Services",
            "Monitor Marketplace",
            "View Performance",
        ]

    elif is_provider_role(role):
        service_name = role.replace('_', ' ').title()
        dashboard_data["dashboard_type"] = f"{service_name} Dashboard"
        dashboard_data["features"] = [
            "View Service Requests",
            "Send Quotations",
            "Manage Jobs",
            "View Rating",
        ]

    return Response({
        "success": True,
        "message": "Dashboard Loaded Successfully",
        "data": dashboard_data,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def providers_by_service(request):
    user = request.user
    if user.role != "customer":
        return Response({
            "success": False,
            "message": "Only customers can view providers list",
        }, status=403)

    service = request.GET.get("service")
    if not service or not is_active_service_key(service):
        return Response({
            "success": False,
            "message": "Invalid service type",
        }, status=400)

    providers = list(
        User.objects.filter(
            role=service,
            is_active=True,
            is_approved=True,
        )
    )

    return Response({
        "success": True,
        "service": service,
        "total_providers": len(providers),
        "providers": [
            provider_list_payload(p, request) for p in providers
        ],
    })

# =====================================
# CUSTOMER DASHBOARD API
# =====================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_dashboard(request):
    user = request.user
    if user.role != "customer":
        return Response(
            {"success": False, "message": "Only customers allowed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response({
        "success": True,
        "customer": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "address": user.address,
        }
    })


def _parse_coords(request):
    lat = request.data.get("latitude", request.data.get("lat"))
    lon = request.data.get("longitude", request.data.get("lon"))
    if lat is None or lon is None:
        return None, None, "latitude and longitude required"
    try:
        return float(lat), float(lon), None
    except (TypeError, ValueError):
        return None, None, "latitude and longitude must be valid numbers"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_address(request):

    address = CustomerAddress.objects.create(
        customer=request.user,
        title=request.data.get("title"),
        address=request.data.get("address"),
        latitude=request.data.get("latitude"),
        longitude=request.data.get("longitude"),
    )

    return Response({
        "success": True,
        "address": {
            "id": address.id,
            "title": address.title,
            "address": address.address,
            "latitude": address.latitude,
            "longitude": address.longitude,
        }
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_addresses(request):
    addresses = CustomerAddress.objects.filter(
        customer=request.user,
    ).order_by("-created_at")

    return Response({
        "success": True,
        "addresses": [
            {
                "id": item.id,
                "title": item.title,
                "address": item.address,
                "latitude": item.latitude,
                "longitude": item.longitude,
            }
            for item in addresses
        ]
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_address(request, address_id):
    address = CustomerAddress.objects.filter(
        id=address_id,
        customer=request.user,
    ).first()

    if not address:
        return Response({
            "success": False,
            "message": "Address not found",
        }, status=status.HTTP_404_NOT_FOUND)

    address.delete()
    return Response({
        "success": True,
        "message": "Address deleted",
    })
    

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def edit_address(request, address_id):
    if request.user.role != "customer":
        return Response(
            {"success": False, "message": "Only customers allowed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    address = CustomerAddress.objects.filter(
        id=address_id,
        customer=request.user,
    ).first()

    if not address:
        return Response({
            "success": False,
            "message": "Address not found",
        }, status=status.HTTP_404_NOT_FOUND)

    title = request.data.get("title")
    address_text = request.data.get("address")
    lat, lon, err = _parse_coords(request)

    if title:
        address.title = title
    if address_text:
        address.address = address_text
    if lat is not None and lon is not None:
        address.latitude = lat
        address.longitude = lon
    elif err and (request.data.get("latitude") is not None or request.data.get("lat") is not None):
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    address.save()

    return Response({
        "success": True,
        "message": "Address updated successfully",
        "address": serialize_address(address),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_status(request):
    return Response({
        "success": True,
        "configured": maps_configured(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_autocomplete(request):
    query = (request.query_params.get("input") or "").strip()
    configured = maps_configured()

    if len(query) < 2:
        return Response({
            "success": True,
            "configured": configured,
            "predictions": [],
        })

    predictions, err = autocomplete_places(query)
    if err:
        return Response(
            {"success": False, "configured": configured, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        "success": True,
        "configured": True,
        "predictions": predictions,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_place_details(request):
    place_id = (request.query_params.get("place_id") or "").strip()
    if not place_id:
        return Response(
            {"success": False, "message": "place_id required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    details, err = place_details(place_id)
    if err:
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({"success": True, **details})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_geocode_address(request):
    address = (request.query_params.get("address") or "").strip()
    if len(address) < 3:
        return Response(
            {"success": False, "message": "address required (min 3 characters)"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    details, err = geocode_address_text(address)
    if err:
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({"success": True, **details})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maps_reverse_geocode(request):
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")
    if lat is None or lon is None:
        return Response(
            {"success": False, "message": "lat and lon required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "lat and lon must be numbers"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    address, err = reverse_geocode(lat_f, lon_f)
    if err:
        return Response(
            {"success": False, "message": err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        "success": True,
        "address": address,
        "lat": lat_f,
        "lon": lon_f,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def active_services(request):

    services = ServiceCategory.objects.filter(
        status="active"
    ).order_by("display_order")

    return Response({
        "success": True,
        "services": [
            {
                "id": service.id,
                "name": service.name,
                "key": service.key,
                "description": service.description,
                "status": service.status,

                "service_image": media_url(request, service.service_image),
            }
            for service in services
        ]
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def public_services(request):
    categories = list(dashboard_services())
    active = [c for c in categories if c.status == "active"]
    coming_soon = [c for c in categories if c.status == "coming_soon"]

    return Response({
        "success": True,
        "services": [serialize_service_category(c, request) for c in categories],
        "popular_services": [
            serialize_service_category(c, request) for c in active[:5]
        ],
        "coming_soon_services": [
            serialize_service_category(c, request) for c in coming_soon
        ],
    })
