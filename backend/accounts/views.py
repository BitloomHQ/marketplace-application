from django.contrib.auth import authenticate, login as django_login

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from rest_framework.authtoken.models import Token

from .models import User
from .serializers import RegisterSerializer
from services.models import Review

# =====================================
# REGISTER API
# =====================================
from rest_framework.views import APIView


class RegisterView(APIView):

    def post(self, request):

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():

            serializer.save()

            return Response(
                {"success": True, "message": "User Registered Successfully"},
                status=status.HTTP_201_CREATED
            )

        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )


# =====================================
# LOGIN API
# =====================================
@api_view(["POST"])
@permission_classes([AllowAny])
def login_api(request):

    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"success": False, "message": "Email and password required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user_obj = User.objects.get(email=email)
        username = user_obj.username
    except User.DoesNotExist:
        return Response(
            {"success": False, "message": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {"success": False, "message": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    role = "admin" if user.is_superuser else user.role

    token, _ = Token.objects.get_or_create(user=user)

    django_login(request, user)

    redirect_map = {
        "customer": "/customer-dashboard",
        "gardener": "/gardener-dashboard",
        "electrician": "/electrician-dashboard",
        "plumber": "/plumber-dashboard",
        "admin": "/admin-dashboard",
    }

    return Response({
        "success": True,
        "message": "Login successful",
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": role,
            "phone": user.phone,
            "address": user.address,
        },
        "redirect_url": redirect_map.get(role, "/dashboard")
    }, status=status.HTTP_200_OK)


# =====================================
# DASHBOARD API
# =====================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_api(request):

    user = request.user

    dashboard_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "address": user.address,
    }

    provider_roles = [
        "gardener",
        "electrician",
        "plumber"
    ]

    # Provider rating logic
    if user.role in provider_roles:

        provider_reviews = Review.objects.filter(
            provider=user
        )

        average_rating = 0

        if provider_reviews.exists():

            total = sum(
                review.rating
                for review in provider_reviews
            )

            average_rating = round(
                total / provider_reviews.count(),
                1
            )

        dashboard_data["average_rating"] = average_rating
        dashboard_data["total_reviews"] = provider_reviews.count()

    # Customer Dashboard
    if user.role == "customer":

        dashboard_data["dashboard_type"] = "Customer Dashboard"

        dashboard_data["services"] = [
            "Gardener",
            "Electrician",
            "Plumber"
        ]

        dashboard_data["features"] = [
            "Book Services",
            "View Bookings",
            "Track Requests"
        ]

    elif user.role == "gardener":

        dashboard_data["dashboard_type"] = "Gardener Dashboard"

        dashboard_data["features"] = [
            "View Lawn Requests",
            "Send Quotations",
            "Manage Jobs",
            "View Rating"
        ]

    elif user.role == "electrician":

        dashboard_data["dashboard_type"] = "Electrician Dashboard"

        dashboard_data["features"] = [
            "View Electrical Requests",
            "Send Quotations",
            "Manage Jobs",
            "View Rating"
        ]

    elif user.role == "plumber":

        dashboard_data["dashboard_type"] = "Plumber Dashboard"

        dashboard_data["features"] = [
            "View Plumbing Requests",
            "Send Quotations",
            "Manage Jobs",
            "View Rating"
        ]

    return Response({
        "success": True,
        "message": "Dashboard Loaded Successfully",
        "data": dashboard_data
    }, status=status.HTTP_200_OK)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def providers_by_service(request):

    user = request.user

    # 🚫 ONLY CUSTOMER CAN ACCESS
    if user.role != "customer":
        return Response({
            "success": False,
            "message": "Only customers can view providers list"
        }, status=403)

    service = request.GET.get("service")

    if service not in ["gardener", "electrician", "plumber"]:
        return Response({
            "success": False,
            "message": "Invalid service type"
        }, status=400)

    providers = User.objects.filter(role=service)

    data = []

    for p in providers:
        data.append({
            "id": p.id,
            "username": p.username,
            "email": p.email,
            "phone": p.phone,
            "address": p.address,
            "role": p.role
        })

    return Response({
        "success": True,
        "service": service,
        "total_providers": providers.count(),
        "providers": data
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
            status=status.HTTP_403_FORBIDDEN
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

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CustomerAddress


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
        customer=request.user
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
        customer=request.user
    ).first()

    if not address:
        return Response({
            "success": False,
            "message": "Address not found"
        })

    address.delete()

    return Response({
        "success": True,
        "message": "Address deleted"
    })
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def edit_address(request, address_id):

    address = CustomerAddress.objects.filter(
        id=address_id,
        customer=request.user
    ).first()

    if not address:
        return Response(
            {
                "success": False,
                "message": "Address not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    title = request.data.get("title")
    address_text = request.data.get("address")
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    if title is not None:
        address.title = title

    if address_text is not None:
        address.address = address_text

    if latitude is not None:
        address.latitude = latitude

    if longitude is not None:
        address.longitude = longitude

    address.save()

    return Response({
        "success": True,
        "message": "Address updated successfully",

        "address": {
            "id": address.id,
            "title": address.title,
            "address": address.address,
            "latitude": address.latitude,
            "longitude": address.longitude,
        }
    }, status=status.HTTP_200_OK)    


# =====================================
# GOOGLE MAPS (server-side proxy)
# =====================================
from .google_maps import (
    autocomplete_places,
    geocode_address_text,
    maps_configured,
    place_details,
    reverse_geocode,
)


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

