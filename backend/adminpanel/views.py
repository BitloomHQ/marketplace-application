from django.db.models import Max
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from accounts.helpers import is_provider_role, media_url, provider_role_keys
from services.models import ServiceRequest, Quote, Booking, Review
from .models import ServiceCategory

from .permissions import (
    IsAdminUser,
    CanManageAdminUsers,
    CanManageProviders,
    CanManageCustomers,
    CanManageServices,
    CanManageBookings,
    CanManageQuotes,
    CanViewReports,
    CanManageSpotlights,
    get_admin_permissions,
)

from .serializers import (
    AdminUserSerializer,
    CreateAdminUserSerializer,
    UpdateAdminUserSerializer,
)

def parse_boolean(value, default=False):
    """
    Convert form-data/string boolean values safely.
    """

    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in (
        "true",
        "1",
        "yes",
        "on",
    )


@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsAdminUser,
])
def admin_dashboard(request):
    """
    Return admin profile, permissions,
    and marketplace dashboard statistics.
    """

    user = request.user

    # =========================================================
    # ADMIN PERMISSIONS
    # =========================================================

    permissions = get_admin_permissions(user)

    # =========================================================
    # USER STATISTICS
    # =========================================================

    total_customers = User.objects.filter(
        role="customer"
    ).count()

    active_customers = User.objects.filter(
        role="customer",
        is_active=True,
    ).count()

    inactive_customers = User.objects.filter(
        role="customer",
        is_active=False,
    ).count()

    provider_roles = provider_role_keys()

    total_providers = User.objects.filter(
        role__in=provider_roles
    ).count()

    active_providers = User.objects.filter(
        role__in=provider_roles,
        is_active=True,
    ).count()

    inactive_providers = User.objects.filter(
        role__in=provider_roles,
        is_active=False,
    ).count()

    pending_providers = User.objects.filter(
        role__in=provider_roles,
        is_approved=False,
    ).count()

    approved_providers = User.objects.filter(
        role__in=provider_roles,
        is_approved=True,
    ).count()

    verified_providers = User.objects.filter(
        role__in=provider_roles,
        is_verified=True,
    ).count()

    # =========================================================
    # SERVICE STATISTICS
    # =========================================================

    total_services = (
        ServiceCategory.objects.count()
    )

    active_services = (
        ServiceCategory.objects
        .filter(
            status="active"
        )
        .count()
    )

    coming_soon_services = (
        ServiceCategory.objects
        .filter(
            status="coming_soon"
        )
        .count()
    )

    inactive_services = (
        ServiceCategory.objects
        .filter(
            status="inactive"
        )
        .count()
    )

    # =========================================================
    # MARKETPLACE STATISTICS
    # =========================================================

    total_requests = (
        ServiceRequest.objects.count()
    )

    total_quotes = (
        Quote.objects.count()
    )

    total_bookings = (
        Booking.objects.count()
    )

    completed_bookings = (
        Booking.objects
        .filter(
            status="completed"
        )
        .count()
    )

    cancelled_bookings = (
        Booking.objects
        .filter(
            status="cancelled"
        )
        .count()
    )

    total_reviews = (
        Review.objects.count()
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            # ---------------------------------------------
            # LOGGED-IN ADMIN
            # ---------------------------------------------

            "admin": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,

                "full_name": (
                    user.get_full_name()
                    or user.username
                ),

                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,

                "admin_type": (
                    "super_admin"
                    if user.is_superuser
                    else "admin"
                ),

                "permissions": permissions,
            },

            # ---------------------------------------------
            # DASHBOARD DATA
            # ---------------------------------------------

            "data": {

                "users": {
                    "total_customers": (
                        total_customers
                    ),

                    "active_customers": (
                        active_customers
                    ),

                    "inactive_customers": (
                        inactive_customers
                    ),

                    "total_providers": (
                        total_providers
                    ),

                    "active_providers": (
                        active_providers
                    ),

                    "inactive_providers": (
                        inactive_providers
                    ),

                    "pending_providers": (
                        pending_providers
                    ),

                    "approved_providers": (
                        approved_providers
                    ),

                    "verified_providers": (
                        verified_providers
                    ),
                },

                "services": {
                    "total_services": (
                        total_services
                    ),

                    "active_services": (
                        active_services
                    ),

                    "coming_soon_services": (
                        coming_soon_services
                    ),

                    "inactive_services": (
                        inactive_services
                    ),
                },

                "marketplace": {
                    "total_requests": (
                        total_requests
                    ),

                    "total_quotes": (
                        total_quotes
                    ),

                    "total_bookings": (
                        total_bookings
                    ),

                    "completed_bookings": (
                        completed_bookings
                    ),

                    "cancelled_bookings": (
                        cancelled_bookings
                    ),

                    "total_reviews": (
                        total_reviews
                    ),
                },
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def pending_providers(request):

    providers = User.objects.filter(
        role__in=provider_role_keys(),
        is_approved=False
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "providers": [
            {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "phone": provider.phone,
                "address": provider.address,
                "role": provider.role,
                "bio": provider.bio,
                "experience_years": provider.experience_years,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "profile_picture": (
                    request.build_absolute_uri(provider.profile_picture.url)
                    if provider.profile_picture else None
                ),
                "date_joined": provider.date_joined,
            }
            for provider in providers
        ]
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_provider(request, provider_id):

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_role_keys()
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_approved = True
    provider.is_verified = True
    provider.is_active = True
    provider.status_note = ''
    provider.save()

    return Response({
        "success": True,
        "message": "Provider approved successfully"
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def reject_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_role_keys()
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_approved = False
    provider.is_verified = False
    provider.is_active = False
    provider.status_note = reason
    provider.save()

    return Response({
        "success": True,
        "message": "Provider rejected successfully",
        "reason": reason,
    })

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageServices,
])
def service_categories(request):

    services = (
        ServiceCategory.objects
        .all()
        .order_by(
            "display_order",
            "id",
        )
    )

    return Response({
        "success": True,

        "services": [
            {
                "id": service.id,

                "name": service.name,

                "key": service.key,

                "description": service.description,
                "service_image": media_url(request, service.service_image),
                "status": service.status,

                "start_date": service.start_date,

                "display_order": (
                    service.display_order
                ),

                "is_popular": (
                    service.is_popular
                ),
            }

            for service in services
        ],
    })


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageServices,
])
def create_service_category(request):

    name = request.data.get("name")
    key = request.data.get("key")
    description = request.data.get(
        "description"
    )

    service_image = request.FILES.get(
        "service_image"
    )

    # -----------------------------------------
    # VALIDATION
    # -----------------------------------------

    if not name or not key or not description:

        return Response(
            {
                "success": False,
                "message": (
                    "name, key and description "
                    "are required"
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if ServiceCategory.objects.filter(
        key=key
    ).exists():

        return Response(
            {
                "success": False,
                "message": (
                    "Service key already exists"
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    max_order = (
        ServiceCategory.objects.aggregate(max_order=Max("display_order"))["max_order"] or 0
    )

    service = ServiceCategory.objects.create(
        name=name,
        key=key,
        description=description,

        service_image=service_image,
        status=request.data.get("status", "coming_soon"),
        start_date=request.data.get("start_date", "Yet to start"),
        display_order=max_order + 1,
    )

    return Response({
        "success": True,
        "message": "Service category created successfully",
        "service_id": service.id,
        "service_image": media_url(request, service.service_image),
    }, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([
    IsAuthenticated,
    CanManageServices,
])
def update_service_category(
    request,
    service_id,
):

    service = (
        ServiceCategory.objects
        .filter(
            id=service_id
        )
        .first()
    )

    if not service:

        return Response(
            {
                "success": False,
                "message": (
                    "Service not found"
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    service.name = request.data.get("name", service.name)
    service.description = request.data.get("description", service.description)
    service.status = request.data.get("status", service.status)
    service.start_date = request.data.get("start_date", service.start_date)

    service.description = request.data.get(
        "description",
        service.description,
    )

    service.status = request.data.get(
        "status",
        service.status,
    )

    service.start_date = request.data.get(
        "start_date",
        service.start_date,
    )

    service.display_order = request.data.get(
        "display_order",
        service.display_order,
    )

    # -----------------------------------------
    # POPULAR SERVICE
    # -----------------------------------------

    if "is_popular" in request.data:

        service.is_popular = parse_boolean(
            request.data.get(
                "is_popular"
            )
        )

    # -----------------------------------------
    # IMAGE
    # -----------------------------------------

    service_image = request.FILES.get(
        "service_image"
    )

    if service_image:
        service.service_image = (
            service_image
        )

    service.save()

    # -----------------------------------------
    # RESPONSE
    # -----------------------------------------

    return Response({
        "success": True,

        "message": (
            "Service category updated "
            "successfully"
        ),

        "service": {
            "id": service.id,

            "name": service.name,

            "key": service.key,
            "description": service.description,
            "service_image": media_url(request, service.service_image),
            "status": service.status,

            "start_date": (
                service.start_date
            ),

            "display_order": (
                service.display_order
            ),

            "is_popular": (
                service.is_popular
            ),
        },
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def reorder_service_categories(request):
    order = request.data.get("order")

    if not isinstance(order, list) or not order:
        return Response(
            {
                "success": False,
                "message": "order must be a non-empty list of service ids",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        service_ids = [int(service_id) for service_id in order]
    except (TypeError, ValueError):
        return Response(
            {
                "success": False,
                "message": "order must contain valid service ids",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    services = ServiceCategory.objects.filter(id__in=service_ids)
    services_by_id = {service.id: service for service in services}

    if len(services_by_id) != len(set(service_ids)):
        return Response(
            {
                "success": False,
                "message": "One or more service ids are invalid",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    updated = []
    for index, service_id in enumerate(service_ids):
        service = services_by_id[service_id]
        service.display_order = index + 1
        updated.append(service)

    ServiceCategory.objects.bulk_update(updated, ["display_order"])

    return Response({
        "success": True,
        "message": "Service order updated successfully",
    })


@api_view(["DELETE"])
@permission_classes([
    IsAuthenticated,
    CanManageServices,
])
def delete_service_category(request, service_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Delete reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    service = ServiceCategory.objects.filter(
        id=service_id
    ).first()

    if not service:
        return Response(
            {
                "success": False,
                "message": "Service not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    service_name = service.name
    service_key = service.key

    service.delete()

    return Response({
        "success": True,
        "message": "Service category deleted successfully",
        "deleted_service": {
            "name": service_name,
            "key": service_key,
            "reason": reason
        }
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_providers(request):

    providers = User.objects.filter(
        role__in=provider_role_keys()
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "providers": [
            {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "phone": provider.phone,
                "address": provider.address,
                "role": provider.role,
                "bio": provider.bio,
                "experience_years": provider.experience_years,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "status_note": provider.status_note or "",
                "profile_picture": (
                    request.build_absolute_uri(provider.profile_picture.url)
                    if provider.profile_picture else None
                ),
                "date_joined": provider.date_joined,
            }
            for provider in providers
        ]
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def activate_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_role_keys()
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_active = True
    provider.deactivate_reason = None
    provider.status_note = ''
    provider.save()

    return Response({
        "success": True,
        "message": "Provider activated successfully",
        "reason": reason
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def deactivate_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_role_keys()
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_active = False
    provider.deactivate_reason = reason
    provider.save()

    return Response({
        "success": True,
        "message": "Provider deactivated successfully",
        "reason": reason
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def verify_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_role_keys()
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_verified = True
    provider.is_approved = True
    provider.is_active = True
    provider.status_note = ''
    provider.save()

    return Response({
        "success": True,
        "message": "Provider verified successfully",
        "reason": reason
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def unverify_provider(request, provider_id):

    reason = request.data.get("reason")

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    provider = User.objects.filter(
        id=provider_id,
        role__in=provider_role_keys()
    ).first()

    if not provider:
        return Response(
            {"success": False, "message": "Provider not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    provider.is_verified = False
    provider.save()

    return Response({
        "success": True,
        "message": "Provider unverified successfully",
        "reason": reason
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_customers(request):

    customers = User.objects.filter(
        role="customer"
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "customers": [
            {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "phone": customer.phone,
                "address": customer.address,
                "is_active": customer.is_active,
                "date_joined": customer.date_joined,
                "profile_picture": (
                    request.build_absolute_uri(customer.profile_picture.url)
                    if customer.profile_picture else None
                ),
            }
            for customer in customers
        ]
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def activate_customer(request, customer_id):

    customer = User.objects.filter(
        id=customer_id,
        role="customer"
    ).first()

    if not customer:
        return Response(
            {"success": False, "message": "Customer not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    customer.is_active = True
    customer.is_approved = True
    customer.save()

    return Response({
        "success": True,
        "message": "Customer activated successfully"
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def deactivate_customer(request, customer_id):

    customer = User.objects.filter(
        id=customer_id,
        role="customer"
    ).first()

    if not customer:
        return Response(
            {"success": False, "message": "Customer not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    customer.is_active = False
    customer.save()

    return Response({
        "success": True,
        "message": "Customer deactivated successfully"
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_service_requests(request):

    requests = ServiceRequest.objects.all().order_by("-created_at")

    return Response({
        "success": True,
        "requests": [
            {
                "id": item.id,
                "customer_id": item.customer.id,
                "customer": item.customer.username,
                "service_type": item.service_type,
                "address": item.customer_address.address if item.customer_address else item.address,
                "lat": item.lat,
                "lon": item.lon,
                "description": item.description,
                "status": item.status,
                "is_booked": item.is_booked,
                "selected_provider": item.selected_provider.username if item.selected_provider else None,
                "created_at": item.created_at,
            }
            for item in requests
        ]
    })


@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageBookings,
])
def all_bookings(request):

    bookings = Booking.objects.all().order_by("-created_at")

    return Response({
        "success": True,
        "bookings": [
            {
                "id": booking.id,
                "service_request_id": booking.service_request.id,
                "service_type": booking.service_request.service_type,
                "customer_id": booking.customer.id,
                "customer": booking.customer.username,
                "provider_id": booking.provider.id,
                "provider": booking.provider.username,
                "final_price": booking.final_price,
                "status": booking.status,
                "created_at": booking.created_at,
                "updated_at": booking.updated_at,
            }
            for booking in bookings
        ]
    })


@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageQuotes,
])
def all_quotes(request):

    quotes = Quote.objects.all().order_by("-created_at")

    return Response({
        "success": True,
        "quotes": [
            {
                "id": quote.id,
                "service_request_id": quote.service_request.id,
                "service_type": quote.service_request.service_type,
                "customer": quote.service_request.customer.username,
                "provider_id": quote.provider.id,
                "provider": quote.provider.username,
                "price": quote.price,
                "message": quote.message,
                "status": quote.status,
                "created_at": quote.created_at,
            }
            for quote in quotes
        ]
    })

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanViewReports,
])
def provider_performance(request):

    providers = User.objects.filter(
        role__in=provider_role_keys()
    ).order_by("username")

    data = []

    for provider in providers:

        total_quotes = Quote.objects.filter(
            provider=provider
        ).count()

        accepted_quotes = Quote.objects.filter(
            provider=provider,
            status="accepted"
        ).count()

        total_bookings = Booking.objects.filter(
            provider=provider
        ).count()

        completed_bookings = Booking.objects.filter(
            provider=provider,
            status="completed"
        ).count()

        cancelled_bookings = Booking.objects.filter(
            provider=provider,
            status="cancelled"
        ).count()

        reviews = Review.objects.filter(
            provider=provider
        )

        average_rating = 0

        if reviews.exists():
            total_rating = sum(review.rating for review in reviews)
            average_rating = round(total_rating / reviews.count(), 1)

        acceptance_rate = 0
        if total_quotes > 0:
            acceptance_rate = round((accepted_quotes / total_quotes) * 100, 2)

        completion_rate = 0
        if total_bookings > 0:
            completion_rate = round((completed_bookings / total_bookings) * 100, 2)

        data.append({
            "provider_id": provider.id,
            "provider": provider.username,
            "email": provider.email,
            "phone": provider.phone,
            "role": provider.role,
            "is_active": provider.is_active,
            "is_approved": provider.is_approved,
            "is_verified": provider.is_verified,
            "profile_picture": (
                request.build_absolute_uri(provider.profile_picture.url)
                if provider.profile_picture else None
            ),
            "total_quotes": total_quotes,
            "accepted_quotes": accepted_quotes,
            "acceptance_rate": acceptance_rate,
            "total_bookings": total_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "completion_rate": completion_rate,
            "total_reviews": reviews.count(),
            "average_rating": average_rating,
        })

    return Response({
        "success": True,
        "providers": data
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def all_providers(request):

    providers = User.objects.filter(
        role__in=provider_role_keys()
    ).order_by("-date_joined")

    return Response({
        "success": True,
        "providers": [
            {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "phone": provider.phone,
                "address": provider.address,
                "role": provider.role,
                "bio": provider.bio,
                "experience_years": provider.experience_years,
                "is_active": provider.is_active,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "deactivate_reason": provider.deactivate_reason,
                "profile_picture": (
                    request.build_absolute_uri(provider.profile_picture.url)
                    if provider.profile_picture else None
                ),
                "date_joined": provider.date_joined,
            }
            for provider in providers
        ]
    })    

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SpotlightImage
from .serializers import AdminUserSerializer, CreateAdminUserSerializer, SpotlightImageSerializer, UpdateAdminUserSerializer
from .permissions import IsAdminUser

# ==========================================================
# SPOTLIGHT IMAGES
# ==========================================================


@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsAdminUser,
])
def spotlight_list_api(request):

    spotlights = SpotlightImage.objects.all()

    serializer = SpotlightImageSerializer(
        spotlights,
        many=True,
        context={"request": request},
    )

    return Response(
        {
            "success": True,
            "message": "Spotlight images fetched successfully.",
            "count": spotlights.count(),
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageSpotlights,
])
def spotlight_create_api(request):

    serializer = SpotlightImageSerializer(
        data=request.data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Spotlight image creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    spotlight = serializer.save()

    return Response(
        {
            "success": True,
            "message": "Spotlight image created successfully.",
            "data": SpotlightImageSerializer(
                spotlight,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH", "PUT"])
@permission_classes([
    IsAuthenticated,
    IsAdminUser,
])
def spotlight_update_api(request, spotlight_id):

    try:
        spotlight = SpotlightImage.objects.get(
            id=spotlight_id
        )

    except SpotlightImage.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Spotlight image not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = SpotlightImageSerializer(
        spotlight,
        data=request.data,
        partial=request.method == "PATCH",
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Spotlight image update failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    spotlight = serializer.save()

    return Response(
        {
            "success": True,
            "message": "Spotlight image updated successfully.",
            "data": SpotlightImageSerializer(
                spotlight,
                context={"request": request},
            ).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([
    IsAuthenticated,
    IsAdminUser,
])
def spotlight_delete_api(request, spotlight_id):

    try:
        spotlight = SpotlightImage.objects.get(
            id=spotlight_id
        )

    except SpotlightImage.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Spotlight image not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # Delete actual image file from storage
    if spotlight.image:
        spotlight.image.delete(
            save=False
        )

    spotlight.delete()

    return Response(
        {
            "success": True,
            "message": "Spotlight image deleted successfully.",
        },
        status=status.HTTP_200_OK,
    )

# =========================================
# PUBLIC SPOTLIGHT IMAGES
# =========================================

@api_view(["GET"])
@permission_classes([AllowAny])
def public_spotlights_api(request):

    spotlights = (
        SpotlightImage.objects
        .filter(is_active=True)
        .order_by("display_order", "-created_at")
    )

    serializer = SpotlightImageSerializer(
        spotlights,
        many=True,
        context={"request": request},
    )

    return Response(
        {
            "success": True,
            "message": "Active spotlight images fetched successfully.",
            "count": spotlights.count(),
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([AllowAny])
def popular_services_api(request):
    """
    Return active service categories marked as popular.
    """

    services = (
        ServiceCategory.objects
        .filter(
            status="active",
            is_popular=True,
        )
        .order_by(
            "display_order",
            "name",
        )
    )

    data = []

    for service in services:

        service_image = None

        if service.service_image:
            service_image = request.build_absolute_uri(
                service.service_image.url
            )

        data.append(
            {
                "id": service.id,
                "name": service.name,
                "key": service.key,
                "description": service.description,
                "service_image": service_image,
                "status": service.status,
                "start_date": service.start_date,
                "display_order": service.display_order,
                "is_popular": service.is_popular,
            }
        )

    return Response(
        {
            "success": True,
            "message": "Popular services fetched successfully.",
            "count": len(data),
            "data": data,
        },
        status=status.HTTP_200_OK,
    )
from django.db.models import Q
@api_view(["GET"])
@permission_classes([AllowAny])
def public_services_api(request):
    """
    Return customer-visible service categories.

    Filters:
    - search
    - status
    - popular
    """

    services = ServiceCategory.objects.filter(
        status__in=[
            "active",
            "coming_soon",
        ]
    )

    # ---------------------------------------------------------
    # SEARCH
    # ---------------------------------------------------------

    search = request.query_params.get(
        "search",
        ""
    ).strip()

    if search:
        services = services.filter(
            Q(name__icontains=search)
            | Q(key__icontains=search)
            | Q(description__icontains=search)
        )

    # ---------------------------------------------------------
    # STATUS FILTER
    # ---------------------------------------------------------

    service_status = request.query_params.get(
        "status"
    )

    if service_status in [
        "active",
        "coming_soon",
    ]:
        services = services.filter(
            status=service_status
        )

    # ---------------------------------------------------------
    # POPULAR FILTER
    # ---------------------------------------------------------

    popular = request.query_params.get(
        "popular"
    )

    if popular is not None:

        popular_value = (
            popular.strip().lower()
            in [
                "true",
                "1",
                "yes",
            ]
        )

        services = services.filter(
            is_popular=popular_value
        )

    # ---------------------------------------------------------
    # ORDERING
    # ---------------------------------------------------------

    services = services.order_by(
        "display_order",
        "name",
    )

    # ---------------------------------------------------------
    # RESPONSE DATA
    # ---------------------------------------------------------

    data = []

    for service in services:

        service_image = None

        if service.service_image:
            service_image = (
                request.build_absolute_uri(
                    service.service_image.url
                )
            )

        data.append({
            "id": service.id,
            "name": service.name,
            "key": service.key,
            "description": service.description,
            "service_image": service_image,
            "status": service.status,
            "start_date": service.start_date,
            "display_order": service.display_order,
            "is_popular": service.is_popular,
            "is_available": (
                service.status == "active"
            ),
        })

    return Response(
        {
            "success": True,
            "message": (
                "Public services fetched successfully."
            ),
            "filters": {
                "search": search or None,
                "status": service_status,
                "popular": popular,
            },
            "count": len(data),
            "data": data,
        },
        status=status.HTTP_200_OK,
    )



@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageAdminUsers,
])
def admin_users_api(request):
    """
    Return all staff admin users except superusers.
    """

    admin_users = (
        User.objects
        .filter(
            is_staff=True,
            is_superuser=False,
        )
        .select_related(
            "admin_permission_profile"
        )
        .order_by(
            "-date_joined"
        )
    )

    serializer = AdminUserSerializer(
        admin_users,
        many=True,
    )

    return Response(
        {
            "success": True,
            "message": "Admin users fetched successfully.",
            "count": admin_users.count(),
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageAdminUsers,
])
@transaction.atomic
def create_admin_user_api(request):
    """
    Create a new permission-based admin user.
    """

    serializer = CreateAdminUserSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Admin user creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    admin_user = serializer.save()

    return Response(
        {
            "success": True,
            "message": "Admin user created successfully.",
            "data": AdminUserSerializer(
                admin_user
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageAdminUsers,
])
def admin_user_detail_api(
    request,
    admin_id,
):
    """
    Return one admin user's details and permissions.
    """

    try:
        admin_user = (
            User.objects
            .select_related(
                "admin_permission_profile"
            )
            .get(
                id=admin_id,
                is_staff=True,
                is_superuser=False,
            )
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Admin user not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "message": "Admin user fetched successfully.",
            "data": AdminUserSerializer(
                admin_user
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["PATCH"])
@permission_classes([
    IsAuthenticated,
    CanManageAdminUsers,
])
@transaction.atomic
def update_admin_user_api(
    request,
    admin_id,
):
    """
    Update admin details and permissions.
    """

    try:
        admin_user = (
            User.objects
            .select_for_update()
            .get(
                id=admin_id,
                is_staff=True,
                is_superuser=False,
            )
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Admin user not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = UpdateAdminUserSerializer(
        admin_user,
        data=request.data,
        partial=True,
        context={
            "user": admin_user,
        },
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Admin user update failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    admin_user = serializer.save()

    return Response(
        {
            "success": True,
            "message": "Admin user updated successfully.",
            "data": AdminUserSerializer(
                admin_user
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageAdminUsers,
])
def activate_admin_user_api(
    request,
    admin_id,
):

    try:
        admin_user = User.objects.get(
            id=admin_id,
            is_staff=True,
            is_superuser=False,
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Admin user not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    admin_user.is_active = True

    admin_user.save(
        update_fields=[
            "is_active",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Admin user activated successfully.",
            "data": AdminUserSerializer(
                admin_user
            ).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageAdminUsers,
])
def deactivate_admin_user_api(
    request,
    admin_id,
):

    try:
        admin_user = User.objects.get(
            id=admin_id,
            is_staff=True,
            is_superuser=False,
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Admin user not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # Prevent admin from disabling themselves.
    if admin_user.id == request.user.id:
        return Response(
            {
                "success": False,
                "message": (
                    "You cannot deactivate your own account."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    admin_user.is_active = False

    admin_user.save(
        update_fields=[
            "is_active",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Admin user deactivated successfully.",
            "data": AdminUserSerializer(
                admin_user
            ).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["DELETE"])
@permission_classes([
    IsAuthenticated,
    CanManageAdminUsers,
])
@transaction.atomic
def delete_admin_user_api(
    request,
    admin_id,
):

    try:
        admin_user = User.objects.get(
            id=admin_id,
            is_staff=True,
            is_superuser=False,
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Admin user not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if admin_user.id == request.user.id:
        return Response(
            {
                "success": False,
                "message": (
                    "You cannot delete your own account."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    admin_user.delete()

    return Response(
        {
            "success": True,
            "message": "Admin user deleted successfully.",
        },
        status=status.HTTP_200_OK,
    )