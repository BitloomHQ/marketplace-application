from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal, InvalidOperation
from django.db import transaction
from .models import (
    User,
    CustomerAddress,
    FavoriteProvider,
)
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
from django.db.models import Sum, Avg
from django.utils import timezone

from .models import CustomerAddress

from service_requests.models import (
    CustomerServiceRequest,
    ProviderQuotation,
    ServiceBooking,
    ServiceReview,
)

from .helpers import (
    media_url,
    serialize_address,
)
from .helpers import (
    favorite_provider_payload,
    is_provider_role,
)
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
    """
    Return the logged-in customer's complete dashboard.

    Includes:
    - Account information
    - Address summary
    - Service request statistics
    - Quotation statistics
    - Booking statistics
    - Review statistics
    - Spending summary
    - Current booking
    - Upcoming booking
    """

    user = request.user

    # =========================================================
    # CUSTOMER ACCESS
    # =========================================================

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can access "
                    "the customer dashboard."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # BASE QUERYSETS
    # =========================================================

    service_requests = (
        CustomerServiceRequest.objects
        .filter(customer=user)
    )

    quotations = (
        ProviderQuotation.objects
        .filter(
            service_request__customer=user
        )
    )

    bookings = (
        ServiceBooking.objects
        .filter(customer=user)
    )

    reviews = (
        ServiceReview.objects
        .filter(customer=user)
    )

    addresses = (
        CustomerAddress.objects
        .filter(customer=user)
        .order_by(
            "-is_default",
            "-created_at",
        )
    )

    # =========================================================
    # REQUEST STATISTICS
    # =========================================================

    total_requests = service_requests.count()

    active_request_statuses = [
        "open",
        "matched",
        "quoted",
        "accepted",
        "in_progress",
    ]

    active_requests = (
        service_requests
        .filter(
            status__in=active_request_statuses
        )
        .count()
    )

    draft_requests = (
        service_requests
        .filter(status="draft")
        .count()
    )

    open_requests = (
        service_requests
        .filter(status="open")
        .count()
    )

    matched_requests = (
        service_requests
        .filter(status="matched")
        .count()
    )

    quoted_requests = (
        service_requests
        .filter(status="quoted")
        .count()
    )

    accepted_requests = (
        service_requests
        .filter(status="accepted")
        .count()
    )

    in_progress_requests = (
        service_requests
        .filter(status="in_progress")
        .count()
    )

    completed_requests = (
        service_requests
        .filter(status="completed")
        .count()
    )

    cancelled_requests = (
        service_requests
        .filter(status="cancelled")
        .count()
    )

    expired_requests = (
        service_requests
        .filter(status="expired")
        .count()
    )

    # =========================================================
    # QUOTATION STATISTICS
    # =========================================================

    total_quotations = quotations.count()

    pending_quotations = (
        quotations
        .filter(status="pending")
        .count()
    )

    accepted_quotations = (
        quotations
        .filter(status="accepted")
        .count()
    )

    rejected_quotations = (
        quotations
        .filter(status="rejected")
        .count()
    )

    withdrawn_quotations = (
        quotations
        .filter(status="withdrawn")
        .count()
    )

    # =========================================================
    # BOOKING STATISTICS
    # =========================================================

    total_bookings = bookings.count()

    accepted_bookings = (
        bookings
        .filter(status="accepted")
        .count()
    )

    scheduled_bookings = (
        bookings
        .filter(status="scheduled")
        .count()
    )

    in_progress_bookings = (
        bookings
        .filter(status="in_progress")
        .count()
    )

    completed_bookings = (
        bookings
        .filter(status="completed")
        .count()
    )

    cancelled_bookings = (
        bookings
        .filter(status="cancelled")
        .count()
    )

    # =========================================================
    # REVIEW STATISTICS
    # =========================================================

    total_reviews = reviews.count()

    average_rating_given = (
        reviews
        .aggregate(
            average=Avg("rating")
        )
        .get("average")
        or 0
    )

    average_rating_given = round(
        float(average_rating_given),
        1,
    )

    # =========================================================
    # PENDING REVIEWS
    # =========================================================

    pending_review_bookings = (
        bookings
        .filter(
            status="completed",
            review__isnull=True,
        )
    )

    pending_reviews = (
        pending_review_bookings.count()
    )

    # =========================================================
    # SPENDING
    # =========================================================

    completed_booking_queryset = (
        bookings
        .filter(status="completed")
    )

    total_spend = (
        completed_booking_queryset
        .aggregate(
            total=Sum("final_price")
        )
        .get("total")
        or 0
    )

    average_booking_value = (
        completed_booking_queryset
        .aggregate(
            average=Avg("final_price")
        )
        .get("average")
        or 0
    )

    # =========================================================
    # THIS MONTH SPENDING
    # =========================================================

    now = timezone.now()

    this_month_spend = (
        completed_booking_queryset
        .filter(
            completed_at__year=now.year,
            completed_at__month=now.month,
        )
        .aggregate(
            total=Sum("final_price")
        )
        .get("total")
        or 0
    )

    # =========================================================
    # THIS YEAR SPENDING
    # =========================================================

    this_year_spend = (
        completed_booking_queryset
        .filter(
            completed_at__year=now.year,
        )
        .aggregate(
            total=Sum("final_price")
        )
        .get("total")
        or 0
    )

    # =========================================================
    # ADDRESS SUMMARY
    # =========================================================

    default_address = (
        addresses
        .filter(is_default=True)
        .first()
    )

    # =========================================================
    # CURRENT BOOKING
    # =========================================================

    current_booking = (
        bookings
        .filter(status="in_progress")
        .select_related(
            "service_request",
            "service_request__category",
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by("-updated_at")
        .first()
    )

    # =========================================================
    # UPCOMING BOOKING
    # =========================================================

    upcoming_booking = (
        bookings
        .filter(
            status__in=[
                "accepted",
                "scheduled",
            ]
        )
        .select_related(
            "service_request",
            "service_request__category",
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by(
            "scheduled_date",
            "scheduled_start_time",
            "created_at",
        )
        .first()
    )

    # =========================================================
    # BOOKING PAYLOAD
    # =========================================================

    def booking_payload(booking):

        if not booking:
            return None

        provider = (
            booking
            .provider_profile
            .provider
        )

        service_request = (
            booking.service_request
        )

        return {
            "id": booking.id,

            "request_id": str(
                service_request.id
            ),

            "request_title": (
                service_request.title
            ),

            "service": {
                "id": (
                    service_request.category.id
                ),

                "name": (
                    service_request.category.name
                ),

                "key": (
                    service_request.category.key
                ),
            },

            "provider": {
                "id": provider.id,

                "username": (
                    provider.username
                ),

                "full_name": (
                    provider.get_full_name()
                    or provider.username
                ),

                "profile_picture": (
                    media_url(
                        request,
                        provider.profile_picture,
                    )
                ),

                "is_verified": (
                    provider.is_verified
                ),
            },

            "final_price": str(
                booking.final_price
            ),

            "scheduled_date": (
                booking.scheduled_date
            ),

            "scheduled_start_time": (
                booking.scheduled_start_time
            ),

            "scheduled_end_time": (
                booking.scheduled_end_time
            ),

            "status": booking.status,

            "service_address": (
                service_request.service_address
            ),

            "city": (
                service_request.city
            ),

            "state": (
                service_request.state
            ),

            "postal_code": (
                service_request.postal_code
            ),

            "latitude": (
                service_request.latitude
            ),

            "longitude": (
                service_request.longitude
            ),

            "urgency": (
                service_request.urgency
            ),

            "created_at": (
                booking.created_at
            ),

            "updated_at": (
                booking.updated_at
            ),
        }

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Customer dashboard "
                "fetched successfully."
            ),

            # =================================================
            # ACCOUNT
            # =================================================

            "account": {
                "id": user.id,

                "username": user.username,

                "first_name": user.first_name,

                "last_name": user.last_name,

                "full_name": (
                    user.get_full_name()
                    or user.username
                ),

                "email": user.email,

                "phone": user.phone,

                "profile_picture": (
                    media_url(
                        request,
                        user.profile_picture,
                    )
                ),

                "is_email_verified": (
                    user.is_email_verified
                ),

                "is_verified": (
                    user.is_verified
                ),

                "is_active": (
                    user.is_active
                ),

                "date_joined": (
                    user.date_joined
                ),

                "last_login": (
                    user.last_login
                ),
            },

            # =================================================
            # ADDRESS SUMMARY
            # =================================================

            "addresses": {
                "total": (
                    addresses.count()
                ),

                "default": (
                    serialize_address(
                        default_address
                    )
                    if default_address
                    else None
                ),
            },

            # =================================================
            # KPI SUMMARY
            # =================================================

            "summary": {

                "requests": {
                    "total": total_requests,
                    "active": active_requests,
                    "draft": draft_requests,
                    "open": open_requests,
                    "matched": matched_requests,
                    "quoted": quoted_requests,
                    "accepted": accepted_requests,
                    "in_progress": in_progress_requests,
                    "completed": completed_requests,
                    "cancelled": cancelled_requests,
                    "expired": expired_requests,
                },

                "quotations": {
                    "total": total_quotations,
                    "pending": pending_quotations,
                    "accepted": accepted_quotations,
                    "rejected": rejected_quotations,
                    "withdrawn": withdrawn_quotations,
                },

                "bookings": {
                    "total": total_bookings,
                    "accepted": accepted_bookings,
                    "scheduled": scheduled_bookings,
                    "in_progress": in_progress_bookings,
                    "completed": completed_bookings,
                    "cancelled": cancelled_bookings,
                },

                "reviews": {
                    "given": total_reviews,
                    "pending": pending_reviews,
                    "average_rating_given": (
                        average_rating_given
                    ),
                },
            },

            # =================================================
            # SPENDING
            # =================================================

            "spending": {
                "total": str(
                    total_spend
                ),

                "this_month": str(
                    this_month_spend
                ),

                "this_year": str(
                    this_year_spend
                ),

                "average_booking_value": str(
                    round(
                        average_booking_value,
                        2,
                    )
                ),
            },

            # =================================================
            # CURRENT / UPCOMING SERVICES
            # =================================================

            "current_booking": (
                booking_payload(
                    current_booking
                )
            ),

            "upcoming_booking": (
                booking_payload(
                    upcoming_booking
                )
            ),
        },
        status=status.HTTP_200_OK,
    )
