from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from accounts.helpers import is_provider_role, media_url, provider_role_keys
# ACTIVE marketplace flow
from services.models import (
    ServiceRequest,
    Quote,
    Booking,
    Review,
)

# NEWER marketplace flow - temporarily kept because
# some existing admin analytics still use these models.
from service_requests.models import (
    CustomerServiceRequest,
    ProviderQuotation,
    ServiceBooking,
    ServiceReview,
)
from datetime import timedelta
from django.db.models.functions import TruncDate, TruncMonth
from django.db.models import Avg, Count, Max, Q, Sum
from django.utils import timezone

from .services.dashboard_filters import (
    get_dashboard_filters,
    filter_service_requests,
    filter_provider_quotations,
    filter_service_bookings,
    filter_service_reviews,
)
from .models import (
    ServiceCategory,
    SpotlightImage,
    MarketplaceLocationSettings,
)
from decimal import Decimal, InvalidOperation

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
    SpotlightImageSerializer,
)

from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

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

@api_view([
    "GET",
    "PATCH",
])
@permission_classes([
    IsAuthenticated,
    IsAdminUser,
])
@transaction.atomic
def marketplace_location_settings_api(request):
    """
    Get or update global marketplace location settings.

    These settings control distance-based provider matching.

    Admin controls:
    - maximum provider radius
    - default provider radius
    - whether location matching is enabled
    - live GPS location timeout
    """

    # =========================================================
    # GET SETTINGS
    # =========================================================

    location_settings = (
        MarketplaceLocationSettings
        .get_settings()
    )

    if request.method == "GET":

        return Response(
            {
                "success": True,
                "message": (
                    "Marketplace location settings "
                    "fetched successfully."
                ),
                "data": {
                    "max_provider_radius_km": float(
                        location_settings
                        .max_provider_radius_km
                    ),

                    "default_provider_radius_km": float(
                        location_settings
                        .default_provider_radius_km
                    ),

                    "live_location_timeout_minutes": (
                        location_settings
                        .live_location_timeout_minutes
                    ),

                    "is_location_matching_enabled": (
                        location_settings
                        .is_location_matching_enabled
                    ),

                    "created_at": (
                        location_settings.created_at
                    ),

                    "updated_at": (
                        location_settings.updated_at
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # LOCK SETTINGS FOR UPDATE
    # =========================================================

    location_settings = (
        MarketplaceLocationSettings.objects
        .select_for_update()
        .get(
            pk=location_settings.pk
        )
    )

    # =========================================================
    # REQUEST DATA
    # =========================================================

    max_radius_raw = request.data.get(
        "max_provider_radius_km"
    )

    default_radius_raw = request.data.get(
        "default_provider_radius_km"
    )

    timeout_raw = request.data.get(
        "live_location_timeout_minutes"
    )

    matching_enabled_raw = request.data.get(
        "is_location_matching_enabled"
    )

    update_fields = []

    # =========================================================
    # MAXIMUM PROVIDER RADIUS
    # =========================================================

    new_max_radius = (
        location_settings.max_provider_radius_km
    )

    if max_radius_raw is not None:

        try:
            new_max_radius = Decimal(
                str(max_radius_raw)
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
                        "max_provider_radius_km "
                        "must be a valid number."
                    ),
                    "code": "INVALID_MAX_RADIUS",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_max_radius < Decimal("1"):

            return Response(
                {
                    "success": False,
                    "message": (
                        "max_provider_radius_km "
                        "must be at least 1 km."
                    ),
                    "code": "MAX_RADIUS_TOO_SMALL",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # DEFAULT PROVIDER RADIUS
    # =========================================================

    new_default_radius = (
        location_settings.default_provider_radius_km
    )

    if default_radius_raw is not None:

        try:
            new_default_radius = Decimal(
                str(default_radius_raw)
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
                        "default_provider_radius_km "
                        "must be a valid number."
                    ),
                    "code": "INVALID_DEFAULT_RADIUS",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_default_radius < Decimal("1"):

            return Response(
                {
                    "success": False,
                    "message": (
                        "default_provider_radius_km "
                        "must be at least 1 km."
                    ),
                    "code": "DEFAULT_RADIUS_TOO_SMALL",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # CROSS-FIELD RADIUS VALIDATION
    # =========================================================

    if new_default_radius > new_max_radius:

        return Response(
            {
                "success": False,
                "message": (
                    "default_provider_radius_km "
                    "cannot be greater than "
                    "max_provider_radius_km."
                ),
                "code": (
                    "DEFAULT_RADIUS_EXCEEDS_MAXIMUM"
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # LIVE LOCATION TIMEOUT
    # =========================================================

    new_timeout = (
        location_settings
        .live_location_timeout_minutes
    )

    if timeout_raw is not None:

        try:
            new_timeout = int(
                timeout_raw
            )

        except (
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "live_location_timeout_minutes "
                        "must be a valid integer."
                    ),
                    "code": (
                        "INVALID_LIVE_LOCATION_TIMEOUT"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_timeout < 1:

            return Response(
                {
                    "success": False,
                    "message": (
                        "live_location_timeout_minutes "
                        "must be at least 1 minute."
                    ),
                    "code": (
                        "LIVE_LOCATION_TIMEOUT_TOO_SMALL"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # LOCATION MATCHING ENABLED
    # =========================================================

    new_matching_enabled = (
        location_settings
        .is_location_matching_enabled
    )

    if matching_enabled_raw is not None:

        if isinstance(
            matching_enabled_raw,
            bool,
        ):
            new_matching_enabled = (
                matching_enabled_raw
            )

        else:

            normalized_value = (
                str(matching_enabled_raw)
                .strip()
                .lower()
            )

            if normalized_value in [
                "true",
                "1",
                "yes",
                "on",
            ]:
                new_matching_enabled = True

            elif normalized_value in [
                "false",
                "0",
                "no",
                "off",
            ]:
                new_matching_enabled = False

            else:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "is_location_matching_enabled "
                            "must be true or false."
                        ),
                        "code": (
                            "INVALID_MATCHING_STATUS"
                        ),
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

    # =========================================================
    # CHECK IF ANYTHING WAS PROVIDED
    # =========================================================

    if (
        max_radius_raw is None
        and default_radius_raw is None
        and timeout_raw is None
        and matching_enabled_raw is None
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "No marketplace location "
                    "settings were provided."
                ),
                "code": "NO_FIELDS_TO_UPDATE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # SAVE MAXIMUM RADIUS
    # =========================================================

    if max_radius_raw is not None:

        location_settings.max_provider_radius_km = (
            new_max_radius
        )

        update_fields.append(
            "max_provider_radius_km"
        )

    # =========================================================
    # SAVE DEFAULT RADIUS
    # =========================================================

    if default_radius_raw is not None:

        location_settings.default_provider_radius_km = (
            new_default_radius
        )

        update_fields.append(
            "default_provider_radius_km"
        )

    # =========================================================
    # SAVE LIVE LOCATION TIMEOUT
    # =========================================================

    if timeout_raw is not None:

        location_settings.live_location_timeout_minutes = (
            new_timeout
        )

        update_fields.append(
            "live_location_timeout_minutes"
        )

    # =========================================================
    # SAVE MATCHING STATUS
    # =========================================================

    if matching_enabled_raw is not None:

        location_settings.is_location_matching_enabled = (
            new_matching_enabled
        )

        update_fields.append(
            "is_location_matching_enabled"
        )

    update_fields.append(
        "updated_at"
    )

    location_settings.save(
        update_fields=list(
            dict.fromkeys(update_fields)
        )
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": (
                "Marketplace location settings "
                "updated successfully."
            ),
            "data": {
                "max_provider_radius_km": float(
                    location_settings
                    .max_provider_radius_km
                ),

                "default_provider_radius_km": float(
                    location_settings
                    .default_provider_radius_km
                ),

                "live_location_timeout_minutes": (
                    location_settings
                    .live_location_timeout_minutes
                ),

                "is_location_matching_enabled": (
                    location_settings
                    .is_location_matching_enabled
                ),

                "updated_at": (
                    location_settings.updated_at
                ),
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsAdminUser,
])
def admin_dashboard(request):
    """
    Admin dashboard using the ACTIVE marketplace flow:

        ServiceRequest
        Quote
        Booking
        Review

    Supports:
        ?period=7d
        ?period=30d
        ?period=6m
        ?period=1y
        ?period=all
        ?period=custom

        ?from=2026-08-01
        ?to=2026-08-25

        ?service=plumber
        ?provider_id=25
        ?status=completed

    Keeps the existing frontend-compatible response structure.
    """

    user = request.user

    # =========================================================
    # ADMIN PERMISSIONS
    # =========================================================

    permissions = get_admin_permissions(user)

    # =========================================================
    # FILTERS
    # =========================================================

    dashboard_filters = get_dashboard_filters(request)

    start_date = dashboard_filters.get("start_date")
    end_date = dashboard_filters.get("end_date")
    service_filter = dashboard_filters.get("service")
    provider_id = dashboard_filters.get("provider_id")
    status_filter = dashboard_filters.get("status")

    # =========================================================
    # CUSTOMER STATISTICS
    # =========================================================

    customer_queryset = User.objects.filter(
        role="customer",
        is_staff=False,
        is_superuser=False,
    )

    total_customers = customer_queryset.count()

    active_customers = customer_queryset.filter(
        is_active=True
    ).count()

    inactive_customers = customer_queryset.filter(
        is_active=False
    ).count()

    # =========================================================
    # PROVIDER STATISTICS
    # =========================================================

    provider_roles = provider_role_keys()

    provider_queryset = User.objects.filter(
        role__in=provider_roles
    )

    total_providers = provider_queryset.count()

    active_providers = provider_queryset.filter(
        is_active=True
    ).count()

    inactive_providers = provider_queryset.filter(
        is_active=False
    ).count()

    pending_providers = provider_queryset.filter(
        is_approved=False
    ).count()

    approved_providers = provider_queryset.filter(
        is_approved=True
    ).count()

    verified_providers = provider_queryset.filter(
        is_verified=True
    ).count()

    unverified_providers = provider_queryset.filter(
        is_verified=False
    ).count()

    # =========================================================
    # SERVICE STATISTICS
    # =========================================================

    total_services = ServiceCategory.objects.count()

    active_services = ServiceCategory.objects.filter(
        status="active"
    ).count()

    coming_soon_services = ServiceCategory.objects.filter(
        status="coming_soon"
    ).count()

    inactive_services = ServiceCategory.objects.filter(
        status="inactive"
    ).count()

    popular_services = ServiceCategory.objects.filter(
        status="active",
        is_popular=True,
    ).count()

    # =========================================================
    # ACTIVE MARKETPLACE QUERYSETS
    # =========================================================

    service_requests = ServiceRequest.objects.all()

    quotations = Quote.objects.all()

    bookings = Booking.objects.all()

    reviews = Review.objects.all()

    # =========================================================
    # DATE FILTERS
    # =========================================================

    if start_date:

        service_requests = service_requests.filter(
            created_at__date__gte=start_date
        )

        quotations = quotations.filter(
            created_at__date__gte=start_date
        )

        bookings = bookings.filter(
            created_at__date__gte=start_date
        )

        reviews = reviews.filter(
            created_at__date__gte=start_date
        )

    if end_date:

        service_requests = service_requests.filter(
            created_at__date__lte=end_date
        )

        quotations = quotations.filter(
            created_at__date__lte=end_date
        )

        bookings = bookings.filter(
            created_at__date__lte=end_date
        )

        reviews = reviews.filter(
            created_at__date__lte=end_date
        )

    # =========================================================
    # SERVICE FILTER
    # =========================================================

    if service_filter:

        service_requests = service_requests.filter(
            service_type__iexact=service_filter
        )

        quotations = quotations.filter(
            service_request__service_type__iexact=service_filter
        )

        bookings = bookings.filter(
            service_request__service_type__iexact=service_filter
        )

        reviews = reviews.filter(
            booking__service_request__service_type__iexact=(
                service_filter
            )
        )

    # =========================================================
    # PROVIDER FILTER
    # =========================================================

    if provider_id:

        service_requests = service_requests.filter(
            selected_provider_id=provider_id
        )

        quotations = quotations.filter(
            provider_id=provider_id
        )

        bookings = bookings.filter(
            provider_id=provider_id
        )

        reviews = reviews.filter(
            provider_id=provider_id
        )

    # =========================================================
    # OPTIONAL STATUS FILTER
    # =========================================================
    #
    # Status values differ between:
    # ServiceRequest / Quote / Booking.
    #
    # Therefore apply a status only where that model actually
    # supports that value.
    # =========================================================

    if status_filter:

        request_statuses = {
            value
            for value, label
            in ServiceRequest.STATUS_CHOICES
        }

        quote_statuses = {
            value
            for value, label
            in Quote.STATUS_CHOICES
        }

        booking_statuses = {
            value
            for value, label
            in Booking.STATUS_CHOICES
        }

        if status_filter in request_statuses:
            service_requests = service_requests.filter(
                status=status_filter
            )

        if status_filter in quote_statuses:
            quotations = quotations.filter(
                status=status_filter
            )

        if status_filter in booking_statuses:
            bookings = bookings.filter(
                status=status_filter
            )

    # =========================================================
    # REQUEST STATISTICS
    # =========================================================

    total_requests = service_requests.count()

    pending_requests = service_requests.filter(
        status="pending"
    ).count()

    area_selected_requests = service_requests.filter(
        status="area_selected"
    ).count()

    quotation_received_requests = service_requests.filter(
        status="quotation_received"
    ).count()

    assigned_requests = service_requests.filter(
        status="assigned"
    ).count()

    in_progress_requests = service_requests.filter(
        status="in_progress"
    ).count()

    completed_requests = service_requests.filter(
        status="completed"
    ).count()

    cancelled_requests = service_requests.filter(
        status="cancelled"
    ).count()

    # =========================================================
    # QUOTATION STATISTICS
    # =========================================================

    total_quotes = quotations.count()

    pending_quotes = quotations.filter(
        status="pending"
    ).count()

    accepted_quotes = quotations.filter(
        status="accepted"
    ).count()

    rejected_quotes = quotations.filter(
        status="rejected"
    ).count()

    # Legacy Quote does not have withdrawn status.
    withdrawn_quotes = 0

    # =========================================================
    # BOOKING STATISTICS
    # =========================================================

    total_bookings = bookings.count()

    assigned_bookings = bookings.filter(
        status="assigned"
    ).count()

    pending_bookings = bookings.filter(
        status="pending"
    ).count()

    in_progress_bookings = bookings.filter(
        status="in_progress"
    ).count()

    completed_bookings = bookings.filter(
        status="completed"
    ).count()

    cancelled_bookings = bookings.filter(
        status="cancelled"
    ).count()

    # =========================================================
    # FRONTEND COMPATIBILITY
    # =========================================================
    #
    # Existing frontend previously expected:
    # accepted_bookings
    # scheduled_bookings
    #
    # Active Booking model uses:
    # assigned
    # pending
    #
    # Keep aliases temporarily without removing the real fields.
    # =========================================================

    accepted_bookings = assigned_bookings

    scheduled_bookings = bookings.filter(
        scheduled_date__isnull=False
    ).exclude(
        status__in=[
            "completed",
            "cancelled",
        ]
    ).count()

    # =========================================================
    # REVIEW STATISTICS
    # =========================================================

    total_reviews = reviews.count()

    rating_data = reviews.aggregate(
        average=Avg("rating")
    )

    average_provider_rating = (
        rating_data["average"] or 0
    )

    average_provider_rating = round(
        float(average_provider_rating),
        2,
    )

    # =========================================================
    # REQUEST ACTIVITY
    # =========================================================

    now = timezone.now()
    today = now.date()

    seven_days_ago = today - timedelta(days=6)
    month_start = today.replace(day=1)

    requests_today_queryset = (
        ServiceRequest.objects.filter(
            created_at__date=today
        )
    )

    requests_week_queryset = (
        ServiceRequest.objects.filter(
            created_at__date__gte=seven_days_ago,
            created_at__date__lte=today,
        )
    )

    requests_month_queryset = (
        ServiceRequest.objects.filter(
            created_at__date__gte=month_start,
            created_at__date__lte=today,
        )
    )

    if service_filter:

        requests_today_queryset = (
            requests_today_queryset.filter(
                service_type__iexact=service_filter
            )
        )

        requests_week_queryset = (
            requests_week_queryset.filter(
                service_type__iexact=service_filter
            )
        )

        requests_month_queryset = (
            requests_month_queryset.filter(
                service_type__iexact=service_filter
            )
        )

    if provider_id:

        requests_today_queryset = (
            requests_today_queryset.filter(
                selected_provider_id=provider_id
            )
        )

        requests_week_queryset = (
            requests_week_queryset.filter(
                selected_provider_id=provider_id
            )
        )

        requests_month_queryset = (
            requests_month_queryset.filter(
                selected_provider_id=provider_id
            )
        )

    requests_today_count = (
        requests_today_queryset.count()
    )

    requests_this_week_count = (
        requests_week_queryset.count()
    )

    requests_this_month_count = (
        requests_month_queryset.count()
    )

    # =========================================================
    # BOOKING VALUE
    # =========================================================

    non_cancelled_bookings = bookings.exclude(
        status="cancelled"
    )

    booking_value_data = (
        non_cancelled_bookings.aggregate(
            total=Sum("final_price"),
            average=Avg("final_price"),
        )
    )

    total_booking_value = (
        booking_value_data["total"] or 0
    )

    average_booking_value = (
        booking_value_data["average"] or 0
    )

    # =========================================================
    # COMPLETED BOOKING VALUE
    # =========================================================

    completed_booking_value = (
        bookings
        .filter(
            status="completed"
        )
        .aggregate(
            total=Sum("final_price")
        )["total"]
        or 0
    )

    # =========================================================
    # RATES
    # =========================================================

    completion_rate = 0

    cancellation_rate = 0

    if total_bookings > 0:

        completion_rate = round(
            (
                completed_bookings
                / total_bookings
            )
            * 100,
            2,
        )

        cancellation_rate = round(
            (
                cancelled_bookings
                / total_bookings
            )
            * 100,
            2,
        )

    quotation_acceptance_rate = 0

    if total_quotes > 0:

        quotation_acceptance_rate = round(
            (
                accepted_quotes
                / total_quotes
            )
            * 100,
            2,
        )

    request_to_booking_rate = 0

    if total_requests > 0:

        request_to_booking_rate = round(
            (
                total_bookings
                / total_requests
            )
            * 100,
            2,
        )

    # =========================================================
    # COMMON SUMMARY
    # =========================================================

    summary = {

        # -----------------------------------------------------
        # CUSTOMERS
        # -----------------------------------------------------

        "total_customers": total_customers,
        "active_customers": active_customers,
        "inactive_customers": inactive_customers,

        # -----------------------------------------------------
        # PROVIDERS
        # -----------------------------------------------------

        "total_providers": total_providers,
        "active_providers": active_providers,
        "inactive_providers": inactive_providers,
        "pending_providers": pending_providers,
        "approved_providers": approved_providers,
        "verified_providers": verified_providers,
        "unverified_providers": unverified_providers,

        # -----------------------------------------------------
        # SERVICES
        # -----------------------------------------------------

        "total_services": total_services,
        "active_services": active_services,
        "coming_soon_services": coming_soon_services,
        "inactive_services": inactive_services,
        "popular_services": popular_services,

        # -----------------------------------------------------
        # REQUESTS
        # -----------------------------------------------------

        "total_requests": total_requests,

        "pending_requests": pending_requests,

        "area_selected_requests": (
            area_selected_requests
        ),

        "quotation_received_requests": (
            quotation_received_requests
        ),

        "assigned_requests": assigned_requests,

        "in_progress_requests": (
            in_progress_requests
        ),

        "completed_requests": completed_requests,

        "cancelled_requests": cancelled_requests,

        "requests_today": requests_today_count,

        "requests_this_week": (
            requests_this_week_count
        ),

        "requests_this_month": (
            requests_this_month_count
        ),

        # -----------------------------------------------------
        # QUOTES
        # -----------------------------------------------------

        "total_quotes": total_quotes,
        "pending_quotes": pending_quotes,
        "accepted_quotes": accepted_quotes,
        "rejected_quotes": rejected_quotes,
        "withdrawn_quotes": withdrawn_quotes,

        # -----------------------------------------------------
        # BOOKINGS
        # -----------------------------------------------------

        "total_bookings": total_bookings,

        "assigned_bookings": assigned_bookings,

        "pending_bookings": pending_bookings,

        "in_progress_bookings": (
            in_progress_bookings
        ),

        "completed_bookings": (
            completed_bookings
        ),

        "cancelled_bookings": (
            cancelled_bookings
        ),

        # Compatibility
        "accepted_bookings": accepted_bookings,

        "scheduled_bookings": scheduled_bookings,

        # -----------------------------------------------------
        # REVIEWS / VALUE
        # -----------------------------------------------------

        "total_reviews": total_reviews,

        "total_booking_value": (
            total_booking_value
        ),

        "completed_booking_value": (
            completed_booking_value
        ),

        "average_booking_value": (
            average_booking_value
        ),

        "average_provider_rating": (
            average_provider_rating
        ),

        # -----------------------------------------------------
        # RATES
        # -----------------------------------------------------

        "completion_rate": completion_rate,

        "cancellation_rate": (
            cancellation_rate
        ),

        "quotation_acceptance_rate": (
            quotation_acceptance_rate
        ),

        "request_to_booking_rate": (
            request_to_booking_rate
        ),
    }

    # =========================================================
    # KPI COMPATIBILITY
    # =========================================================

    kpis = {
        **summary,
    }

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Admin dashboard fetched successfully."
            ),

            # =================================================
            # FILTERS
            # =================================================

            "filters": {
                "period": dashboard_filters.get(
                    "period"
                ),

                "from": start_date,

                "to": end_date,

                "service": service_filter,

                "provider_id": provider_id,

                "status": status_filter,
            },

            # =================================================
            # ADMIN
            # =================================================

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

            # =================================================
            # BACKWARD-COMPATIBLE SUMMARY
            # =================================================

            "summary": summary,

            "kpis": kpis,

            # =================================================
            # STRUCTURED DATA
            # =================================================

            "data": {

                # =============================================
                # USERS
                # =============================================

                "users": {

                    "customers": {
                        "total": total_customers,
                        "active": active_customers,
                        "inactive": inactive_customers,

                        "total_customers": (
                            total_customers
                        ),

                        "active_customers": (
                            active_customers
                        ),

                        "inactive_customers": (
                            inactive_customers
                        ),
                    },

                    "providers": {
                        "total": total_providers,
                        "active": active_providers,
                        "inactive": inactive_providers,
                        "pending": pending_providers,
                        "approved": approved_providers,
                        "verified": verified_providers,
                        "unverified": (
                            unverified_providers
                        ),

                        "pending_approvals": (
                            pending_providers
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
                    },
                },

                # =============================================
                # SERVICES
                # =============================================

                "services": {
                    "total": total_services,

                    "active": active_services,

                    "coming_soon": (
                        coming_soon_services
                    ),

                    "inactive": inactive_services,

                    "popular": popular_services,

                    "total_services": total_services,

                    "active_services": active_services,

                    "popular_services": (
                        popular_services
                    ),
                },

                # =============================================
                # REQUESTS
                # =============================================

                "requests": {
                    "total": total_requests,

                    "pending": pending_requests,

                    "area_selected": (
                        area_selected_requests
                    ),

                    "quotation_received": (
                        quotation_received_requests
                    ),

                    "assigned": assigned_requests,

                    "in_progress": (
                        in_progress_requests
                    ),

                    "completed": completed_requests,

                    "cancelled": cancelled_requests,

                    "today": requests_today_count,

                    "this_week": (
                        requests_this_week_count
                    ),

                    "this_month": (
                        requests_this_month_count
                    ),

                    "total_requests": total_requests,

                    "requests_today": (
                        requests_today_count
                    ),

                    "requests_this_week": (
                        requests_this_week_count
                    ),

                    "requests_this_month": (
                        requests_this_month_count
                    ),
                },

                # =============================================
                # QUOTATIONS
                # =============================================

                "quotations": {
                    "total": total_quotes,

                    "pending": pending_quotes,

                    "accepted": accepted_quotes,

                    "rejected": rejected_quotes,

                    "withdrawn": withdrawn_quotes,

                    "acceptance_rate": (
                        quotation_acceptance_rate
                    ),

                    "total_quotes": total_quotes,

                    "pending_quotes": pending_quotes,

                    "accepted_quotes": accepted_quotes,
                },

                # Older frontend alias
                "quotes": {
                    "total": total_quotes,

                    "total_quotes": total_quotes,

                    "pending": pending_quotes,

                    "pending_quotes": pending_quotes,

                    "accepted": accepted_quotes,

                    "accepted_quotes": accepted_quotes,

                    "rejected": rejected_quotes,

                    "withdrawn": withdrawn_quotes,

                    "acceptance_rate": (
                        quotation_acceptance_rate
                    ),
                },

                # =============================================
                # BOOKINGS
                # =============================================

                "bookings": {
                    "total": total_bookings,

                    "assigned": assigned_bookings,

                    "pending": pending_bookings,

                    "in_progress": (
                        in_progress_bookings
                    ),

                    "completed": (
                        completed_bookings
                    ),

                    "cancelled": (
                        cancelled_bookings
                    ),

                    # -----------------------------------------
                    # Compatibility aliases
                    # -----------------------------------------

                    "accepted": accepted_bookings,

                    "scheduled": scheduled_bookings,

                    "completion_rate": (
                        completion_rate
                    ),

                    "cancellation_rate": (
                        cancellation_rate
                    ),

                    "total_booking_value": (
                        total_booking_value
                    ),

                    "completed_booking_value": (
                        completed_booking_value
                    ),

                    "average_booking_value": (
                        average_booking_value
                    ),

                    "total_bookings": total_bookings,

                    "assigned_bookings": (
                        assigned_bookings
                    ),

                    "pending_bookings": (
                        pending_bookings
                    ),

                    "accepted_bookings": (
                        accepted_bookings
                    ),

                    "scheduled_bookings": (
                        scheduled_bookings
                    ),

                    "in_progress_bookings": (
                        in_progress_bookings
                    ),

                    "completed_bookings": (
                        completed_bookings
                    ),

                    "cancelled_bookings": (
                        cancelled_bookings
                    ),
                },

                # =============================================
                # REVIEWS
                # =============================================

                "reviews": {
                    "total": total_reviews,

                    "average_provider_rating": (
                        average_provider_rating
                    ),

                    "total_reviews": total_reviews,
                },

                # =============================================
                # MARKETPLACE SUMMARY
                # =============================================

                "marketplace": {
                    "total_requests": total_requests,

                    "total_quotes": total_quotes,

                    "total_bookings": total_bookings,

                    "assigned_bookings": (
                        assigned_bookings
                    ),

                    "in_progress_bookings": (
                        in_progress_bookings
                    ),

                    "completed_bookings": (
                        completed_bookings
                    ),

                    "cancelled_bookings": (
                        cancelled_bookings
                    ),

                    "total_booking_value": (
                        total_booking_value
                    ),

                    "average_booking_value": (
                        average_booking_value
                    ),

                    "completion_rate": (
                        completion_rate
                    ),

                    "cancellation_rate": (
                        cancellation_rate
                    ),
                },
            },
        },
        status=status.HTTP_200_OK,
    )
    
@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanViewReports,
])
def dashboard_trends_api(request):
    """
    Return ACTIVE marketplace booking and booking-value trends
    for admin dashboard charts.

    Uses:
        services.Booking

    Supports:
        ?period=7d
        ?period=30d
        ?period=6m
        ?period=1y
        ?from=YYYY-MM-DD
        ?to=YYYY-MM-DD
        ?service=plumber
        ?provider_id=25
    """

    # =========================================================
    # FILTERS
    # =========================================================

    dashboard_filters = (
        get_dashboard_filters(request)
    )

    period = dashboard_filters[
        "period"
    ]

    start_date = dashboard_filters.get(
        "start_date"
    )

    end_date = dashboard_filters.get(
        "end_date"
    )

    service_filter = dashboard_filters.get(
        "service"
    )

    provider_id = dashboard_filters.get(
        "provider_id"
    )

    # =========================================================
    # ACTIVE BOOKING QUERYSET
    # =========================================================

    bookings = (
        Booking.objects
        .select_related(
            "service_request",
            "customer",
            "provider",
            "quote",
        )
        .all()
    )

    # =========================================================
    # DATE FILTER
    # =========================================================

    if start_date:
        bookings = bookings.filter(
            created_at__date__gte=start_date
        )

    if end_date:
        bookings = bookings.filter(
            created_at__date__lte=end_date
        )

    # =========================================================
    # SERVICE FILTER
    #
    # ACTIVE ServiceRequest uses:
    #     service_type
    # =========================================================

    if service_filter:
        bookings = bookings.filter(
            service_request__service_type__iexact=(
                service_filter
            )
        )

    # =========================================================
    # PROVIDER FILTER
    #
    # ACTIVE Booking.provider -> User
    # =========================================================

    if provider_id:
        bookings = bookings.filter(
            provider_id=provider_id
        )

    # =========================================================
    # GROUPING
    # =========================================================

    if period in [
        "6m",
        "1y",
    ]:

        # -----------------------------------------------------
        # MONTHLY
        # -----------------------------------------------------

        grouped = (
            bookings
            .annotate(
                period_label=TruncMonth(
                    "created_at"
                )
            )
            .values(
                "period_label"
            )
            .annotate(
                booking_count=Count(
                    "id"
                ),

                completed_bookings=Count(
                    "id",
                    filter=Q(
                        status="completed"
                    ),
                ),

                cancelled_bookings=Count(
                    "id",
                    filter=Q(
                        status="cancelled"
                    ),
                ),

                booking_value=Sum(
                    "final_price",
                    filter=~Q(
                        status="cancelled"
                    ),
                ),

                completed_booking_value=Sum(
                    "final_price",
                    filter=Q(
                        status="completed"
                    ),
                ),
            )
            .order_by(
                "period_label"
            )
        )

    else:

        # -----------------------------------------------------
        # DAILY
        # -----------------------------------------------------

        grouped = (
            bookings
            .annotate(
                period_label=TruncDate(
                    "created_at"
                )
            )
            .values(
                "period_label"
            )
            .annotate(
                booking_count=Count(
                    "id"
                ),

                completed_bookings=Count(
                    "id",
                    filter=Q(
                        status="completed"
                    ),
                ),

                cancelled_bookings=Count(
                    "id",
                    filter=Q(
                        status="cancelled"
                    ),
                ),

                booking_value=Sum(
                    "final_price",
                    filter=~Q(
                        status="cancelled"
                    ),
                ),

                completed_booking_value=Sum(
                    "final_price",
                    filter=Q(
                        status="completed"
                    ),
                ),
            )
            .order_by(
                "period_label"
            )
        )

    # =========================================================
    # CHART DATA
    # =========================================================

    labels = []

    booking_count = []

    completed_bookings = []

    cancelled_bookings = []

    booking_value = []

    completed_booking_value = []

    for item in grouped:

        label = item[
            "period_label"
        ]

        # Safety guard
        if label is None:
            continue

        if period in [
            "6m",
            "1y",
        ]:

            label = label.strftime(
                "%b %Y"
            )

        else:

            label = label.strftime(
                "%d %b"
            )

        labels.append(
            label
        )

        booking_count.append(
            item[
                "booking_count"
            ]
        )

        completed_bookings.append(
            item[
                "completed_bookings"
            ]
        )

        cancelled_bookings.append(
            item[
                "cancelled_bookings"
            ]
        )

        booking_value.append(
            float(
                item[
                    "booking_value"
                ]
                or 0
            )
        )

        completed_booking_value.append(
            float(
                item[
                    "completed_booking_value"
                ]
                or 0
            )
        )

    # =========================================================
    # SUMMARY
    # =========================================================

    summary = bookings.aggregate(

        total_bookings=Count(
            "id"
        ),

        completed_bookings=Count(
            "id",
            filter=Q(
                status="completed"
            ),
        ),

        cancelled_bookings=Count(
            "id",
            filter=Q(
                status="cancelled"
            ),
        ),

        active_bookings=Count(
            "id",
            filter=Q(
                status__in=[
                    "assigned",
                    "pending",
                    "in_progress",
                ]
            ),
        ),

        total_booking_value=Sum(
            "final_price",
            filter=~Q(
                status="cancelled"
            ),
        ),

        completed_booking_value=Sum(
            "final_price",
            filter=Q(
                status="completed"
            ),
        ),

        average_booking_value=Avg(
            "final_price",
            filter=~Q(
                status="cancelled"
            ),
        ),
    )

    total_bookings = (
        summary[
            "total_bookings"
        ]
        or 0
    )

    completed_count = (
        summary[
            "completed_bookings"
        ]
        or 0
    )

    cancelled_count = (
        summary[
            "cancelled_bookings"
        ]
        or 0
    )

    active_count = (
        summary[
            "active_bookings"
        ]
        or 0
    )

    total_booking_value = (
        summary[
            "total_booking_value"
        ]
        or 0
    )

    completed_value = (
        summary[
            "completed_booking_value"
        ]
        or 0
    )

    average_value = (
        summary[
            "average_booking_value"
        ]
        or 0
    )

    # =========================================================
    # RATES
    # =========================================================

    completion_rate = 0

    cancellation_rate = 0

    if total_bookings > 0:

        completion_rate = round(
            (
                completed_count
                / total_bookings
            )
            * 100,
            2,
        )

        cancellation_rate = round(
            (
                cancelled_count
                / total_bookings
            )
            * 100,
            2,
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Dashboard trends fetched successfully."
            ),

            "filters": {
                "period": (
                    dashboard_filters[
                        "period"
                    ]
                ),

                "from": (
                    dashboard_filters[
                        "start_date"
                    ]
                ),

                "to": (
                    dashboard_filters[
                        "end_date"
                    ]
                ),

                "service": (
                    dashboard_filters[
                        "service"
                    ]
                ),

                "provider_id": (
                    dashboard_filters[
                        "provider_id"
                    ]
                ),
            },

            "summary": {

                # Existing fields preserved

                "total_bookings": (
                    total_bookings
                ),

                "total_booking_value": (
                    total_booking_value
                ),

                # Additional admin analytics

                "active_bookings": (
                    active_count
                ),

                "completed_bookings": (
                    completed_count
                ),

                "cancelled_bookings": (
                    cancelled_count
                ),

                "completed_booking_value": (
                    completed_value
                ),

                "average_booking_value": (
                    float(
                        average_value
                    )
                ),

                "completion_rate": (
                    completion_rate
                ),

                "cancellation_rate": (
                    cancellation_rate
                ),
            },

            "chart": {

                # Existing fields preserved

                "labels": (
                    labels
                ),

                "booking_count": (
                    booking_count
                ),

                "completed_bookings": (
                    completed_bookings
                ),

                "cancelled_bookings": (
                    cancelled_bookings
                ),

                "booking_value": (
                    booking_value
                ),

                # Additional useful chart series

                "completed_booking_value": (
                    completed_booking_value
                ),
            },
        },
        status=status.HTTP_200_OK,
    )
@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def pending_providers(request):
    """
    Return providers waiting for admin approval.
    """

    providers = (
        User.objects
        .filter(
            role__in=provider_role_keys(),
            is_approved=False,
        )
        .order_by("-date_joined")
    )

    data = []

    for provider in providers:
        data.append(
            {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "first_name": provider.first_name,
                "last_name": provider.last_name,
                "full_name": (
                    provider.get_full_name()
                    or provider.username
                ),
                "phone": provider.phone,
                "address": provider.address,
                "role": provider.role,
                "bio": provider.bio,
                "experience_years": provider.experience_years,
                "is_email_verified": provider.is_email_verified,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "status_note": provider.status_note or "",
                "profile_picture": (
                    request.build_absolute_uri(
                        provider.profile_picture.url
                    )
                    if provider.profile_picture
                    else None
                ),
                "date_joined": provider.date_joined,
            }
        )

    return Response(
        {
            "success": True,
            "message": "Pending providers fetched successfully.",
            "count": len(data),
            "providers": data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def approve_provider(request, provider_id):
    """
    Approve a provider account.

    Approval also:
    - verifies the provider
    - activates the provider
    - clears previous status/rejection note
    """

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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

    provider.is_approved = True
    provider.is_verified = True
    provider.is_active = True
    provider.status_note = ""

    provider.save(
        update_fields=[
            "is_approved",
            "is_verified",
            "is_active",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider approved successfully.",
            "data": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "status_note": provider.status_note,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def reject_provider(request, provider_id):
    """
    Reject a provider account.

    Rejection:
    - removes approval
    - removes verification
    - deactivates the account
    - stores rejection reason
    """

    reason = (
        request.data.get("reason")
        or ""
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": "Reason is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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

    provider.is_approved = False
    provider.is_verified = False
    provider.is_active = False
    provider.status_note = reason

    provider.save(
        update_fields=[
            "is_approved",
            "is_verified",
            "is_active",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider rejected successfully.",
            "data": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "status_note": provider.status_note,
            },
        },
        status=status.HTTP_200_OK,
    )

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
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def all_providers(request):
    """
    Return all providers for admin management.
    """

    providers = list(
        User.objects
        .filter(role__in=provider_role_keys())
        .order_by("-date_joined")
        .only(
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "address",
            "role",
            "bio",
            "experience_years",
            "is_email_verified",
            "is_approved",
            "is_verified",
            "is_active",
            "status_note",
            "profile_picture",
            "date_joined",
            "last_login",
        )
    )

    providers_data = [
        {
            "id": provider.id,
            "username": provider.username,
            "email": provider.email,
            "first_name": provider.first_name,
            "last_name": provider.last_name,
            "full_name": provider.get_full_name() or provider.username,
            "phone": provider.phone,
            "address": provider.address,
            "role": provider.role,
            "bio": provider.bio,
            "experience_years": provider.experience_years,
            "is_email_verified": provider.is_email_verified,
            "is_approved": provider.is_approved,
            "is_verified": provider.is_verified,
            "is_active": provider.is_active,
            "status_note": provider.status_note or "",
            "profile_picture": (
                request.build_absolute_uri(provider.profile_picture.url)
                if provider.profile_picture
                else None
            ),
            "date_joined": provider.date_joined,
            "last_login": provider.last_login,
        }
        for provider in providers
    ]

    return Response(
        {
            "success": True,
            "message": "Providers fetched successfully.",
            "count": len(providers_data),
            "providers": providers_data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def activate_provider(request, provider_id):
    """
    Reactivate an existing provider account.

    This does NOT approve a rejected/pending provider.
    It only activates an already approved provider.
    """

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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

    # A provider must be approved before activation.
    if not provider.is_approved:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider must be approved before "
                    "the account can be activated."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider.is_active = True
    provider.deactivate_reason = None
    provider.status_note = ""

    provider.save(
        update_fields=[
            "is_active",
            "deactivate_reason",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": (
                "Provider activated successfully."
            ),
            "data": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "deactivate_reason": None,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def deactivate_provider(request, provider_id):
    """
    Deactivate an existing provider account.

    A reason is required for audit/admin visibility.
    """

    reason = (
        request.data.get("reason")
        or ""
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": (
                    "Deactivation reason is required."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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

    provider.is_active = False
    provider.deactivate_reason = reason

    provider.save(
        update_fields=[
            "is_active",
            "deactivate_reason",
        ]
    )

    return Response(
        {
            "success": True,
            "message": (
                "Provider deactivated successfully."
            ),
            "data": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "deactivate_reason": (
                    provider.deactivate_reason
                ),
            },
        },
        status=status.HTTP_200_OK,
    )
@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def verify_provider(request, provider_id):
    """
    Mark an approved provider as verified.
    """

    reason = (
        request.data.get("reason")
        or ""
    ).strip()

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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

    if not provider.is_approved:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider must be approved before "
                    "verification."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider.is_verified = True
    provider.status_note = ""

    provider.save(
        update_fields=[
            "is_verified",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider verified successfully.",
            "data": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "reason": reason or None,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def unverify_provider(request, provider_id):
    """
    Remove provider verification.

    This does not automatically reject or deactivate
    the provider.
    """

    reason = (
        request.data.get("reason")
        or ""
    ).strip()

    if not reason:
        return Response(
            {
                "success": False,
                "message": (
                    "Unverify reason is required."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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

    provider.is_verified = False
    provider.status_note = reason

    provider.save(
        update_fields=[
            "is_verified",
            "status_note",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Provider unverified successfully.",
            "data": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,
                "role": provider.role,
                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
                "reason": reason,
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageCustomers,
])
def all_customers(request):
    """
    Return all customer accounts for admin management.
    """

    customers = list(
        User.objects
        .filter(role="customer", is_staff=False, is_superuser=False)
        .order_by("-date_joined")
        .only(
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "address",
            "is_active",
            "is_email_verified",
            "profile_picture",
            "date_joined",
            "last_login",
        )
    )

    customers_data = [
        {
            "id": customer.id,
            "username": customer.username,
            "email": customer.email,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "full_name": customer.get_full_name() or customer.username,
            "phone": customer.phone,
            "address": customer.address,
            "is_active": customer.is_active,
            "is_email_verified": customer.is_email_verified,
            "profile_picture": (
                request.build_absolute_uri(customer.profile_picture.url)
                if customer.profile_picture
                else None
            ),
            "date_joined": customer.date_joined,
            "last_login": customer.last_login,
        }
        for customer in customers
    ]

    return Response(
        {
            "success": True,
            "message": "Customers fetched successfully.",
            "count": len(customers_data),
            "customers": customers_data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageCustomers,
])
def activate_customer(request, customer_id):

    customer = (
        User.objects
        .filter(
            id=customer_id,
            role="customer",
            is_staff=False,
            is_superuser=False,
        )
        .first()
    )

    if not customer:
        return Response(
            {
                "success": False,
                "message": "Customer not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    customer.is_active = True

    customer.save(
        update_fields=[
            "is_active",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Customer activated successfully.",
            "data": {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "is_active": customer.is_active,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([
    IsAuthenticated,
    CanManageCustomers,
])
def deactivate_customer(request, customer_id):

    customer = (
        User.objects
        .filter(
            id=customer_id,
            role="customer",
            is_staff=False,
            is_superuser=False,
        )
        .first()
    )

    if not customer:
        return Response(
            {
                "success": False,
                "message": "Customer not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    customer.is_active = False

    customer.save(
        update_fields=[
            "is_active",
        ]
    )

    return Response(
        {
            "success": True,
            "message": "Customer deactivated successfully.",
            "data": {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "is_active": customer.is_active,
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageBookings,
])
def all_bookings(request):
    """
    Return all bookings using the new marketplace booking model.
    """

    bookings = (
        ServiceBooking.objects
        .select_related(
            "service_request",
            "service_request__category",
            "customer",
            "provider_profile",
            "provider_profile__provider",
            "quotation",
        )
        .order_by("-created_at")
    )

    bookings_data = []

    for booking in bookings:

        provider_user = (
            booking.provider_profile.provider
        )

        bookings_data.append(
            {
                "id": booking.id,

                "service_request_id": str(
                    booking.service_request.id
                ),

                "service_request_title": (
                    booking.service_request.title
                ),

                "service": {
                    "id": (
                        booking.service_request.category.id
                    ),
                    "name": (
                        booking.service_request.category.name
                    ),
                    "key": (
                        booking.service_request.category.key
                    ),
                },

                "customer": {
                    "id": booking.customer.id,
                    "username": (
                        booking.customer.username
                    ),
                    "email": (
                        booking.customer.email
                    ),
                    "full_name": (
                        booking.customer.get_full_name()
                        or booking.customer.username
                    ),
                },

                "provider": {
                    "id": provider_user.id,
                    "username": (
                        provider_user.username
                    ),
                    "email": (
                        provider_user.email
                    ),
                    "full_name": (
                        provider_user.get_full_name()
                        or provider_user.username
                    ),
                },

                "quotation_id": (
                    booking.quotation.id
                ),

                "final_price": (
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

                "cancellation_reason": (
                    booking.cancellation_reason
                ),

                "completed_at": (
                    booking.completed_at
                ),

                "created_at": (
                    booking.created_at
                ),

                "updated_at": (
                    booking.updated_at
                ),
            }
        )

    return Response(
        {
            "success": True,
            "message": (
                "Bookings fetched successfully."
            ),
            "count": bookings.count(),
            "bookings": bookings_data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageQuotes,
])
def all_quotes(request):
    """
    Return all provider quotations using
    the new marketplace quotation model.
    """

    quotations = (
        ProviderQuotation.objects
        .select_related(
            "service_request",
            "service_request__category",
            "service_request__customer",
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by("-created_at")
    )

    quotations_data = []

    for quotation in quotations:

        provider_user = (
            quotation.provider_profile.provider
        )

        customer = (
            quotation.service_request.customer
        )

        quotations_data.append(
            {
                "id": quotation.id,

                "service_request_id": str(
                    quotation.service_request.id
                ),

                "service_request_title": (
                    quotation.service_request.title
                ),

                "service": {
                    "id": (
                        quotation
                        .service_request
                        .category
                        .id
                    ),
                    "name": (
                        quotation
                        .service_request
                        .category
                        .name
                    ),
                    "key": (
                        quotation
                        .service_request
                        .category
                        .key
                    ),
                },

                "customer": {
                    "id": customer.id,
                    "username": customer.username,
                    "email": customer.email,
                    "full_name": (
                        customer.get_full_name()
                        or customer.username
                    ),
                },

                "provider": {
                    "id": provider_user.id,
                    "username": (
                        provider_user.username
                    ),
                    "email": (
                        provider_user.email
                    ),
                    "full_name": (
                        provider_user.get_full_name()
                        or provider_user.username
                    ),
                },

                "quoted_price": (
                    quotation.quoted_price
                ),

                "message": (
                    quotation.message
                ),

                "estimated_duration_minutes": (
                    quotation
                    .estimated_duration_minutes
                ),

                "status": (
                    quotation.status
                ),

                "created_at": (
                    quotation.created_at
                ),

                "updated_at": (
                    quotation.updated_at
                ),
            }
        )

    return Response(
        {
            "success": True,
            "message": (
                "Quotations fetched successfully."
            ),
            "count": quotations.count(),
            "quotes": quotations_data,
        },
        status=status.HTTP_200_OK,
    )
from providers.models import (
    ProviderProfile,
    ProviderAvailability,
)
@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanViewReports,
])
def provider_performance(request):
    """
    Provider leaderboard and performance analytics.

    Uses the ACTIVE marketplace flow:
        Quote -> Booking -> Review

    Also includes ProviderProfile operational/location data.

    Supports:
        ?period=7d
        ?period=30d
        ?period=6m
        ?period=1y
        ?from=YYYY-MM-DD
        ?to=YYYY-MM-DD
        ?service=plumber
    """

    # =========================================================
    # FILTERS
    # =========================================================

    dashboard_filters = get_dashboard_filters(request)

    start_date = dashboard_filters.get("start_date")
    end_date = dashboard_filters.get("end_date")
    service_filter = dashboard_filters.get("service")

    # =========================================================
    # MARKETPLACE LOCATION SETTINGS
    # =========================================================

    marketplace_settings = (
        MarketplaceLocationSettings.get_settings()
    )

    live_timeout_minutes = (
        marketplace_settings.live_location_timeout_minutes
    )

    # =========================================================
    # PROVIDERS
    # =========================================================

    providers = (
        User.objects
        .filter(
            role__in=provider_role_keys()
        )
        .order_by("username")
    )

    data = []

    for provider in providers:

        # =====================================================
        # PROVIDER PROFILE
        # =====================================================

        provider_profile = (
            ProviderProfile.objects
            .filter(
                provider=provider
            )
            .first()
        )

        # =====================================================
        # QUOTES
        # =====================================================

        quotations = Quote.objects.filter(
            provider=provider
        )

        if start_date:
            quotations = quotations.filter(
                created_at__date__gte=start_date
            )

        if end_date:
            quotations = quotations.filter(
                created_at__date__lte=end_date
            )

        if service_filter:
            quotations = quotations.filter(
                service_request__service_type__iexact=(
                    service_filter
                )
            )

        total_quotes = quotations.count()

        accepted_quotes = quotations.filter(
            status="accepted"
        ).count()

        rejected_quotes = quotations.filter(
            status="rejected"
        ).count()

        pending_quotes = quotations.filter(
            status="pending"
        ).count()

        # =====================================================
        # BOOKINGS
        # =====================================================

        bookings = Booking.objects.filter(
            provider=provider
        )

        if start_date:
            bookings = bookings.filter(
                created_at__date__gte=start_date
            )

        if end_date:
            bookings = bookings.filter(
                created_at__date__lte=end_date
            )

        if service_filter:
            bookings = bookings.filter(
                service_request__service_type__iexact=(
                    service_filter
                )
            )

        total_bookings = bookings.count()

        assigned_bookings = bookings.filter(
            status="assigned"
        ).count()

        pending_bookings = bookings.filter(
            status="pending"
        ).count()

        in_progress_bookings = bookings.filter(
            status="in_progress"
        ).count()

        completed_bookings = bookings.filter(
            status="completed"
        ).count()

        cancelled_bookings = bookings.filter(
            status="cancelled"
        ).count()

        # =====================================================
        # BOOKING VALUE
        # =====================================================

        booking_value_data = (
            bookings
            .exclude(
                status="cancelled"
            )
            .aggregate(
                total=Sum("final_price"),
                average=Avg("final_price"),
            )
        )

        total_booking_value = (
            booking_value_data["total"] or 0
        )

        average_booking_value = (
            booking_value_data["average"] or 0
        )

        completed_booking_value = (
            bookings
            .filter(
                status="completed"
            )
            .aggregate(
                total=Sum("final_price")
            )["total"]
            or 0
        )

        # =====================================================
        # REVIEWS
        # =====================================================

        reviews = Review.objects.filter(
            provider=provider
        )

        if start_date:
            reviews = reviews.filter(
                created_at__date__gte=start_date
            )

        if end_date:
            reviews = reviews.filter(
                created_at__date__lte=end_date
            )

        if service_filter:
            reviews = reviews.filter(
                booking__service_request__service_type__iexact=(
                    service_filter
                )
            )

        total_reviews = reviews.count()

        rating_data = reviews.aggregate(
            average=Avg("rating")
        )

        average_rating = (
            rating_data["average"] or 0
        )

        average_rating = round(
            float(average_rating),
            2,
        )

        # =====================================================
        # QUOTE ACCEPTANCE RATE
        # =====================================================

        quotation_acceptance_rate = 0

        if total_quotes > 0:
            quotation_acceptance_rate = round(
                (
                    accepted_quotes
                    / total_quotes
                )
                * 100,
                2,
            )

        # =====================================================
        # BOOKING COMPLETION RATE
        # =====================================================

        completion_rate = 0

        if total_bookings > 0:
            completion_rate = round(
                (
                    completed_bookings
                    / total_bookings
                )
                * 100,
                2,
            )

        # =====================================================
        # BOOKING CANCELLATION RATE
        # =====================================================

        cancellation_rate = 0

        if total_bookings > 0:
            cancellation_rate = round(
                (
                    cancelled_bookings
                    / total_bookings
                )
                * 100,
                2,
            )

        # =====================================================
        # PROVIDER OPERATIONAL STATUS
        # =====================================================

        is_online = False
        is_available = False
        profile_is_active = False

        current_latitude = None
        current_longitude = None
        current_location_text = ""
        location_source = None
        last_location_updated_at = None
        service_radius_km = None

        has_location = False
        live_location_is_fresh = False
        live_location_is_stale = False
        location_is_usable = False

        if provider_profile:

            is_online = provider_profile.is_online

            is_available = (
                provider_profile.is_available
            )

            profile_is_active = (
                provider_profile.is_active
            )

            current_latitude = (
                float(
                    provider_profile.current_latitude
                )
                if provider_profile.current_latitude
                is not None
                else None
            )

            current_longitude = (
                float(
                    provider_profile.current_longitude
                )
                if provider_profile.current_longitude
                is not None
                else None
            )

            current_location_text = (
                provider_profile.current_location_text
                or ""
            )

            location_source = (
                provider_profile.location_source
            )

            last_location_updated_at = (
                provider_profile
                .last_location_updated_at
            )

            service_radius_km = (
                float(
                    provider_profile.service_radius_km
                )
                if provider_profile.service_radius_km
                is not None
                else None
            )

            has_location = (
                provider_profile.current_latitude
                is not None
                and
                provider_profile.current_longitude
                is not None
            )

            # =============================================
            # MANUAL LOCATION
            # =============================================

            if (
                has_location
                and
                location_source
                == ProviderProfile.LOCATION_SOURCE_MANUAL
            ):
                location_is_usable = True

            # =============================================
            # LIVE LOCATION
            # =============================================

            elif (
                has_location
                and
                location_source
                == ProviderProfile.LOCATION_SOURCE_LIVE
            ):

                if last_location_updated_at:

                    expiry_time = (
                        last_location_updated_at
                        + timedelta(
                            minutes=live_timeout_minutes
                        )
                    )

                    live_location_is_fresh = (
                        timezone.now()
                        <= expiry_time
                    )

                    live_location_is_stale = (
                        not live_location_is_fresh
                    )

                    location_is_usable = (
                        live_location_is_fresh
                    )

                else:
                    live_location_is_stale = True

        # =====================================================
        # MARKETPLACE READY
        # =====================================================

        marketplace_ready = bool(
            provider.is_active
            and provider.is_approved
            and provider_profile
            and profile_is_active
            and is_online
            and is_available
            and location_is_usable
            and marketplace_settings
            .is_location_matching_enabled
        )

        # =====================================================
        # PROVIDER RESPONSE
        # =====================================================

        data.append(
            {
                "provider_id": provider.id,

                "provider": provider.username,

                "full_name": (
                    provider.get_full_name()
                    or provider.username
                ),

                "email": provider.email,

                "phone": provider.phone,

                "role": provider.role,

                # =============================================
                # ACCOUNT STATUS
                # =============================================

                "is_active": provider.is_active,

                "is_approved": provider.is_approved,

                "is_verified": provider.is_verified,

                "profile_picture": (
                    request.build_absolute_uri(
                        provider.profile_picture.url
                    )
                    if provider.profile_picture
                    else None
                ),

                # =============================================
                # LIVE / OPERATIONAL STATUS
                # =============================================

                "operational_status": {
                    "has_provider_profile": bool(
                        provider_profile
                    ),

                    "profile_is_active": (
                        profile_is_active
                    ),

                    "is_online": is_online,

                    "is_available": is_available,

                    "marketplace_ready": (
                        marketplace_ready
                    ),
                },

                # =============================================
                # LOCATION
                # =============================================

                "location": {
                    "has_location": has_location,

                    "latitude": current_latitude,

                    "longitude": current_longitude,

                    "location_text": (
                        current_location_text
                    ),

                    "location_source": (
                        location_source
                    ),

                    "last_location_updated_at": (
                        last_location_updated_at
                    ),

                    "service_radius_km": (
                        service_radius_km
                    ),

                    "live_location_is_fresh": (
                        live_location_is_fresh
                    ),

                    "live_location_is_stale": (
                        live_location_is_stale
                    ),

                    "location_is_usable": (
                        location_is_usable
                    ),
                },

                # =============================================
                # QUOTES
                # =============================================

                "total_quotes": total_quotes,

                "pending_quotes": pending_quotes,

                "accepted_quotes": accepted_quotes,

                "rejected_quotes": rejected_quotes,

                "quotation_acceptance_rate": (
                    quotation_acceptance_rate
                ),

                # Old frontend compatibility
                "acceptance_rate": (
                    quotation_acceptance_rate
                ),

                # =============================================
                # BOOKINGS
                # =============================================

                "total_bookings": total_bookings,

                "assigned_bookings": (
                    assigned_bookings
                ),

                "pending_bookings": (
                    pending_bookings
                ),

                "in_progress_bookings": (
                    in_progress_bookings
                ),

                "completed_bookings": (
                    completed_bookings
                ),

                "cancelled_bookings": (
                    cancelled_bookings
                ),

                "completion_rate": (
                    completion_rate
                ),

                "cancellation_rate": (
                    cancellation_rate
                ),

                "total_booking_value": (
                    total_booking_value
                ),

                "completed_booking_value": (
                    completed_booking_value
                ),

                "average_booking_value": (
                    average_booking_value
                ),

                # =============================================
                # REVIEWS
                # =============================================

                "total_reviews": total_reviews,

                "average_rating": average_rating,
            }
        )

    # =========================================================
    # LEADERBOARD RANKING
    # =========================================================

    data.sort(
        key=lambda item: (
            item["completed_bookings"],
            float(
                item["total_booking_value"]
            ),
            item["average_rating"],
            item[
                "quotation_acceptance_rate"
            ],
        ),
        reverse=True,
    )

    for index, provider_data in enumerate(
        data,
        start=1,
    ):
        provider_data["rank"] = index

    # =========================================================
    # SUMMARY
    # =========================================================

    total_provider_booking_value = sum(
        (
            item["total_booking_value"]
            for item in data
        ),
        start=0,
    )

    total_completed_jobs = sum(
        item["completed_bookings"]
        for item in data
    )

    total_cancelled_jobs = sum(
        item["cancelled_bookings"]
        for item in data
    )

    online_providers = sum(
        1
        for item in data
        if item["operational_status"]["is_online"]
    )

    available_providers = sum(
        1
        for item in data
        if item["operational_status"]["is_available"]
    )

    marketplace_ready_providers = sum(
        1
        for item in data
        if item[
            "operational_status"
        ]["marketplace_ready"]
    )

    providers_with_fresh_live_location = sum(
        1
        for item in data
        if item[
            "location"
        ]["live_location_is_fresh"]
    )

    providers_with_stale_live_location = sum(
        1
        for item in data
        if item[
            "location"
        ]["live_location_is_stale"]
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Provider leaderboard and "
                "performance fetched successfully."
            ),

            "filters": {
                "period": (
                    dashboard_filters.get(
                        "period"
                    )
                ),

                "from": start_date,

                "to": end_date,

                "service": service_filter,
            },

            "location_settings": {
                "matching_enabled": (
                    marketplace_settings
                    .is_location_matching_enabled
                ),

                "live_location_timeout_minutes": (
                    live_timeout_minutes
                ),

                "maximum_provider_radius_km": float(
                    marketplace_settings
                    .max_provider_radius_km
                ),
            },

            "summary": {
                "total_providers": len(data),

                "online_providers": (
                    online_providers
                ),

                "offline_providers": (
                    len(data) - online_providers
                ),

                "available_providers": (
                    available_providers
                ),

                "marketplace_ready_providers": (
                    marketplace_ready_providers
                ),

                "providers_with_fresh_live_location": (
                    providers_with_fresh_live_location
                ),

                "providers_with_stale_live_location": (
                    providers_with_stale_live_location
                ),

                "total_completed_jobs": (
                    total_completed_jobs
                ),

                "total_cancelled_jobs": (
                    total_cancelled_jobs
                ),

                "total_booking_value": (
                    total_provider_booking_value
                ),
            },

            "count": len(data),

            "providers": data,
        },
        status=status.HTTP_200_OK,
    )
@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    IsAdminUser,
])
def marketplace_monitor_api(request):
    """
    Live marketplace monitoring for admin.

    Uses ACTIVE marketplace flow:
        ServiceRequest
        Quote
        Booking
        Review

    Also includes provider operational/location information.

    Optional:
        ?sections=summary,bookings,quotes,providers,requests
    """

    # =========================================================
    # SECTIONS
    # =========================================================

    sections_param = (
        request.query_params.get(
            "sections",
            "",
        )
        or ""
    ).strip()

    sections = {
        part.strip().lower()
        for part in sections_param.split(",")
        if part.strip()
    }

    include_all = not sections

    payload = {}

    # =========================================================
    # MARKETPLACE SETTINGS
    # =========================================================

    marketplace_settings = (
        MarketplaceLocationSettings.get_settings()
    )

    live_timeout_minutes = (
        marketplace_settings
        .live_location_timeout_minutes
    )

    now = timezone.now()
    today = now.date()

    # =========================================================
    # COMMON QUERYSETS
    # ACTIVE MARKETPLACE FLOW
    # =========================================================

    service_requests_queryset = (
        ServiceRequest.objects.all()
    )

    quotes_queryset = (
        Quote.objects.all()
    )

    bookings_queryset = (
        Booking.objects.all()
    )

    providers_queryset = (
        User.objects
        .filter(
            role__in=provider_role_keys()
        )
    )

    # =========================================================
    # SUMMARY
    # =========================================================

    if include_all or "summary" in sections:

        # -----------------------------------------------------
        # PROVIDER SUMMARY
        # -----------------------------------------------------

        total_providers = (
            providers_queryset.count()
        )

        approved_providers = (
            providers_queryset
            .filter(
                is_approved=True
            )
            .count()
        )

        provider_profiles = (
            ProviderProfile.objects
            .select_related("provider")
            .filter(
                provider__role__in=(
                    provider_role_keys()
                )
            )
        )

        online_providers = 0
        offline_providers = 0
        available_providers = 0
        busy_providers = 0

        marketplace_ready_providers = 0

        fresh_live_location_providers = 0
        stale_live_location_providers = 0

        for profile in provider_profiles:

            provider = profile.provider

            # ---------------------------------------------
            # ONLINE / OFFLINE
            # ---------------------------------------------

            if profile.is_online:
                online_providers += 1
            else:
                offline_providers += 1

            # ---------------------------------------------
            # AVAILABLE
            # ---------------------------------------------

            if profile.is_available:
                available_providers += 1

            # ---------------------------------------------
            # BUSY
            # ---------------------------------------------

            is_busy = (
                Booking.objects
                .filter(
                    provider=provider,
                    status="in_progress",
                )
                .exists()
            )

            if is_busy:
                busy_providers += 1

            # ---------------------------------------------
            # LOCATION
            # ---------------------------------------------

            has_location = (
                profile.current_latitude
                is not None
                and
                profile.current_longitude
                is not None
            )

            location_is_usable = False

            # Manual location does not expire.
            if (
                has_location
                and
                profile.location_source
                == ProviderProfile
                .LOCATION_SOURCE_MANUAL
            ):
                location_is_usable = True

            # Live location must be fresh.
            elif (
                has_location
                and
                profile.location_source
                == ProviderProfile
                .LOCATION_SOURCE_LIVE
            ):

                if (
                    profile
                    .last_location_updated_at
                    is not None
                ):

                    expiry_time = (
                        profile
                        .last_location_updated_at
                        + timedelta(
                            minutes=(
                                live_timeout_minutes
                            )
                        )
                    )

                    if now <= expiry_time:

                        location_is_usable = True

                        fresh_live_location_providers += 1

                    else:

                        stale_live_location_providers += 1

                else:

                    stale_live_location_providers += 1

            # ---------------------------------------------
            # MARKETPLACE READY
            # ---------------------------------------------

            marketplace_ready = bool(
                provider.is_active
                and provider.is_approved
                and profile.is_profile_active
                and profile.is_online
                and profile.is_available
                and location_is_usable
                and marketplace_settings
                .is_location_matching_enabled
            )

            if marketplace_ready:
                marketplace_ready_providers += 1

        # -----------------------------------------------------
        # REQUEST SUMMARY
        # -----------------------------------------------------

        total_requests = (
            service_requests_queryset.count()
        )

        pending_requests = (
            service_requests_queryset
            .filter(
                status="pending"
            )
            .count()
        )

        area_selected_requests = (
            service_requests_queryset
            .filter(
                status="area_selected"
            )
            .count()
        )

        quotation_received_requests = (
            service_requests_queryset
            .filter(
                status="quotation_received"
            )
            .count()
        )

        assigned_requests = (
            service_requests_queryset
            .filter(
                status="assigned"
            )
            .count()
        )

        in_progress_requests = (
            service_requests_queryset
            .filter(
                status="in_progress"
            )
            .count()
        )

        # -----------------------------------------------------
        # QUOTE SUMMARY
        # -----------------------------------------------------

        total_quotes = (
            quotes_queryset.count()
        )

        pending_quotes = (
            quotes_queryset
            .filter(
                status="pending"
            )
            .count()
        )

        accepted_quotes = (
            quotes_queryset
            .filter(
                status="accepted"
            )
            .count()
        )

        # -----------------------------------------------------
        # BOOKING SUMMARY
        # -----------------------------------------------------

        total_bookings = (
            bookings_queryset.count()
        )

        assigned_bookings = (
            bookings_queryset
            .filter(
                status="assigned"
            )
            .count()
        )

        pending_bookings = (
            bookings_queryset
            .filter(
                status="pending"
            )
            .count()
        )

        in_progress_bookings = (
            bookings_queryset
            .filter(
                status="in_progress"
            )
            .count()
        )

        completed_today = (
            bookings_queryset
            .filter(
                status="completed",
                completed_at__date=today,
            )
            .count()
        )

        cancelled_today = (
            bookings_queryset
            .filter(
                status="cancelled",
                updated_at__date=today,
            )
            .count()
        )

        payload["summary"] = {

            "providers": {
                "total": total_providers,
                "approved": approved_providers,
                "online": online_providers,
                "offline": offline_providers,
                "available": available_providers,
                "busy": busy_providers,

                "marketplace_ready": (
                    marketplace_ready_providers
                ),

                "fresh_live_location": (
                    fresh_live_location_providers
                ),

                "stale_live_location": (
                    stale_live_location_providers
                ),
            },

            "requests": {
                "total": total_requests,

                "pending": (
                    pending_requests
                ),

                "area_selected": (
                    area_selected_requests
                ),

                "quotation_received": (
                    quotation_received_requests
                ),

                "assigned": (
                    assigned_requests
                ),

                "in_progress": (
                    in_progress_requests
                ),
            },

            "quotes": {
                "total": total_quotes,
                "pending": pending_quotes,
                "accepted": accepted_quotes,
            },

            "bookings": {
                "total": total_bookings,

                "assigned": (
                    assigned_bookings
                ),

                "pending": (
                    pending_bookings
                ),

                "in_progress": (
                    in_progress_bookings
                ),

                "completed_today": (
                    completed_today
                ),

                "cancelled_today": (
                    cancelled_today
                ),
            },
        }

    # =========================================================
    # RECENT SERVICE REQUESTS
    # =========================================================

    if include_all or "requests" in sections:

        service_requests = (
            ServiceRequest.objects
            .select_related(
                "customer",
                "selected_provider",
            )
            .order_by(
                "-created_at"
            )[:50]
        )

        request_rows = []

        for service_request in service_requests:

            request_rows.append(
                {
                    "id": (
                        service_request.id
                    ),

                    "service_type": (
                        service_request.service_type
                    ),

                    "customer": {
                        "id": (
                            service_request
                            .customer_id
                        ),

                        "username": (
                            service_request
                            .customer
                            .username
                        ),
                    },

                    "selected_provider": (
                        {
                            "id": (
                                service_request
                                .selected_provider_id
                            ),

                            "username": (
                                service_request
                                .selected_provider
                                .username
                            ),
                        }
                        if (
                            service_request
                            .selected_provider
                        )
                        else None
                    ),

                    "status": (
                        service_request.status
                    ),

                    "is_booked": (
                        service_request.is_booked
                    ),

                    "preferred_schedule": {
                        "date": (
                            service_request
                            .preferred_date
                        ),

                        "start_time": (
                            service_request
                            .preferred_start_time
                        ),

                        "end_time": (
                            service_request
                            .preferred_end_time
                        ),
                    },

                    "created_at": (
                        service_request.created_at
                    ),
                }
            )

        payload["requests"] = request_rows

    # =========================================================
    # RECENT BOOKINGS
    # =========================================================

    if include_all or "bookings" in sections:

        bookings = (
            Booking.objects
            .select_related(
                "service_request",
                "customer",
                "provider",
                "quote",
            )
            .order_by(
                "-created_at"
            )[:50]
        )

        booking_rows = []

        for booking in bookings:

            booking_rows.append(
                {
                    "id": booking.id,

                    "service_request_id": (
                        booking.service_request_id
                    ),

                    "service": {
                        "type": (
                            booking
                            .service_request
                            .service_type
                        ),
                    },

                    "customer": {
                        "id": (
                            booking.customer_id
                        ),

                        "username": (
                            booking.customer.username
                        ),

                        "full_name": (
                            booking.customer.get_full_name()
                            or booking.customer.username
                        ),
                    },

                    "provider": {
                        "id": (
                            booking.provider_id
                        ),

                        "username": (
                            booking.provider.username
                        ),

                        "full_name": (
                            booking.provider.get_full_name()
                            or booking.provider.username
                        ),
                    },

                    "final_price": (
                        booking.final_price
                    ),

                    "status": (
                        booking.status
                    ),

                    "schedule": {
                        "date": (
                            booking.scheduled_date
                        ),

                        "start_time": (
                            booking
                            .scheduled_start_time
                        ),

                        "end_time": (
                            booking
                            .scheduled_end_time
                        ),
                    },

                    "created_at": (
                        booking.created_at
                    ),

                    "completed_at": (
                        booking.completed_at
                    ),
                }
            )

        payload["bookings"] = (
            booking_rows
        )

    # =========================================================
    # RECENT QUOTES
    # =========================================================

    if include_all or "quotes" in sections:

        quotations = (
            Quote.objects
            .select_related(
                "service_request",
                "service_request__customer",
                "provider",
            )
            .order_by(
                "-created_at"
            )[:50]
        )

        quote_rows = []

        for quotation in quotations:

            quote_rows.append(
                {
                    "id": quotation.id,

                    "service_request_id": (
                        quotation
                        .service_request_id
                    ),

                    "service": {
                        "type": (
                            quotation
                            .service_request
                            .service_type
                        ),
                    },

                    "customer": {
                        "id": (
                            quotation
                            .service_request
                            .customer_id
                        ),

                        "username": (
                            quotation
                            .service_request
                            .customer
                            .username
                        ),
                    },

                    "provider": {
                        "id": (
                            quotation.provider_id
                        ),

                        "username": (
                            quotation.provider.username
                        ),

                        "full_name": (
                            quotation.provider.get_full_name()
                            or quotation.provider.username
                        ),
                    },

                    "quoted_price": (
                        quotation.price
                    ),

                    "status": (
                        quotation.status
                    ),

                    "created_at": (
                        quotation.created_at
                    ),
                }
            )

        payload["quotes"] = quote_rows

    # =========================================================
    # PROVIDER LIVE MONITOR
    # =========================================================

    if include_all or "providers" in sections:

        providers = (
            User.objects
            .filter(
                role__in=provider_role_keys()
            )
            .order_by(
                "username"
            )
        )

        provider_rows = []

        for provider in providers:

            provider_profile = (
                ProviderProfile.objects
                .filter(
                    provider=provider
                )
                .first()
            )

            provider_bookings = (
                Booking.objects
                .filter(
                    provider=provider
                )
            )

            provider_quotes = (
                Quote.objects
                .filter(
                    provider=provider
                )
            )

            provider_reviews = (
                Review.objects
                .filter(
                    provider=provider
                )
            )

            # ---------------------------------------------
            # PERFORMANCE
            # ---------------------------------------------

            total_quotes = (
                provider_quotes.count()
            )

            accepted_quotes = (
                provider_quotes
                .filter(
                    status="accepted"
                )
                .count()
            )

            total_bookings = (
                provider_bookings.count()
            )

            completed_bookings = (
                provider_bookings
                .filter(
                    status="completed"
                )
                .count()
            )

            cancelled_bookings = (
                provider_bookings
                .filter(
                    status="cancelled"
                )
                .count()
            )

            average_rating = round(
                float(
                    provider_reviews
                    .aggregate(
                        average=Avg("rating")
                    )["average"]
                    or 0
                ),
                2,
            )

            # ---------------------------------------------
            # CURRENT JOB
            # ---------------------------------------------

            current_booking = (
                provider_bookings
                .filter(
                    status="in_progress"
                )
                .select_related(
                    "service_request"
                )
                .order_by(
                    "-updated_at"
                )
                .first()
            )

            is_busy = bool(
                current_booking
            )

            # ---------------------------------------------
            # PROFILE / LOCATION DEFAULTS
            # ---------------------------------------------

            profile_is_active = False
            is_online = False
            is_available = False

            latitude = None
            longitude = None
            location_text = ""
            location_source = None
            last_location_updated_at = None

            service_radius_km = None
            effective_radius_km = None

            has_location = False

            live_location_is_fresh = False
            live_location_is_stale = False
            location_is_usable = False

            # ---------------------------------------------
            # PROVIDER PROFILE
            # ---------------------------------------------

            if provider_profile:

                profile_is_active = (
                    provider_profile
                    .is_profile_active
                )

                is_online = (
                    provider_profile
                    .is_online
                )

                is_available = (
                    provider_profile
                    .is_available
                )

                latitude = (
                    float(
                        provider_profile
                        .current_latitude
                    )
                    if (
                        provider_profile
                        .current_latitude
                        is not None
                    )
                    else None
                )

                longitude = (
                    float(
                        provider_profile
                        .current_longitude
                    )
                    if (
                        provider_profile
                        .current_longitude
                        is not None
                    )
                    else None
                )

                location_text = (
                    provider_profile
                    .current_location_text
                    or ""
                )

                location_source = (
                    provider_profile
                    .location_source
                )

                last_location_updated_at = (
                    provider_profile
                    .last_location_updated_at
                )

                service_radius_km = (
                    float(
                        provider_profile
                        .service_radius_km
                    )
                    if (
                        provider_profile
                        .service_radius_km
                        is not None
                    )
                    else None
                )

                has_location = (
                    provider_profile
                    .current_latitude
                    is not None
                    and
                    provider_profile
                    .current_longitude
                    is not None
                )

                # -----------------------------------------
                # MANUAL LOCATION
                # -----------------------------------------

                if (
                    has_location
                    and
                    location_source
                    == ProviderProfile
                    .LOCATION_SOURCE_MANUAL
                ):

                    location_is_usable = True

                # -----------------------------------------
                # LIVE LOCATION
                # -----------------------------------------

                elif (
                    has_location
                    and
                    location_source
                    == ProviderProfile
                    .LOCATION_SOURCE_LIVE
                ):

                    if last_location_updated_at:

                        expiry_time = (
                            last_location_updated_at
                            + timedelta(
                                minutes=(
                                    live_timeout_minutes
                                )
                            )
                        )

                        live_location_is_fresh = (
                            now <= expiry_time
                        )

                        live_location_is_stale = (
                            not
                            live_location_is_fresh
                        )

                        location_is_usable = (
                            live_location_is_fresh
                        )

                    else:

                        live_location_is_stale = True

                # -----------------------------------------
                # EFFECTIVE RADIUS
                # -----------------------------------------

                if (
                    provider_profile
                    .service_radius_km
                    is not None
                ):

                    effective_radius_km = float(
                        min(
                            marketplace_settings
                            .max_provider_radius_km,

                            provider_profile
                            .service_radius_km,
                        )
                    )

            # ---------------------------------------------
            # MARKETPLACE READY
            # ---------------------------------------------

            marketplace_ready = bool(
                provider.is_active
                and provider.is_approved
                and provider_profile
                and profile_is_active
                and is_online
                and is_available
                and location_is_usable
                and marketplace_settings
                .is_location_matching_enabled
            )

            # ---------------------------------------------
            # CURRENT JOB DATA
            # ---------------------------------------------

            current_job = None

            if current_booking:

                current_job = {
                    "booking_id": (
                        current_booking.id
                    ),

                    "service_request_id": (
                        current_booking
                        .service_request_id
                    ),

                    "service_type": (
                        current_booking
                        .service_request
                        .service_type
                    ),

                    "status": (
                        current_booking.status
                    ),

                    "schedule": {
                        "date": (
                            current_booking
                            .scheduled_date
                        ),

                        "start_time": (
                            current_booking
                            .scheduled_start_time
                        ),

                        "end_time": (
                            current_booking
                            .scheduled_end_time
                        ),
                    },
                }

            # ---------------------------------------------
            # PROVIDER ROW
            # ---------------------------------------------

            provider_rows.append(
                {
                    "provider_id": (
                        provider.id
                    ),

                    "provider": (
                        provider.username
                    ),

                    "full_name": (
                        provider.get_full_name()
                        or provider.username
                    ),

                    "role": provider.role,

                    "account_status": {
                        "is_active": (
                            provider.is_active
                        ),

                        "is_approved": (
                            provider.is_approved
                        ),

                        "is_verified": (
                            provider.is_verified
                        ),
                    },

                    "operational_status": {
                        "has_provider_profile": bool(
                            provider_profile
                        ),

                        "profile_is_active": (
                            profile_is_active
                        ),

                        "is_online": (
                            is_online
                        ),

                        "is_available": (
                            is_available
                        ),

                        "is_busy": (
                            is_busy
                        ),

                        "marketplace_ready": (
                            marketplace_ready
                        ),
                    },

                    "location": {
                        "has_location": (
                            has_location
                        ),

                        "latitude": (
                            latitude
                        ),

                        "longitude": (
                            longitude
                        ),

                        "location_text": (
                            location_text
                        ),

                        "location_source": (
                            location_source
                        ),

                        "last_location_updated_at": (
                            last_location_updated_at
                        ),

                        "live_location_is_fresh": (
                            live_location_is_fresh
                        ),

                        "live_location_is_stale": (
                            live_location_is_stale
                        ),

                        "location_is_usable": (
                            location_is_usable
                        ),

                        "service_radius_km": (
                            service_radius_km
                        ),

                        "effective_radius_km": (
                            effective_radius_km
                        ),
                    },

                    "current_job": (
                        current_job
                    ),

                    # -----------------------------------------
                    # Keep old response fields
                    # -----------------------------------------

                    "total_quotes": (
                        total_quotes
                    ),

                    "accepted_quotes": (
                        accepted_quotes
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

                    "average_rating": (
                        average_rating
                    ),
                }
            )

        payload["providers"] = (
            provider_rows
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Marketplace monitor fetched successfully."
            ),

            "location_settings": {
                "matching_enabled": (
                    marketplace_settings
                    .is_location_matching_enabled
                ),

                "live_location_timeout_minutes": (
                    live_timeout_minutes
                ),

                "max_provider_radius_km": float(
                    marketplace_settings
                    .max_provider_radius_km
                ),
            },

            "data": payload,
        },
        status=status.HTTP_200_OK,
    )


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
    serialized = serializer.data

    return Response(
        {
            "success": True,
            "message": "Spotlight images fetched successfully.",
            "count": len(serialized),
            "data": serialized,
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
    serialized = serializer.data

    return Response(
        {
            "success": True,
            "message": "Active spotlight images fetched successfully.",
            "count": len(serialized),
            "data": serialized,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def home_catalog_api(request):
    """
    Public home catalog:
    active services, popular services,
    coming-soon services, and spotlights.
    """

    active_services = (
        ServiceCategory.objects
        .filter(status="active")
        .order_by("display_order", "name")
    )

    popular_services = (
        ServiceCategory.objects
        .filter(
            status="active",
            is_popular=True,
        )
        .order_by("display_order", "name")
    )

    coming_soon_services = (
        ServiceCategory.objects
        .filter(status="coming_soon")
        .order_by("display_order", "name")
    )

    spotlights = (
        SpotlightImage.objects
        .filter(is_active=True)
        .order_by("display_order", "-created_at")
    )

    def serialize_service(service):
        return {
            "id": service.id,
            "name": service.name,
            "key": service.key,
            "description": service.description,
            "service_image": (
                request.build_absolute_uri(
                    service.service_image.url
                )
                if service.service_image
                else None
            ),
            "status": service.status,
            "start_date": service.start_date,
            "display_order": service.display_order,
            "is_popular": service.is_popular,
            "is_available": (
                service.status == "active"
            ),
        }

    serializer = SpotlightImageSerializer(
        spotlights,
        many=True,
        context={"request": request},
    )

    return Response(
        {
            "success": True,
            "message": "Home catalog fetched successfully.",
            "data": {
                "active_services": [
                    serialize_service(service)
                    for service in active_services
                ],
                "popular_services": [
                    serialize_service(service)
                    for service in popular_services
                ],
                "coming_soon_services": [
                    serialize_service(service)
                    for service in coming_soon_services
                ],
                "spotlights": serializer.data,
            },
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
@api_view(["GET"])
@permission_classes([AllowAny])
def public_services_api(request):
    """
    Public customer-facing service list.

    Query params:

    status=active
        -> only active services

    status=all
        -> active + coming soon services

    popular=true
        -> only active popular services

    Default:
        -> active + coming soon services
    """

    status_filter = (
        request.query_params.get("status")
        or "all"
    ).strip().lower()

    popular_filter = (
        request.query_params.get("popular")
        or ""
    ).strip().lower()

    # =========================================================
    # BASE QUERYSET
    # =========================================================

    services = ServiceCategory.objects.all()

    # =========================================================
    # POPULAR SERVICES
    # =========================================================

    if popular_filter in [
        "true",
        "1",
        "yes",
    ]:
        services = services.filter(
            status="active",
            is_popular=True,
        )

    # =========================================================
    # ACTIVE ONLY
    # =========================================================

    elif status_filter == "active":
        services = services.filter(
            status="active",
        )

    # =========================================================
    # ACTIVE + COMING SOON
    # =========================================================

    else:
        services = services.filter(
            status__in=[
                "active",
                "coming_soon",
            ]
        )

    # =========================================================
    # ORDERING
    # =========================================================

    services = services.order_by(
        "display_order",
        "name",
    )

    # =========================================================
    # RESPONSE DATA
    # =========================================================

    data = []

    for service in services:

        service_image = None

        if service.service_image:
            service_image = (
                request.build_absolute_uri(
                    service.service_image.url
                )
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
                "is_available": (
                    service.status == "active"
                ),
            }
        )

    return Response(
        {
            "success": True,
            "message": "Services fetched successfully.",
            "filters": {
                "status": status_filter,
                "popular": (
                    popular_filter
                    in [
                        "true",
                        "1",
                        "yes",
                    ]
                ),
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
    serialized = serializer.data

    return Response(
        {
            "success": True,
            "message": "Admin users fetched successfully.",
            "count": len(serialized),
            "data": serialized,
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

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageCustomers,
])
def customer_detail_api(request, customer_id):
    """
    Return one customer's complete admin-editable details.
    """

    customer = (
        User.objects
        .filter(
            id=customer_id,
            role="customer",
            is_staff=False,
            is_superuser=False,
        )
        .first()
    )

    if not customer:
        return Response(
            {
                "success": False,
                "message": "Customer not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "message": "Customer fetched successfully.",
            "data": {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "full_name": (
                    customer.get_full_name()
                    or customer.username
                ),
                "phone": customer.phone,
                "address": customer.address,
                "profile_picture": (
                    request.build_absolute_uri(
                        customer.profile_picture.url
                    )
                    if customer.profile_picture
                    else None
                ),
                "is_active": customer.is_active,
                "is_email_verified": (
                    customer.is_email_verified
                ),
                "date_joined": customer.date_joined,
                "last_login": customer.last_login,
                "addresses": [
                    {
                        "id": a.id,
                        "title": a.title,
                        "address_type": a.address_type,
                        "address": a.address,
                        "city": a.city,
                        "state": a.state,
                        "postal_code": a.postal_code,
                        "latitude": (
                            float(a.latitude)
                            if a.latitude is not None
                            else None
                        ),
                        "longitude": (
                            float(a.longitude)
                            if a.longitude is not None
                            else None
                        ),
                        "location_source": a.location_source,
                        "is_default": a.is_default,
                    }
                    for a in customer.addresses.all().order_by(
                        "-is_default", "-created_at",
                    )
                ],
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["PATCH"])
@permission_classes([
    IsAuthenticated,
    CanManageCustomers,
])
def update_customer_api(request, customer_id):
    """
    Update editable customer information.
    """

    customer = (
        User.objects
        .filter(
            id=customer_id,
            role="customer",
            is_staff=False,
            is_superuser=False,
        )
        .first()
    )

    if not customer:
        return Response(
            {
                "success": False,
                "message": "Customer not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------------------------------------------------------
    # USERNAME
    # ---------------------------------------------------------

    if "username" in request.data:

        username = (
            request.data.get("username")
            or ""
        ).strip()

        if not username:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Username cannot be empty."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            User.objects
            .filter(
                username__iexact=username
            )
            .exclude(
                id=customer.id
            )
            .exists()
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Username already exists."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer.username = username

    # ---------------------------------------------------------
    # EMAIL
    # ---------------------------------------------------------

    if "email" in request.data:

        email = (
            request.data.get("email")
            or ""
        ).strip().lower()

        if not email:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Email cannot be empty."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            User.objects
            .filter(
                email__iexact=email
            )
            .exclude(
                id=customer.id
            )
            .exists()
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Email already exists."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If admin changes customer email,
        # require re-verification.
        if email != customer.email.lower():
            customer.email = email
            customer.is_email_verified = False

    # ---------------------------------------------------------
    # BASIC PROFILE
    # ---------------------------------------------------------

    if "first_name" in request.data:
        customer.first_name = (
            request.data.get("first_name")
            or ""
        ).strip()

    if "last_name" in request.data:
        customer.last_name = (
            request.data.get("last_name")
            or ""
        ).strip()

    if "phone" in request.data:
        customer.phone = (
            request.data.get("phone")
            or ""
        ).strip()

    if "address" in request.data:
        customer.address = (
            request.data.get("address")
            or ""
        ).strip()

    # ---------------------------------------------------------
    # PROFILE PICTURE
    # ---------------------------------------------------------

    profile_picture = request.FILES.get(
        "profile_picture"
    )

    if profile_picture:
        customer.profile_picture = (
            profile_picture
        )

    # ---------------------------------------------------------
    # SAVE
    # ---------------------------------------------------------

    customer.save()

    # ---------------------------------------------------------
    # RESPONSE
    # ---------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": (
                "Customer updated successfully."
            ),
            "data": {
                "id": customer.id,
                "username": customer.username,
                "email": customer.email,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "full_name": (
                    customer.get_full_name()
                    or customer.username
                ),
                "phone": customer.phone,
                "address": customer.address,
                "profile_picture": (
                    request.build_absolute_uri(
                        customer.profile_picture.url
                    )
                    if customer.profile_picture
                    else None
                ),
                "is_active": customer.is_active,
                "is_email_verified": (
                    customer.is_email_verified
                ),
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def provider_detail_api(request, provider_id):
    """
    Return complete provider details for admin.

    Includes:
    - account/profile
    - operational status
    - current marketplace location
    - weekly availability
    - quotation performance
    - booking performance
    - reviews and rating
    - recent booking history
    """

    # =========================================================
    # PROVIDER
    # =========================================================

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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
    # PROVIDER PROFILE
    # =========================================================

    provider_profile = (
        ProviderProfile.objects
        .filter(provider=provider)
        .first()
    )

    # =========================================================
    # MARKETPLACE SETTINGS
    # =========================================================

    marketplace_settings = (
        MarketplaceLocationSettings.get_settings()
    )

    live_timeout_minutes = (
        marketplace_settings.live_location_timeout_minutes
    )

    # =========================================================
    # WEEKLY AVAILABILITY
    # =========================================================

    weekly_availability = {
        "monday": [],
        "tuesday": [],
        "wednesday": [],
        "thursday": [],
        "friday": [],
        "saturday": [],
        "sunday": [],
    }

    day_key_map = {
        0: "monday",
        1: "tuesday",
        2: "wednesday",
        3: "thursday",
        4: "friday",
        5: "saturday",
        6: "sunday",
    }

    total_availability_slots = 0
    active_availability_slots = 0

    if provider_profile:

        availability_slots = (
            ProviderAvailability.objects
            .filter(
                provider_profile=provider_profile
            )
            .order_by(
                "day_of_week",
                "start_time",
            )
        )

        for slot in availability_slots:

            day_key = day_key_map.get(
                slot.day_of_week
            )

            if day_key is None:
                continue

            total_availability_slots += 1

            if slot.is_available:
                active_availability_slots += 1

            weekly_availability[
                day_key
            ].append(
                {
                    "slot_id": slot.id,

                    "day_of_week": (
                        slot.day_of_week
                    ),

                    "day": (
                        slot.get_day_of_week_display()
                    ),

                    "start_time": (
                        slot.start_time
                    ),

                    "end_time": (
                        slot.end_time
                    ),

                    "is_available": (
                        slot.is_available
                    ),

                    "created_at": (
                        slot.created_at
                    ),

                    "updated_at": (
                        slot.updated_at
                    ),
                }
            )

    # =========================================================
    # QUOTES
    # ACTIVE FLOW
    # =========================================================

    quotes = Quote.objects.filter(
        provider=provider
    )

    total_quotes = quotes.count()

    pending_quotes = quotes.filter(
        status="pending"
    ).count()

    accepted_quotes = quotes.filter(
        status="accepted"
    ).count()

    rejected_quotes = quotes.filter(
        status="rejected"
    ).count()

    quote_acceptance_rate = 0

    if total_quotes > 0:
        quote_acceptance_rate = round(
            (
                accepted_quotes
                / total_quotes
            )
            * 100,
            2,
        )

    # =========================================================
    # BOOKINGS
    # ACTIVE FLOW
    # =========================================================

    bookings = Booking.objects.filter(
        provider=provider
    )

    total_bookings = bookings.count()

    assigned_bookings = bookings.filter(
        status="assigned"
    ).count()

    pending_bookings = bookings.filter(
        status="pending"
    ).count()

    in_progress_bookings = bookings.filter(
        status="in_progress"
    ).count()

    completed_bookings = bookings.filter(
        status="completed"
    ).count()

    cancelled_bookings = bookings.filter(
        status="cancelled"
    ).count()

    # =========================================================
    # BOOKING RATES
    # =========================================================

    completion_rate = 0
    cancellation_rate = 0

    if total_bookings > 0:

        completion_rate = round(
            (
                completed_bookings
                / total_bookings
            )
            * 100,
            2,
        )

        cancellation_rate = round(
            (
                cancelled_bookings
                / total_bookings
            )
            * 100,
            2,
        )

    # =========================================================
    # BOOKING VALUE
    # =========================================================

    booking_value_data = (
        bookings
        .exclude(
            status="cancelled"
        )
        .aggregate(
            total=Sum("final_price"),
            average=Avg("final_price"),
        )
    )

    total_booking_value = (
        booking_value_data["total"] or 0
    )

    average_booking_value = (
        booking_value_data["average"] or 0
    )

    completed_booking_value = (
        bookings
        .filter(
            status="completed"
        )
        .aggregate(
            total=Sum("final_price")
        )["total"]
        or 0
    )

    # =========================================================
    # REVIEWS
    # =========================================================

    reviews = Review.objects.filter(
        provider=provider
    )

    total_reviews = reviews.count()

    average_rating = (
        reviews.aggregate(
            average=Avg("rating")
        )["average"]
        or 0
    )

    average_rating = round(
        float(average_rating),
        2,
    )

    # =========================================================
    # OPERATIONAL / LOCATION STATUS
    # =========================================================

    profile_is_active = False
    is_online = False
    is_available = False

    current_latitude = None
    current_longitude = None
    current_location_text = ""
    location_source = None
    last_location_updated_at = None
    service_radius_km = None

    has_location = False

    live_location_is_fresh = False
    live_location_is_stale = False
    location_is_usable = False

    if provider_profile:

        # IMPORTANT:
        # Actual ProviderProfile field is is_profile_active.
        profile_is_active = (
            provider_profile.is_profile_active
        )

        is_online = (
            provider_profile.is_online
        )

        is_available = (
            provider_profile.is_available
        )

        current_latitude = (
            float(
                provider_profile.current_latitude
            )
            if provider_profile.current_latitude
            is not None
            else None
        )

        current_longitude = (
            float(
                provider_profile.current_longitude
            )
            if provider_profile.current_longitude
            is not None
            else None
        )

        current_location_text = (
            provider_profile.current_location_text
            or ""
        )

        location_source = (
            provider_profile.location_source
        )

        last_location_updated_at = (
            provider_profile.last_location_updated_at
        )

        service_radius_km = (
            float(
                provider_profile.service_radius_km
            )
            if provider_profile.service_radius_km
            is not None
            else None
        )

        has_location = (
            provider_profile.current_latitude
            is not None
            and
            provider_profile.current_longitude
            is not None
        )

        # =====================================================
        # MANUAL LOCATION
        # =====================================================

        if (
            has_location
            and
            location_source
            == ProviderProfile.LOCATION_SOURCE_MANUAL
        ):
            location_is_usable = True

        # =====================================================
        # LIVE LOCATION
        # =====================================================

        elif (
            has_location
            and
            location_source
            == ProviderProfile.LOCATION_SOURCE_LIVE
        ):

            if last_location_updated_at:

                expiry_time = (
                    last_location_updated_at
                    + timedelta(
                        minutes=live_timeout_minutes
                    )
                )

                live_location_is_fresh = (
                    timezone.now()
                    <= expiry_time
                )

                live_location_is_stale = (
                    not live_location_is_fresh
                )

                location_is_usable = (
                    live_location_is_fresh
                )

            else:
                live_location_is_stale = True

    # =========================================================
    # EFFECTIVE SERVICE RADIUS
    # =========================================================

    effective_service_radius_km = None

    if (
        provider_profile
        and
        provider_profile.service_radius_km
        is not None
    ):

        effective_service_radius_km = float(
            min(
                marketplace_settings
                .max_provider_radius_km,

                provider_profile
                .service_radius_km,
            )
        )

    # =========================================================
    # MARKETPLACE READY
    # =========================================================

    marketplace_ready = bool(
        provider.is_active
        and provider.is_approved
        and provider_profile
        and profile_is_active
        and is_online
        and is_available
        and location_is_usable
        and marketplace_settings
        .is_location_matching_enabled
    )

    # =========================================================
    # RECENT BOOKINGS
    # =========================================================

    recent_bookings_queryset = (
        bookings
        .select_related(
            "customer",
            "service_request",
        )
        .order_by(
            "-created_at"
        )[:10]
    )

    recent_bookings = []

    for booking in recent_bookings_queryset:

        recent_bookings.append(
            {
                "booking_id": booking.id,

                "service_request_id": (
                    booking.service_request_id
                ),

                "service_type": (
                    booking
                    .service_request
                    .service_type
                ),

                "customer": {
                    "id": booking.customer.id,

                    "username": (
                        booking.customer.username
                    ),

                    "full_name": (
                        booking.customer.get_full_name()
                        or booking.customer.username
                    ),

                    "email": (
                        booking.customer.email
                    ),
                },

                "final_price": (
                    booking.final_price
                ),

                "status": booking.status,

                "schedule": {
                    "date": (
                        booking.scheduled_date
                    ),

                    "start_time": (
                        booking.scheduled_start_time
                    ),

                    "end_time": (
                        booking.scheduled_end_time
                    ),
                },

                "created_at": (
                    booking.created_at
                ),

                "completed_at": (
                    booking.completed_at
                ),
            }
        )

    # =========================================================
    # RECENT REVIEWS
    # =========================================================

    recent_reviews_queryset = (
        reviews
        .select_related(
            "customer",
            "booking",
        )
        .order_by(
            "-created_at"
        )[:10]
    )

    recent_reviews = []

    for review in recent_reviews_queryset:

        recent_reviews.append(
            {
                "review_id": review.id,

                "booking_id": (
                    review.booking_id
                ),

                "customer": {
                    "id": review.customer.id,

                    "username": (
                        review.customer.username
                    ),

                    "full_name": (
                        review.customer.get_full_name()
                        or review.customer.username
                    ),
                },

                "rating": review.rating,

                "review": (
                    review.review or ""
                ),

                "created_at": (
                    review.created_at
                ),
            }
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Provider details fetched successfully."
            ),

            "data": {

                # =================================================
                # BASIC PROVIDER
                # =================================================

                "provider": {
                    "id": provider.id,

                    "username": provider.username,

                    "email": provider.email,

                    "first_name": (
                        provider.first_name
                    ),

                    "last_name": (
                        provider.last_name
                    ),

                    "full_name": (
                        provider.get_full_name()
                        or provider.username
                    ),

                    "phone": provider.phone,

                    "address": provider.address,

                    "role": provider.role,

                    "bio": provider.bio,

                    "experience_years": (
                        provider.experience_years
                    ),

                    "profile_picture": (
                        request.build_absolute_uri(
                            provider
                            .profile_picture
                            .url
                        )
                        if provider.profile_picture
                        else None
                    ),

                    "date_joined": (
                        provider.date_joined
                    ),

                    "last_login": (
                        provider.last_login
                    ),
                },

                # =================================================
                # ACCOUNT STATUS
                # =================================================

                "account_status": {
                    "is_email_verified": (
                        provider.is_email_verified
                    ),

                    "is_approved": (
                        provider.is_approved
                    ),

                    "is_verified": (
                        provider.is_verified
                    ),

                    "is_active": (
                        provider.is_active
                    ),

                    "status_note": (
                        provider.status_note or ""
                    ),

                    "deactivate_reason": (
                        provider.deactivate_reason
                        or ""
                    ),
                },

                # =================================================
                # OPERATIONAL STATUS
                # =================================================

                "operational_status": {
                    "has_provider_profile": bool(
                        provider_profile
                    ),

                    "profile_is_active": (
                        profile_is_active
                    ),

                    "is_online": (
                        is_online
                    ),

                    "is_available": (
                        is_available
                    ),

                    "marketplace_ready": (
                        marketplace_ready
                    ),
                },

                # =================================================
                # LOCATION
                # =================================================

                "location": {
                    "has_location": (
                        has_location
                    ),

                    "latitude": (
                        current_latitude
                    ),

                    "longitude": (
                        current_longitude
                    ),

                    "location_text": (
                        current_location_text
                    ),

                    "location_source": (
                        location_source
                    ),

                    "last_location_updated_at": (
                        last_location_updated_at
                    ),

                    "live_location_timeout_minutes": (
                        live_timeout_minutes
                    ),

                    "live_location_is_fresh": (
                        live_location_is_fresh
                    ),

                    "live_location_is_stale": (
                        live_location_is_stale
                    ),

                    "location_is_usable": (
                        location_is_usable
                    ),

                    "service_radius_km": (
                        service_radius_km
                    ),

                    "admin_max_radius_km": float(
                        marketplace_settings
                        .max_provider_radius_km
                    ),

                    "effective_service_radius_km": (
                        effective_service_radius_km
                    ),
                },

                # =================================================
                # WEEKLY AVAILABILITY
                # =================================================

                "availability": {
                    "total_slots": (
                        total_availability_slots
                    ),

                    "active_slots": (
                        active_availability_slots
                    ),

                    "has_availability": (
                        active_availability_slots > 0
                    ),

                    "weekly_schedule": (
                        weekly_availability
                    ),
                },

                # =================================================
                # PERFORMANCE
                # =================================================

                "performance": {

                    "quotes": {
                        "total": (
                            total_quotes
                        ),

                        "pending": (
                            pending_quotes
                        ),

                        "accepted": (
                            accepted_quotes
                        ),

                        "rejected": (
                            rejected_quotes
                        ),

                        "acceptance_rate": (
                            quote_acceptance_rate
                        ),
                    },

                    "bookings": {
                        "total": (
                            total_bookings
                        ),

                        "assigned": (
                            assigned_bookings
                        ),

                        "pending": (
                            pending_bookings
                        ),

                        "in_progress": (
                            in_progress_bookings
                        ),

                        "completed": (
                            completed_bookings
                        ),

                        "cancelled": (
                            cancelled_bookings
                        ),

                        "completion_rate": (
                            completion_rate
                        ),

                        "cancellation_rate": (
                            cancellation_rate
                        ),
                    },

                    "booking_value": {
                        "total": (
                            total_booking_value
                        ),

                        "completed": (
                            completed_booking_value
                        ),

                        "average": (
                            average_booking_value
                        ),
                    },

                    "reviews": {
                        "total": (
                            total_reviews
                        ),

                        "average_rating": (
                            average_rating
                        ),
                    },
                },

                # =================================================
                # HISTORY
                # =================================================

                "recent_bookings": (
                    recent_bookings
                ),

                "recent_reviews": (
                    recent_reviews
                ),
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["PATCH"])
@permission_classes([
    IsAuthenticated,
    CanManageProviders,
])
def update_provider_api(request, provider_id):
    """
    Allow an authorized admin to edit provider data.
    """

    provider = (
        User.objects
        .filter(
            id=provider_id,
            role__in=provider_role_keys(),
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
    # USERNAME
    # =========================================================

    if "username" in request.data:

        username = (
            request.data.get("username")
            or ""
        ).strip()

        if not username:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Username cannot be empty."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            User.objects
            .filter(
                username__iexact=username
            )
            .exclude(id=provider.id)
            .exists()
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Username already exists."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider.username = username

    # =========================================================
    # EMAIL
    # =========================================================

    if "email" in request.data:

        email = (
            request.data.get("email")
            or ""
        ).strip().lower()

        if not email:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Email cannot be empty."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            User.objects
            .filter(
                email__iexact=email
            )
            .exclude(id=provider.id)
            .exists()
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Email already exists."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if email != provider.email.lower():

            provider.email = email

            # New email must be verified again.
            provider.is_email_verified = False

    # =========================================================
    # BASIC PROFILE
    # =========================================================

    if "first_name" in request.data:
        provider.first_name = (
            request.data.get("first_name")
            or ""
        ).strip()

    if "last_name" in request.data:
        provider.last_name = (
            request.data.get("last_name")
            or ""
        ).strip()

    if "phone" in request.data:
        provider.phone = (
            request.data.get("phone")
            or ""
        ).strip()

    if "address" in request.data:
        provider.address = (
            request.data.get("address")
            or ""
        ).strip()

    if "bio" in request.data:
        provider.bio = (
            request.data.get("bio")
            or ""
        ).strip()

    # =========================================================
    # EXPERIENCE
    # =========================================================

    if "experience_years" in request.data:

        experience_years = request.data.get(
            "experience_years"
        )

        if experience_years in [
            "",
            None,
        ]:
            provider.experience_years = None

        else:
            try:
                experience_years = int(
                    experience_years
                )
            except (TypeError, ValueError):
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Experience years must "
                            "be a valid number."
                        ),
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

            if experience_years < 0:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Experience years cannot "
                            "be negative."
                        ),
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

            provider.experience_years = (
                experience_years
            )

    # =========================================================
    # PROFILE PICTURE
    # =========================================================

    profile_picture = request.FILES.get(
        "profile_picture"
    )

    if profile_picture:
        provider.profile_picture = (
            profile_picture
        )

    # =========================================================
    # SAVE
    # =========================================================

    provider.save()

    return Response(
        {
            "success": True,
            "message": (
                "Provider updated successfully."
            ),
            "data": {
                "id": provider.id,
                "username": provider.username,
                "email": provider.email,

                "first_name": provider.first_name,
                "last_name": provider.last_name,

                "full_name": (
                    provider.get_full_name()
                    or provider.username
                ),

                "phone": provider.phone,
                "address": provider.address,

                "role": provider.role,

                "bio": provider.bio,

                "experience_years": (
                    provider.experience_years
                ),

                "profile_picture": (
                    request.build_absolute_uri(
                        provider.profile_picture.url
                    )
                    if provider.profile_picture
                    else None
                ),

                "is_email_verified": (
                    provider.is_email_verified
                ),

                "is_approved": provider.is_approved,
                "is_verified": provider.is_verified,
                "is_active": provider.is_active,
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanViewReports,
])
def service_performance_api(request):
    """
    Return performance analytics for marketplace services.

    Uses ACTIVE marketplace flow:
        ServiceRequest -> Quote -> Booking -> Review

    Supports:
        ?period=7d
        ?period=30d
        ?period=6m
        ?period=1y
        ?from=YYYY-MM-DD
        ?to=YYYY-MM-DD
        ?service=plumber
    """

    # =========================================================
    # FILTERS
    # =========================================================

    dashboard_filters = get_dashboard_filters(
        request
    )

    start_date = dashboard_filters.get(
        "start_date"
    )

    end_date = dashboard_filters.get(
        "end_date"
    )

    service_filter = dashboard_filters.get(
        "service"
    )

    # =========================================================
    # SERVICE CATEGORIES
    # =========================================================

    services = (
        ServiceCategory.objects
        .all()
        .order_by(
            "display_order",
            "name",
        )
    )

    if service_filter:
        services = services.filter(
            key__iexact=service_filter
        )

    data = []

    # =========================================================
    # SERVICE PERFORMANCE
    # =========================================================

    for service in services:

        service_key = service.key

        # =====================================================
        # REQUESTS
        # ACTIVE ServiceRequest uses service_type
        # =====================================================

        requests_queryset = (
            ServiceRequest.objects
            .filter(
                service_type__iexact=service_key
            )
        )

        if start_date:
            requests_queryset = (
                requests_queryset.filter(
                    created_at__date__gte=start_date
                )
            )

        if end_date:
            requests_queryset = (
                requests_queryset.filter(
                    created_at__date__lte=end_date
                )
            )

        total_requests = (
            requests_queryset.count()
        )

        # =====================================================
        # REQUEST STATUS BREAKDOWN
        # =====================================================

        pending_requests = (
            requests_queryset
            .filter(
                status="pending"
            )
            .count()
        )

        quotation_received_requests = (
            requests_queryset
            .filter(
                status="quotation_received"
            )
            .count()
        )

        assigned_requests = (
            requests_queryset
            .filter(
                status="assigned"
            )
            .count()
        )

        in_progress_requests = (
            requests_queryset
            .filter(
                status="in_progress"
            )
            .count()
        )

        # =====================================================
        # QUOTATIONS
        # ACTIVE Quote
        # =====================================================

        quotations_queryset = (
            Quote.objects
            .filter(
                service_request__service_type__iexact=(
                    service_key
                )
            )
        )

        if start_date:
            quotations_queryset = (
                quotations_queryset.filter(
                    created_at__date__gte=start_date
                )
            )

        if end_date:
            quotations_queryset = (
                quotations_queryset.filter(
                    created_at__date__lte=end_date
                )
            )

        total_quotations = (
            quotations_queryset.count()
        )

        pending_quotations = (
            quotations_queryset
            .filter(
                status="pending"
            )
            .count()
        )

        accepted_quotations = (
            quotations_queryset
            .filter(
                status="accepted"
            )
            .count()
        )

        rejected_quotations = (
            quotations_queryset
            .filter(
                status="rejected"
            )
            .count()
        )

        # =====================================================
        # BOOKINGS
        # ACTIVE Booking
        # =====================================================

        bookings_queryset = (
            Booking.objects
            .filter(
                service_request__service_type__iexact=(
                    service_key
                )
            )
        )

        if start_date:
            bookings_queryset = (
                bookings_queryset.filter(
                    created_at__date__gte=start_date
                )
            )

        if end_date:
            bookings_queryset = (
                bookings_queryset.filter(
                    created_at__date__lte=end_date
                )
            )

        total_bookings = (
            bookings_queryset.count()
        )

        assigned_bookings = (
            bookings_queryset
            .filter(
                status="assigned"
            )
            .count()
        )

        pending_bookings = (
            bookings_queryset
            .filter(
                status="pending"
            )
            .count()
        )

        in_progress_bookings = (
            bookings_queryset
            .filter(
                status="in_progress"
            )
            .count()
        )

        completed_jobs = (
            bookings_queryset
            .filter(
                status="completed"
            )
            .count()
        )

        cancelled_jobs = (
            bookings_queryset
            .filter(
                status="cancelled"
            )
            .count()
        )

        # =====================================================
        # BOOKING VALUE
        # =====================================================

        booking_value_result = (
            bookings_queryset
            .exclude(
                status="cancelled"
            )
            .aggregate(
                total=Sum("final_price"),
                average=Avg("final_price"),
            )
        )

        total_booking_value = (
            booking_value_result["total"]
            or 0
        )

        average_booking_value = (
            booking_value_result["average"]
            or 0
        )

        completed_booking_value = (
            bookings_queryset
            .filter(
                status="completed"
            )
            .aggregate(
                total=Sum("final_price")
            )["total"]
            or 0
        )

        # =====================================================
        # REVIEWS
        # ACTIVE Review
        # =====================================================

        reviews_queryset = (
            Review.objects
            .filter(
                booking__service_request__service_type__iexact=(
                    service_key
                )
            )
        )

        if start_date:
            reviews_queryset = (
                reviews_queryset.filter(
                    created_at__date__gte=start_date
                )
            )

        if end_date:
            reviews_queryset = (
                reviews_queryset.filter(
                    created_at__date__lte=end_date
                )
            )

        total_reviews = (
            reviews_queryset.count()
        )

        rating_result = (
            reviews_queryset.aggregate(
                average=Avg("rating")
            )
        )

        average_rating = (
            rating_result["average"]
            or 0
        )

        average_rating = round(
            float(average_rating),
            2,
        )

        # =====================================================
        # REQUEST -> BOOKING CONVERSION
        # =====================================================

        conversion_rate = 0

        if total_requests > 0:
            conversion_rate = round(
                (
                    total_bookings
                    / total_requests
                )
                * 100,
                2,
            )

        # =====================================================
        # QUOTATION ACCEPTANCE RATE
        # =====================================================

        quotation_acceptance_rate = 0

        if total_quotations > 0:
            quotation_acceptance_rate = round(
                (
                    accepted_quotations
                    / total_quotations
                )
                * 100,
                2,
            )

        # =====================================================
        # COMPLETION RATE
        # =====================================================

        completion_rate = 0

        if total_bookings > 0:
            completion_rate = round(
                (
                    completed_jobs
                    / total_bookings
                )
                * 100,
                2,
            )

        # =====================================================
        # CANCELLATION RATE
        # =====================================================

        cancellation_rate = 0

        if total_bookings > 0:
            cancellation_rate = round(
                (
                    cancelled_jobs
                    / total_bookings
                )
                * 100,
                2,
            )

        # =====================================================
        # AVERAGE QUOTES PER REQUEST
        # =====================================================

        average_quotes_per_request = 0

        if total_requests > 0:
            average_quotes_per_request = round(
                total_quotations
                / total_requests,
                2,
            )

        # =====================================================
        # RESPONSE ITEM
        # =====================================================

        data.append(
            {
                # ---------------------------------------------
                # SERVICE
                # ---------------------------------------------

                "service_id": service.id,
                "service_name": service.name,
                "service_key": service.key,
                "status": service.status,
                "is_popular": service.is_popular,

                # ---------------------------------------------
                # REQUESTS
                # ---------------------------------------------

                "total_requests": (
                    total_requests
                ),

                "requests": {
                    "total": total_requests,

                    "pending": (
                        pending_requests
                    ),

                    "quotation_received": (
                        quotation_received_requests
                    ),

                    "assigned": (
                        assigned_requests
                    ),

                    "in_progress": (
                        in_progress_requests
                    ),
                },

                # ---------------------------------------------
                # QUOTATIONS
                # Keep existing top-level fields
                # ---------------------------------------------

                "total_quotations": (
                    total_quotations
                ),

                "accepted_quotations": (
                    accepted_quotations
                ),

                "quotation_acceptance_rate": (
                    quotation_acceptance_rate
                ),

                "quotations": {
                    "total": (
                        total_quotations
                    ),

                    "pending": (
                        pending_quotations
                    ),

                    "accepted": (
                        accepted_quotations
                    ),

                    "rejected": (
                        rejected_quotations
                    ),

                    "acceptance_rate": (
                        quotation_acceptance_rate
                    ),

                    "average_per_request": (
                        average_quotes_per_request
                    ),
                },

                # ---------------------------------------------
                # BOOKINGS
                # Keep existing top-level fields
                # ---------------------------------------------

                "total_bookings": (
                    total_bookings
                ),

                "completed_jobs": (
                    completed_jobs
                ),

                "cancelled_jobs": (
                    cancelled_jobs
                ),

                "completion_rate": (
                    completion_rate
                ),

                "cancellation_rate": (
                    cancellation_rate
                ),

                "bookings": {
                    "total": (
                        total_bookings
                    ),

                    "assigned": (
                        assigned_bookings
                    ),

                    "pending": (
                        pending_bookings
                    ),

                    "in_progress": (
                        in_progress_bookings
                    ),

                    "completed": (
                        completed_jobs
                    ),

                    "cancelled": (
                        cancelled_jobs
                    ),

                    "completion_rate": (
                        completion_rate
                    ),

                    "cancellation_rate": (
                        cancellation_rate
                    ),
                },

                # ---------------------------------------------
                # VALUE
                # ---------------------------------------------

                "total_booking_value": (
                    total_booking_value
                ),

                "booking_value": {
                    "total": (
                        total_booking_value
                    ),

                    "completed": (
                        completed_booking_value
                    ),

                    "average": (
                        average_booking_value
                    ),
                },

                # ---------------------------------------------
                # REVIEWS
                # ---------------------------------------------

                "total_reviews": (
                    total_reviews
                ),

                "average_rating": (
                    average_rating
                ),

                "reviews": {
                    "total": (
                        total_reviews
                    ),

                    "average_rating": (
                        average_rating
                    ),
                },

                # ---------------------------------------------
                # CONVERSION
                # ---------------------------------------------

                "conversion_rate": (
                    conversion_rate
                ),
            }
        )

    # =========================================================
    # RANK SERVICES
    # =========================================================

    data.sort(
        key=lambda item: (
            item["total_bookings"],
            float(
                item["total_booking_value"]
            ),
            item["average_rating"],
        ),
        reverse=True,
    )

    for index, item in enumerate(
        data,
        start=1,
    ):
        item["rank"] = index

    # =========================================================
    # OVERALL SUMMARY
    # =========================================================

    overall_total_requests = sum(
        item["total_requests"]
        for item in data
    )

    overall_total_quotes = sum(
        item["total_quotations"]
        for item in data
    )

    overall_total_bookings = sum(
        item["total_bookings"]
        for item in data
    )

    overall_completed_jobs = sum(
        item["completed_jobs"]
        for item in data
    )

    overall_cancelled_jobs = sum(
        item["cancelled_jobs"]
        for item in data
    )

    overall_booking_value = sum(
        (
            item["total_booking_value"]
            for item in data
        ),
        0,
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Service performance analytics "
                "fetched successfully."
            ),

            "filters": {
                "period": (
                    dashboard_filters["period"]
                ),

                "from": (
                    dashboard_filters[
                        "start_date"
                    ]
                ),

                "to": (
                    dashboard_filters[
                        "end_date"
                    ]
                ),

                "service": (
                    dashboard_filters["service"]
                ),
            },

            "summary": {
                "total_services": (
                    len(data)
                ),

                "total_requests": (
                    overall_total_requests
                ),

                "total_quotations": (
                    overall_total_quotes
                ),

                "total_bookings": (
                    overall_total_bookings
                ),

                "completed_jobs": (
                    overall_completed_jobs
                ),

                "cancelled_jobs": (
                    overall_cancelled_jobs
                ),

                "total_booking_value": (
                    overall_booking_value
                ),
            },

            "count": len(data),

            "services": data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanViewReports,
])
def service_request_funnel_api(request):
    """
    Marketplace conversion funnel.

    Supports:
        ?period=7d
        ?period=30d
        ?period=6m
        ?period=1y
        ?from=YYYY-MM-DD
        ?to=YYYY-MM-DD
        ?service=plumber
    """

    dashboard_filters = get_dashboard_filters(
        request
    )

    # We calculate stage statuses ourselves.
    analytics_filters = {
        **dashboard_filters,
        "status": None,
        "provider_id": None,
    }

    # =========================================================
    # REQUESTS
    # =========================================================

    requests_queryset = filter_service_requests(
        CustomerServiceRequest.objects.all(),
        analytics_filters,
    )

    total_requests = requests_queryset.count()

    request_ids = requests_queryset.values_list(
        "id",
        flat=True,
    )

    # =========================================================
    # QUOTED REQUESTS
    # =========================================================
    # Count requests that received at least one quotation,
    # not the total number of quotations.

    quoted_requests = (
        ProviderQuotation.objects
        .filter(
            service_request_id__in=request_ids
        )
        .values(
            "service_request_id"
        )
        .distinct()
        .count()
    )

    # =========================================================
    # ACCEPTED / BOOKED REQUESTS
    # =========================================================
    # A booking represents a request that successfully
    # progressed beyond quotation selection.

    booking_queryset = (
        ServiceBooking.objects
        .filter(
            service_request_id__in=request_ids
        )
    )

    accepted_requests = (
        booking_queryset
        .values(
            "service_request_id"
        )
        .distinct()
        .count()
    )

    # =========================================================
    # IN-PROGRESS REQUESTS
    # =========================================================

    in_progress_requests = (
        booking_queryset
        .filter(
            status="in_progress"
        )
        .values(
            "service_request_id"
        )
        .distinct()
        .count()
    )

    # =========================================================
    # COMPLETED REQUESTS
    # =========================================================

    completed_requests = (
        booking_queryset
        .filter(
            status="completed"
        )
        .values(
            "service_request_id"
        )
        .distinct()
        .count()
    )

    # =========================================================
    # CANCELLED REQUESTS
    # =========================================================

    cancelled_requests = (
        booking_queryset
        .filter(
            status="cancelled"
        )
        .values(
            "service_request_id"
        )
        .distinct()
        .count()
    )

    # =========================================================
    # HELPER FUNCTIONS
    # =========================================================

    def percentage(value, total):
        if total <= 0:
            return 0

        return round(
            (value / total) * 100,
            2,
        )

    def drop_off(previous, current):
        if previous <= 0:
            return 0

        return round(
            (
                (previous - current)
                / previous
            )
            * 100,
            2,
        )

    # =========================================================
    # FUNNEL
    # =========================================================

    funnel = [
        {
            "stage": "requests",
            "label": "Requests",
            "count": total_requests,
            "overall_conversion_rate": 100.0,
            "previous_stage_conversion_rate": 100.0,
            "drop_off_rate": 0,
        },
        {
            "stage": "quoted",
            "label": "Quoted",
            "count": quoted_requests,
            "overall_conversion_rate": percentage(
                quoted_requests,
                total_requests,
            ),
            "previous_stage_conversion_rate": percentage(
                quoted_requests,
                total_requests,
            ),
            "drop_off_rate": drop_off(
                total_requests,
                quoted_requests,
            ),
        },
        {
            "stage": "accepted",
            "label": "Accepted / Booked",
            "count": accepted_requests,
            "overall_conversion_rate": percentage(
                accepted_requests,
                total_requests,
            ),
            "previous_stage_conversion_rate": percentage(
                accepted_requests,
                quoted_requests,
            ),
            "drop_off_rate": drop_off(
                quoted_requests,
                accepted_requests,
            ),
        },
        {
            "stage": "in_progress",
            "label": "In Progress",
            "count": in_progress_requests,
            "overall_conversion_rate": percentage(
                in_progress_requests,
                total_requests,
            ),
            "previous_stage_conversion_rate": percentage(
                in_progress_requests,
                accepted_requests,
            ),
            "drop_off_rate": drop_off(
                accepted_requests,
                in_progress_requests,
            ),
        },
        {
            "stage": "completed",
            "label": "Completed",
            "count": completed_requests,
            "overall_conversion_rate": percentage(
                completed_requests,
                total_requests,
            ),
            "previous_stage_conversion_rate": percentage(
                completed_requests,
                in_progress_requests,
            ),
            "drop_off_rate": drop_off(
                in_progress_requests,
                completed_requests,
            ),
        },
    ]

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": (
                "Service request funnel "
                "fetched successfully."
            ),

            "filters": {
                "period": dashboard_filters["period"],
                "from": dashboard_filters["start_date"],
                "to": dashboard_filters["end_date"],
                "service": dashboard_filters["service"],
            },

            "summary": {
                "total_requests": total_requests,
                "quoted_requests": quoted_requests,
                "accepted_requests": accepted_requests,
                "in_progress_requests": in_progress_requests,
                "completed_requests": completed_requests,
                "cancelled_requests": cancelled_requests,

                "request_to_booking_rate": percentage(
                    accepted_requests,
                    total_requests,
                ),

                "request_to_completion_rate": percentage(
                    completed_requests,
                    total_requests,
                ),
            },

            "funnel": funnel,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanViewReports,
])
def customer_analytics_api(request):
    """
    Customer analytics for the admin dashboard.

    Supports:
        ?period=7d
        ?period=30d
        ?period=6m
        ?period=1y
        ?from=YYYY-MM-DD
        ?to=YYYY-MM-DD
        ?service=plumber
    """

    dashboard_filters = get_dashboard_filters(
        request
    )

    analytics_filters = {
        **dashboard_filters,
        "status": None,
        "provider_id": None,
    }

    # =========================================================
    # ALL CUSTOMERS
    # =========================================================

    customers = (
        User.objects
        .filter(
            role="customer",
            is_staff=False,
            is_superuser=False,
        )
    )

    total_customers = customers.count()

    active_customers = (
        customers
        .filter(
            is_active=True
        )
        .count()
    )

    inactive_customers = (
        customers
        .filter(
            is_active=False
        )
        .count()
    )

    # =========================================================
    # NEW CUSTOMERS IN SELECTED PERIOD
    # =========================================================

    start_date = dashboard_filters.get(
        "start_date"
    )

    end_date = dashboard_filters.get(
        "end_date"
    )

    new_customers_queryset = customers

    if start_date:
        new_customers_queryset = (
            new_customers_queryset
            .filter(
                date_joined__date__gte=start_date
            )
        )

    if end_date:
        new_customers_queryset = (
            new_customers_queryset
            .filter(
                date_joined__date__lte=end_date
            )
        )

    new_customers = (
        new_customers_queryset.count()
    )

    # =========================================================
    # FILTERED BOOKINGS
    # =========================================================

    bookings = (
        filter_service_bookings(
            ServiceBooking.objects.all(),
            analytics_filters,
        )
    )

    # =========================================================
    # CUSTOMERS WITH BOOKINGS
    # =========================================================

    customer_ids_with_bookings = (
        bookings
        .values_list(
            "customer_id",
            flat=True,
        )
        .distinct()
    )

    customers_with_bookings = (
        customers
        .filter(
            id__in=customer_ids_with_bookings
        )
        .count()
    )

    customers_with_no_bookings = (
        total_customers
        - customers_with_bookings
    )

    # =========================================================
    # REPEAT CUSTOMERS
    # =========================================================
    # Repeat customer = customer with at least 2 bookings
    # in the selected analytics period.

    repeat_customer_rows = (
        bookings
        .values(
            "customer_id"
        )
        .annotate(
            booking_count=Count("id")
        )
        .filter(
            booking_count__gte=2
        )
    )

    repeat_customers = (
        repeat_customer_rows.count()
    )

    # =========================================================
    # REPEAT BOOKING RATE
    # =========================================================

    repeat_booking_rate = 0

    if customers_with_bookings > 0:
        repeat_booking_rate = round(
            (
                repeat_customers
                / customers_with_bookings
            )
            * 100,
            2,
        )

    # =========================================================
    # CUSTOMER BOOKING ANALYTICS
    # =========================================================

    customer_booking_data = (
        bookings
        .values(
            "customer_id"
        )
        .annotate(
            total_bookings=Count(
                "id"
            ),

            completed_bookings=Count(
                "id",
                filter=Q(
                    status="completed"
                ),
            ),

            cancelled_bookings=Count(
                "id",
                filter=Q(
                    status="cancelled"
                ),
            ),

            total_spend=Sum(
                "final_price",
                filter=~Q(
                    status="cancelled"
                ),
            ),

            average_booking_value=Avg(
                "final_price",
                filter=~Q(
                    status="cancelled"
                ),
            ),
        )
    )

    # =========================================================
    # BUILD TOP CUSTOMER DATA
    # =========================================================

    customer_map = {
        customer.id: customer
        for customer in customers
    }

    top_customers = []

    for item in customer_booking_data:

        customer = customer_map.get(
            item["customer_id"]
        )

        if not customer:
            continue

        total_spend = (
            item["total_spend"]
            or 0
        )

        average_booking_value = (
            item["average_booking_value"]
            or 0
        )

        top_customers.append(
            {
                "customer_id": customer.id,

                "username": (
                    customer.username
                ),

                "full_name": (
                    customer.get_full_name()
                    or customer.username
                ),

                "email": customer.email,

                "phone": customer.phone,

                "is_active": (
                    customer.is_active
                ),

                "profile_picture": (
                    request.build_absolute_uri(
                        customer.profile_picture.url
                    )
                    if customer.profile_picture
                    else None
                ),

                "total_bookings": (
                    item["total_bookings"]
                ),

                "completed_bookings": (
                    item["completed_bookings"]
                ),

                "cancelled_bookings": (
                    item["cancelled_bookings"]
                ),

                "total_spend": (
                    total_spend
                ),

                "average_booking_value": (
                    average_booking_value
                ),
            }
        )

    # =========================================================
    # RANK TOP CUSTOMERS
    # =========================================================

    top_customers.sort(
        key=lambda item: (
            float(item["total_spend"]),
            item["total_bookings"],
        ),
        reverse=True,
    )

    for index, customer in enumerate(
        top_customers,
        start=1,
    ):
        customer["rank"] = index

    # Keep dashboard response manageable.
    top_customers = top_customers[:10]

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Customer analytics "
                "fetched successfully."
            ),

            "filters": {
                "period": (
                    dashboard_filters[
                        "period"
                    ]
                ),

                "from": (
                    dashboard_filters[
                        "start_date"
                    ]
                ),

                "to": (
                    dashboard_filters[
                        "end_date"
                    ]
                ),

                "service": (
                    dashboard_filters[
                        "service"
                    ]
                ),
            },

            "summary": {
                "total_customers": (
                    total_customers
                ),

                "active_customers": (
                    active_customers
                ),

                "inactive_customers": (
                    inactive_customers
                ),

                "new_customers": (
                    new_customers
                ),

                "customers_with_bookings": (
                    customers_with_bookings
                ),

                "customers_with_no_bookings": (
                    customers_with_no_bookings
                ),

                "repeat_customers": (
                    repeat_customers
                ),

                "repeat_booking_rate": (
                    repeat_booking_rate
                ),
            },

            "top_customers": (
                top_customers
            ),
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([
    IsAuthenticated,
    CanViewReports,
])
def geographic_analytics_api(request):
    """
    Geographic marketplace demand analytics.

    Supports:
        ?period=7d
        ?period=30d
        ?period=6m
        ?period=1y
        ?from=YYYY-MM-DD
        ?to=YYYY-MM-DD
        ?service=plumber

    Returns:
        - demand by city/state
        - completed/cancelled requests
        - unique customers
        - top service per area
        - map points for frontend heatmaps
    """

    # =========================================================
    # FILTERS
    # =========================================================

    dashboard_filters = get_dashboard_filters(
        request
    )

    analytics_filters = {
        **dashboard_filters,
        "status": None,
        "provider_id": None,
    }

    # =========================================================
    # FILTERED SERVICE REQUESTS
    # =========================================================

    service_requests = (
        filter_service_requests(
            CustomerServiceRequest.objects
            .select_related(
                "category",
                "customer",
            ),
            analytics_filters,
        )
    )

    # Ignore records without useful geographic information.
    geographic_requests = (
        service_requests
        .exclude(
            city=""
        )
    )

    # =========================================================
    # GENERAL SUMMARY
    # =========================================================

    total_requests = (
        geographic_requests.count()
    )

    total_cities = (
        geographic_requests
        .values(
            "city",
            "state",
        )
        .distinct()
        .count()
    )

    total_states = (
        geographic_requests
        .values(
            "state"
        )
        .exclude(
            state=""
        )
        .distinct()
        .count()
    )

    # =========================================================
    # DEMAND BY CITY
    # =========================================================

    city_rows = (
        geographic_requests
        .values(
            "city",
            "state",
        )
        .annotate(
            total_requests=Count(
                "id"
            ),

            unique_customers=Count(
                "customer_id",
                distinct=True,
            ),

            completed_requests=Count(
                "id",
                filter=Q(
                    status="completed"
                ),
            ),

            cancelled_requests=Count(
                "id",
                filter=Q(
                    status="cancelled"
                ),
            ),

            urgent_requests=Count(
                "id",
                filter=Q(
                    urgency="urgent"
                ),
            ),

            emergency_requests=Count(
                "id",
                filter=Q(
                    urgency="emergency"
                ),
            ),
        )
        .order_by(
            "-total_requests"
        )
    )

    # =========================================================
    # BUILD CITY ANALYTICS
    # =========================================================

    cities = []

    for city_row in city_rows:

        city_name = city_row["city"]
        state_name = city_row["state"]

        # -----------------------------------------------------
        # FIND TOP SERVICE IN THIS CITY
        # -----------------------------------------------------

        city_service_data = (
            geographic_requests
            .filter(
                city=city_name,
                state=state_name,
            )
            .values(
                "category__id",
                "category__name",
                "category__key",
            )
            .annotate(
                request_count=Count(
                    "id"
                )
            )
            .order_by(
                "-request_count"
            )
            .first()
        )

        top_service = None

        if city_service_data:
            top_service = {
                "service_id": (
                    city_service_data[
                        "category__id"
                    ]
                ),

                "service_name": (
                    city_service_data[
                        "category__name"
                    ]
                ),

                "service_key": (
                    city_service_data[
                        "category__key"
                    ]
                ),

                "request_count": (
                    city_service_data[
                        "request_count"
                    ]
                ),
            }

        # -----------------------------------------------------
        # COMPLETION RATE
        # -----------------------------------------------------

        completion_rate = 0

        if city_row["total_requests"] > 0:
            completion_rate = round(
                (
                    city_row[
                        "completed_requests"
                    ]
                    / city_row[
                        "total_requests"
                    ]
                )
                * 100,
                2,
            )

        # -----------------------------------------------------
        # CANCELLATION RATE
        # -----------------------------------------------------

        cancellation_rate = 0

        if city_row["total_requests"] > 0:
            cancellation_rate = round(
                (
                    city_row[
                        "cancelled_requests"
                    ]
                    / city_row[
                        "total_requests"
                    ]
                )
                * 100,
                2,
            )

        cities.append(
            {
                "city": city_name,
                "state": state_name,

                "total_requests": (
                    city_row[
                        "total_requests"
                    ]
                ),

                "unique_customers": (
                    city_row[
                        "unique_customers"
                    ]
                ),

                "completed_requests": (
                    city_row[
                        "completed_requests"
                    ]
                ),

                "cancelled_requests": (
                    city_row[
                        "cancelled_requests"
                    ]
                ),

                "urgent_requests": (
                    city_row[
                        "urgent_requests"
                    ]
                ),

                "emergency_requests": (
                    city_row[
                        "emergency_requests"
                    ]
                ),

                "completion_rate": (
                    completion_rate
                ),

                "cancellation_rate": (
                    cancellation_rate
                ),

                "top_service": (
                    top_service
                ),
            }
        )

    # =========================================================
    # DEMAND BY STATE
    # =========================================================

    states = list(
        geographic_requests
        .exclude(
            state=""
        )
        .values(
            "state"
        )
        .annotate(
            total_requests=Count(
                "id"
            ),

            unique_customers=Count(
                "customer_id",
                distinct=True,
            ),
        )
        .order_by(
            "-total_requests"
        )
    )

    # =========================================================
    # MAP / HEATMAP POINTS
    # =========================================================
    #
    # Frontend can use these points for:
    # - heatmap
    # - markers
    # - demand visualization
    #

    map_queryset = (
        geographic_requests
        .exclude(
            latitude__isnull=True
        )
        .exclude(
            longitude__isnull=True
        )
    )

    map_points = []

    for item in map_queryset:

        map_points.append(
            {
                "request_id": str(
                    item.id
                ),

                "latitude": float(
                    item.latitude
                ),

                "longitude": float(
                    item.longitude
                ),

                "city": item.city,

                "state": item.state,

                "postal_code": (
                    item.postal_code
                ),

                "service": {
                    "id": (
                        item.category.id
                    ),

                    "name": (
                        item.category.name
                    ),

                    "key": (
                        item.category.key
                    ),
                },

                "status": item.status,

                "urgency": item.urgency,
            }
        )

    # =========================================================
    # TOP DEMAND LOCATION
    # =========================================================

    top_location = None

    if cities:
        top_location = cities[0]

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Geographic analytics "
                "fetched successfully."
            ),

            "filters": {
                "period": (
                    dashboard_filters[
                        "period"
                    ]
                ),

                "from": (
                    dashboard_filters[
                        "start_date"
                    ]
                ),

                "to": (
                    dashboard_filters[
                        "end_date"
                    ]
                ),

                "service": (
                    dashboard_filters[
                        "service"
                    ]
                ),
            },

            "summary": {
                "total_requests": (
                    total_requests
                ),

                "total_cities": (
                    total_cities
                ),

                "total_states": (
                    total_states
                ),

                "map_points": (
                    len(map_points)
                ),

                "top_demand_location": (
                    top_location
                ),
            },

            "cities": cities,

            "states": states,

            "map_points": map_points,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def admin_login_api(request):
    """
    Login endpoint exclusively for Marketplace admins.

    Allowed:
    - Staff Admin
    - Super Admin

    Rejected:
    - Customer
    - Provider
    """

    email = str(
        request.data.get("email", "")
    ).strip().lower()

    password = str(
        request.data.get("password", "")
    )

    # =========================================================
    # VALIDATE INPUT
    # =========================================================

    if not email or not password:
        return Response(
            {
                "success": False,
                "message": "Email and password are required.",
                "code": "EMAIL_PASSWORD_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # FIND USER
    # =========================================================

    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        user_record = User.objects.get(
            email__iexact=email
        )

    except User.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Invalid email or password.",
                "code": "INVALID_CREDENTIALS",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    except User.MultipleObjectsReturned:
        return Response(
            {
                "success": False,
                "message": (
                    "Unable to login with this account."
                ),
                "code": "MULTIPLE_ACCOUNTS_FOUND",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # BLOCK NON-ADMIN ACCOUNTS
    # =========================================================
    #
    # Customer and Provider accounts must use:
    # /api/accounts/login/
    # =========================================================

    if not (
        user_record.is_staff
        or user_record.is_superuser
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "Customer and provider accounts cannot "
                    "log in through the admin login."
                ),
                "code": "MARKETPLACE_LOGIN_NOT_ALLOWED",
                "data": {
                    "next_step": "marketplace_login",
                },
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # AUTHENTICATE ADMIN
    # =========================================================

    user = authenticate(
        request=request,
        username=user_record.username,
        password=password,
    )

    if user is None:
        return Response(
            {
                "success": False,
                "message": "Invalid email or password.",
                "code": "INVALID_CREDENTIALS",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # =========================================================
    # ACTIVE ACCOUNT CHECK
    # =========================================================

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": (
                    "This admin account is inactive."
                ),
                "code": "ADMIN_ACCOUNT_INACTIVE",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # DETERMINE ADMIN TYPE
    # =========================================================

    admin_type = (
        "super_admin"
        if user.is_superuser
        else "admin"
    )

    # =========================================================
    # TOKEN
    # =========================================================

    token, _ = Token.objects.get_or_create(
        user=user
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": "Admin login successful.",
            "token": token.key,
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
                "admin_type": admin_type,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            },
            "redirect_url": "/admin/dashboard",
        },
        status=status.HTTP_200_OK,
    )