def _parse_coords(request):
    lat = request.data.get("latitude", request.data.get("lat"))
    lon = request.data.get("longitude", request.data.get("lon"))
    if lat is None or lon is None:
        return None, None, "latitude and longitude required"
    try:
        return float(lat), float(lon), None
    except (TypeError, ValueError):
        return None, None, "latitude and longitude must be valid numbers"

def parse_boolean(value, default=False):

    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return (
        str(value)
        .strip()
        .lower()
        in (
            "true",
            "1",
            "yes",
            "on",
        )
    )
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def add_address(request):

    user = request.user

    # =========================================================
    # CUSTOMER ONLY
    # =========================================================

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": "Only customers can add addresses.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # ADDRESS
    # =========================================================

    address_text = (
        request.data.get("address")
        or ""
    ).strip()

    if not address_text:
        return Response(
            {
                "success": False,
                "message": "Address is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # ADDRESS TYPE
    # =========================================================

    address_type = (
        request.data.get("address_type")
        or CustomerAddress.ADDRESS_TYPE_HOME
    ).strip().lower()

    valid_address_types = [
        CustomerAddress.ADDRESS_TYPE_HOME,
        CustomerAddress.ADDRESS_TYPE_WORK,
        CustomerAddress.ADDRESS_TYPE_OTHER,
    ]

    if address_type not in valid_address_types:
        return Response(
            {
                "success": False,
                "message": (
                    "address_type must be "
                    "home, work or other."
                ),
                "code": "INVALID_ADDRESS_TYPE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # LOCATION SOURCE
    # =========================================================

    location_source = (
        request.data.get("location_source")
        or CustomerAddress.LOCATION_SOURCE_MANUAL
    ).strip().lower()

    valid_location_sources = [
        CustomerAddress.LOCATION_SOURCE_LIVE,
        CustomerAddress.LOCATION_SOURCE_MANUAL,
    ]

    if location_source not in valid_location_sources:
        return Response(
            {
                "success": False,
                "message": (
                    "location_source must be "
                    "live or manual."
                ),
                "code": "INVALID_LOCATION_SOURCE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # COORDINATES
    # =========================================================

    latitude_raw = request.data.get("latitude")
    longitude_raw = request.data.get("longitude")

    # Coordinates must be provided together.
    if (
        (latitude_raw is None) !=
        (longitude_raw is None)
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "latitude and longitude must "
                    "be provided together."
                ),
                "code": "INCOMPLETE_COORDINATES",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    latitude = None
    longitude = None

    if (
        latitude_raw is not None
        and longitude_raw is not None
    ):

        try:
            latitude = Decimal(
                str(latitude_raw)
            )

            longitude = Decimal(
                str(longitude_raw)
            )

        except (
            InvalidOperation,
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "latitude and longitude "
                        "must be valid numbers."
                    ),
                    "code": "INVALID_COORDINATES",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (
            Decimal("-90")
            <= latitude
            <= Decimal("90")
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "latitude must be between "
                        "-90 and 90."
                    ),
                    "code": "INVALID_LATITUDE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (
            Decimal("-180")
            <= longitude
            <= Decimal("180")
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "longitude must be between "
                        "-180 and 180."
                    ),
                    "code": "INVALID_LONGITUDE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # DEFAULT ADDRESS
    # =========================================================

    is_default = parse_boolean(
        request.data.get("is_default"),
        default=False,
    )

    existing_addresses = (
        CustomerAddress.objects
        .filter(customer=user)
    )

    # First saved address automatically becomes default.
    if not existing_addresses.exists():
        is_default = True

    if is_default:
        existing_addresses.update(
            is_default=False
        )

    # =========================================================
    # CREATE ADDRESS
    # =========================================================

    address = CustomerAddress.objects.create(
        customer=user,

        title=(
            request.data.get("title")
            or ""
        ).strip(),

        address_type=address_type,

        address=address_text,

        city=(
            request.data.get("city")
            or ""
        ).strip(),

        state=(
            request.data.get("state")
            or ""
        ).strip(),

        postal_code=(
            request.data.get("postal_code")
            or ""
        ).strip(),

        latitude=latitude,
        longitude=longitude,

        location_source=location_source,

        is_default=is_default,
    )

    return Response(
        {
            "success": True,
            "message": "Address added successfully.",
            "address": serialize_address(address),
        },
        status=status.HTTP_201_CREATED,
    )


# =============================================================
# MY ADDRESSES
# =============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_addresses(request):

    user = request.user

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can "
                    "view saved addresses."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    addresses = (
        CustomerAddress.objects
        .filter(customer=user)
        .order_by(
            "-is_default",
            "-created_at",
        )
    )

    return Response(
        {
            "success": True,
            "count": addresses.count(),
            "addresses": [
                serialize_address(address)
                for address in addresses
            ],
        },
        status=status.HTTP_200_OK,
    )


# =============================================================
# DELETE ADDRESS
# =============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_address(
    request,
    address_id,
):

    user = request.user

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can "
                    "delete addresses."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    address = (
        CustomerAddress.objects
        .filter(
            id=address_id,
            customer=user,
        )
        .first()
    )

    if not address:
        return Response(
            {
                "success": False,
                "message": "Address not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    was_default = address.is_default

    address.delete()

    # If default address was deleted,
    # automatically make another one default.
    if was_default:

        next_address = (
            CustomerAddress.objects
            .filter(customer=user)
            .order_by("-created_at")
            .first()
        )

        if next_address:

            next_address.is_default = True

            next_address.save(
                update_fields=[
                    "is_default",
                ]
            )

    return Response(
        {
            "success": True,
            "message": "Address deleted successfully.",
        },
        status=status.HTTP_200_OK,
    )


# =============================================================
# SET DEFAULT ADDRESS
# =============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def set_default_address(
    request,
    address_id,
):

    user = request.user

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can "
                    "manage addresses."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    address = (
        CustomerAddress.objects
        .filter(
            id=address_id,
            customer=user,
        )
        .first()
    )

    if not address:
        return Response(
            {
                "success": False,
                "message": "Address not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    CustomerAddress.objects.filter(
        customer=user
    ).exclude(
        id=address.id
    ).update(
        is_default=False
    )

    address.is_default = True

    address.save(
        update_fields=[
            "is_default",
        ]
    )

    return Response(
        {
            "success": True,
            "message": (
                "Default address updated successfully."
            ),
            "address": serialize_address(address),
        },
        status=status.HTTP_200_OK,
    )


# =============================================================
# EDIT ADDRESS
# =============================================================

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def edit_address(
    request,
    address_id,
):

    user = request.user

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can "
                    "edit addresses."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    address = (
        CustomerAddress.objects
        .filter(
            id=address_id,
            customer=user,
        )
        .first()
    )

    if not address:
        return Response(
            {
                "success": False,
                "message": "Address not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # TITLE
    # =========================================================

    if "title" in request.data:
        address.title = (
            request.data.get("title")
            or ""
        ).strip()

    # =========================================================
    # ADDRESS
    # =========================================================

    if "address" in request.data:

        address_text = (
            request.data.get("address")
            or ""
        ).strip()

        if not address_text:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Address cannot be empty."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        address.address = address_text

    # =========================================================
    # STRUCTURED ADDRESS
    # =========================================================

    if "city" in request.data:
        address.city = (
            request.data.get("city")
            or ""
        ).strip()

    if "state" in request.data:
        address.state = (
            request.data.get("state")
            or ""
        ).strip()

    if "postal_code" in request.data:
        address.postal_code = (
            request.data.get("postal_code")
            or ""
        ).strip()

    # =========================================================
    # ADDRESS TYPE
    # =========================================================

    if "address_type" in request.data:

        address_type = (
            request.data.get("address_type")
            or ""
        ).strip().lower()

        valid_address_types = [
            CustomerAddress.ADDRESS_TYPE_HOME,
            CustomerAddress.ADDRESS_TYPE_WORK,
            CustomerAddress.ADDRESS_TYPE_OTHER,
        ]

        if address_type not in valid_address_types:
            return Response(
                {
                    "success": False,
                    "message": (
                        "address_type must be "
                        "home, work or other."
                    ),
                    "code": "INVALID_ADDRESS_TYPE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        address.address_type = address_type

    # =========================================================
    # LOCATION SOURCE
    # =========================================================

    if "location_source" in request.data:

        location_source = (
            request.data.get("location_source")
            or ""
        ).strip().lower()

        valid_location_sources = [
            CustomerAddress.LOCATION_SOURCE_LIVE,
            CustomerAddress.LOCATION_SOURCE_MANUAL,
        ]

        if location_source not in valid_location_sources:
            return Response(
                {
                    "success": False,
                    "message": (
                        "location_source must be "
                        "live or manual."
                    ),
                    "code": "INVALID_LOCATION_SOURCE",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        address.location_source = location_source

    # =========================================================
    # COORDINATES
    # =========================================================

    latitude_provided = (
        "latitude" in request.data
    )

    longitude_provided = (
        "longitude" in request.data
    )

    # For updates, latitude and longitude must be changed
    # together so we never leave a half-updated location.
    if latitude_provided != longitude_provided:
        return Response(
            {
                "success": False,
                "message": (
                    "latitude and longitude must "
                    "be updated together."
                ),
                "code": "INCOMPLETE_COORDINATES",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if (
        latitude_provided
        and longitude_provided
    ):

        latitude_raw = request.data.get(
            "latitude"
        )

        longitude_raw = request.data.get(
            "longitude"
        )

        # Allow both coordinates to be cleared together.
        if (
            latitude_raw is None
            and longitude_raw is None
        ):
            address.latitude = None
            address.longitude = None

        elif (
            latitude_raw is None
            or longitude_raw is None
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "latitude and longitude must "
                        "both contain values or both "
                        "be null."
                    ),
                    "code": "INCOMPLETE_COORDINATES",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        else:

            try:
                latitude = Decimal(
                    str(latitude_raw)
                )

                longitude = Decimal(
                    str(longitude_raw)
                )

            except (
                InvalidOperation,
                TypeError,
                ValueError,
            ):
                return Response(
                    {
                        "success": False,
                        "message": (
                            "latitude and longitude "
                            "must be valid numbers."
                        ),
                        "code": "INVALID_COORDINATES",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not (
                Decimal("-90")
                <= latitude
                <= Decimal("90")
            ):
                return Response(
                    {
                        "success": False,
                        "message": (
                            "latitude must be between "
                            "-90 and 90."
                        ),
                        "code": "INVALID_LATITUDE",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not (
                Decimal("-180")
                <= longitude
                <= Decimal("180")
            ):
                return Response(
                    {
                        "success": False,
                        "message": (
                            "longitude must be between "
                            "-180 and 180."
                        ),
                        "code": "INVALID_LONGITUDE",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            address.latitude = latitude
            address.longitude = longitude

    # =========================================================
    # DEFAULT ADDRESS
    # =========================================================

    if "is_default" in request.data:

        is_default = parse_boolean(
            request.data.get("is_default"),
            default=address.is_default,
        )

        if is_default:

            CustomerAddress.objects.filter(
                customer=user
            ).exclude(
                id=address.id
            ).update(
                is_default=False
            )

            address.is_default = True

        elif address.is_default:

            # Do not leave a customer with addresses
            # but no default address.
            replacement = (
                CustomerAddress.objects
                .filter(customer=user)
                .exclude(id=address.id)
                .order_by("-created_at")
                .first()
            )

            if replacement:

                replacement.is_default = True

                replacement.save(
                    update_fields=[
                        "is_default",
                    ]
                )

                address.is_default = False

            else:
                # This is the only saved address.
                address.is_default = True

        else:
            address.is_default = False

    address.save()

    return Response(
        {
            "success": True,
            "message": (
                "Address updated successfully."
            ),
            "address": serialize_address(
                address
            ),
        },
        status=status.HTTP_200_OK,
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

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_favorite_provider(
    request,
    provider_id,
):
    """
    Save a provider to the logged-in
    customer's favorites.
    """

    user = request.user

    # =========================================================
    # CUSTOMER ACCESS
    # =========================================================

    if user.role != "customer":

        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can "
                    "save providers."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # PROVIDER
    # =========================================================

    provider = (
        User.objects
        .filter(
            id=provider_id,
        )
        .first()
    )

    if not provider:

        return Response(
            {
                "success": False,
                "message": "Provider not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # VALID PROVIDER ROLE
    # =========================================================

    if not is_provider_role(
        provider.role
    ):

        return Response(
            {
                "success": False,
                "message": (
                    "Selected user is not "
                    "a provider."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # PROVIDER AVAILABILITY
    # =========================================================

    if not provider.is_active:

        return Response(
            {
                "success": False,
                "message": (
                    "This provider is currently "
                    "inactive."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not provider.is_approved:

        return Response(
            {
                "success": False,
                "message": (
                    "This provider has not "
                    "been approved."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # CREATE FAVORITE
    # =========================================================

    favorite, created = (
        FavoriteProvider.objects
        .get_or_create(
            customer=user,
            provider=provider,
        )
    )

    if not created:

        return Response(
            {
                "success": True,

                "message": (
                    "Provider is already "
                    "in your favorites."
                ),

                "already_saved": True,

                "favorite": (
                    favorite_provider_payload(
                        favorite,
                        request,
                    )
                ),
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Provider added to "
                "favorites successfully."
            ),

            "already_saved": False,

            "favorite": (
                favorite_provider_payload(
                    favorite,
                    request,
                )
            ),
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_favorite_providers(request):
    """
    Return all providers saved by
    the logged-in customer.
    """

    user = request.user

    if user.role != "customer":

        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can access "
                    "favorite providers."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    favorites = (
        FavoriteProvider.objects
        .filter(
            customer=user,
        )
        .select_related(
            "provider",
        )
        .order_by(
            "-created_at"
        )
    )

    data = [
        favorite_provider_payload(
            favorite,
            request,
        )
        for favorite in favorites
    ]

    return Response(
        {
            "success": True,

            "message": (
                "Favorite providers "
                "fetched successfully."
            ),

            "count": len(data),

            "favorites": data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_favorite_provider(
    request,
    provider_id,
):
    """
    Remove a provider from the logged-in
    customer's favorites.
    """

    user = request.user

    if user.role != "customer":

        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can "
                    "manage favorites."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    favorite = (
        FavoriteProvider.objects
        .filter(
            customer=user,
            provider_id=provider_id,
        )
        .first()
    )

    if not favorite:

        return Response(
            {
                "success": False,
                "message": (
                    "Provider is not in "
                    "your favorites."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    favorite.delete()

    return Response(
        {
            "success": True,

            "message": (
                "Provider removed from "
                "favorites successfully."
            ),
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def favorite_provider_status(
    request,
    provider_id,
):
    """
    Check whether a provider is saved
    by the logged-in customer.
    """

    user = request.user

    if user.role != "customer":

        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can "
                    "access favorites."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    is_favorite = (
        FavoriteProvider.objects
        .filter(
            customer=user,
            provider_id=provider_id,
        )
        .exists()
    )

    return Response(
        {
            "success": True,

            "provider_id": provider_id,

            "is_favorite": is_favorite,
        },
        status=status.HTTP_200_OK,
    )
from .services.customer_dashboard import (
    get_customer_dashboard_payload,
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_dashboard(request):
    """
    Return personalized dashboard data
    for the logged-in customer.
    """

    user = request.user

    if user.role != "customer":
        return Response(
            {
                "success": False,
                "message": (
                    "Only customers can access "
                    "the customer dashboard."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    dashboard = (
        get_customer_dashboard_payload(
            user=user,
            request=request,
        )
    )

    return Response(
        {
            "success": True,

            "message": (
                "Customer dashboard "
                "fetched successfully."
            ),

            "data": dashboard,
        },
        status=status.HTTP_200_OK,
    )