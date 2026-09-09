from asyncio.log import logger
from datetime import datetime, timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework.response import Response
from rest_framework import status

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from providers.models import ProviderProfile
from service_requests.models import ServiceBooking

from .models import (
    ServiceRequest,
    Booking,
    Quote,
    Review,
    Notification,
)

from accounts.models import (
    User,
    CustomerAddress
)

from accounts.helpers import (
    active_service_keys,
    is_active_service_key,
    is_provider_role,
    provider_access_ok,
    provider_profile_payload,
    provider_rating,
    user_base_payload,
)

import json

from django.core.paginator import Paginator
from django.db.models import Exists, OuterRef


# =========================================
# HELPERS
# =========================================
def is_customer(user):
    return user.role == "customer"


def is_provider(user):
    return is_provider_role(user.role)


def is_approved_provider(user):
    return (
        is_provider_role(user.role)
        and user.is_active
        and user.is_approved
    )


def get_service_request_or_404(id):

    try:
        return ServiceRequest.objects.get(id=id)

    except ServiceRequest.DoesNotExist:
        return None


def get_quote_or_404(id, service_request):

    if not service_request:
        return None

    try:
        return Quote.objects.get(
            id=id,
            service_request=service_request
        )

    except Quote.DoesNotExist:
        return None


def get_booking_or_404(id):

    try:
        return Booking.objects.get(id=id)

    except Booking.DoesNotExist:
        return None


def service_request_address_text(sr):
    if sr.customer_address_id:
        return sr.customer_address.address
    if isinstance(sr.address, str):
        return sr.address
    return ""


def parse_polygon_points(raw):
    if raw is None or raw == "":
        return None
    if isinstance(raw, (list, dict)):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return None


# =========================================
# REALTIME NOTIFICATION
# =========================================
def notify(user, title, message):

    Notification.objects.create(
        user=user,
        title=title,
        message=message
    )

    try:

        channel_layer = get_channel_layer()

        if channel_layer is not None:

            async_to_sync(
                channel_layer.group_send
            )(
                f"user_{user.id}",
                {
                    "type": "send_notification",
                    "title": title,
                    "message": message,
                },
            )

    except Exception:
        pass

import logging

from decimal import Decimal, InvalidOperation

from django.db import transaction
from providers.services.matching import (
    find_matching_providers,
)

# =========================================
# CREATE SERVICE REQUEST
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_service_request(request):

    # =========================================================
    # CUSTOMER ONLY
    # =========================================================

    if not is_customer(request.user):

        return Response(
            {
                "success": False,
                "message": "Only customers allowed",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data

    # =========================================================
    # PREFERRED SERVICE SCHEDULE
    # =========================================================
    #
    # Schedule is OPTIONAL.
    #
    # Valid:
    #   - all three omitted
    #   - date + start + end provided
    #
    # Invalid:
    #   - only some schedule fields provided
    # =========================================================

    preferred_date_raw = data.get(
        "preferred_date"
    )

    preferred_start_time_raw = data.get(
        "preferred_start_time"
    )

    preferred_end_time_raw = data.get(
        "preferred_end_time"
    )

    schedule_values = [
        preferred_date_raw,
        preferred_start_time_raw,
        preferred_end_time_raw,
    ]

    has_any_schedule = any(
        schedule_values
    )

    has_complete_schedule = all(
        schedule_values
    )

    if (
        has_any_schedule
        and not has_complete_schedule
    ):

        return Response(
            {
                "success": False,
                "message": (
                    "preferred_date, "
                    "preferred_start_time and "
                    "preferred_end_time must all "
                    "be provided together."
                ),
                "code": (
                    "INCOMPLETE_PREFERRED_SCHEDULE"
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    preferred_date = None
    preferred_start_time = None
    preferred_end_time = None

    # =========================================================
    # VALIDATE PREFERRED SCHEDULE
    # =========================================================

    if has_complete_schedule:

        # -----------------------------------------------------
        # DATE
        # -----------------------------------------------------

        try:
            preferred_date = datetime.strptime(
                str(preferred_date_raw),
                "%Y-%m-%d",
            ).date()

        except (
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Invalid preferred_date. "
                        "Use YYYY-MM-DD."
                    ),
                    "code": (
                        "INVALID_PREFERRED_DATE"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -----------------------------------------------------
        # START + END TIME
        # -----------------------------------------------------

        try:
            preferred_start_time = (
                datetime.strptime(
                    str(
                        preferred_start_time_raw
                    ),
                    "%H:%M",
                ).time()
            )

            preferred_end_time = (
                datetime.strptime(
                    str(
                        preferred_end_time_raw
                    ),
                    "%H:%M",
                ).time()
            )

        except (
            TypeError,
            ValueError,
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Invalid preferred time. "
                        "Use HH:MM."
                    ),
                    "code": (
                        "INVALID_PREFERRED_TIME"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -----------------------------------------------------
        # TIME RANGE
        # -----------------------------------------------------

        if (
            preferred_end_time
            <= preferred_start_time
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "preferred_end_time must "
                        "be after "
                        "preferred_start_time."
                    ),
                    "code": (
                        "INVALID_PREFERRED_TIME_RANGE"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -----------------------------------------------------
        # PAST DATE
        # -----------------------------------------------------

        today = timezone.localdate()

        if preferred_date < today:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Preferred service date "
                        "cannot be in the past."
                    ),
                    "code": (
                        "PAST_PREFERRED_DATE"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -----------------------------------------------------
        # PAST TIME TODAY
        # -----------------------------------------------------

        if preferred_date == today:

            current_time = (
                timezone.localtime()
                .time()
                .replace(
                    second=0,
                    microsecond=0,
                )
            )

            if (
                preferred_start_time
                <= current_time
            ):

                return Response(
                    {
                        "success": False,
                        "message": (
                            "Preferred service time "
                            "cannot be in the past."
                        ),
                        "code": (
                            "PAST_PREFERRED_TIME"
                        ),
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

    # =========================================================
    # SERVICE TYPE
    # =========================================================

    service_type = (
        data.get("service_type")
        or ""
    ).strip().lower()

    if not service_type:

        return Response(
            {
                "success": False,
                "message": "service_type is required",
                "code": "SERVICE_TYPE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not is_active_service_key(
        service_type
    ):

        return Response(
            {
                "success": False,
                "message": "Invalid service type",
                "code": "INVALID_SERVICE_TYPE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # LOCATION MODE
    # =========================================================
    #
    # Customer can create request using:
    #
    # 1. saved_address_id / address_id
    #
    # OR
    #
    # 2. direct/current location:
    #    address
    #    latitude
    #    longitude
    #
    # Location is copied into ServiceRequest.
    # Future CustomerAddress changes therefore do not move
    # an already-created service request.
    # =========================================================

    saved_address_id = (
        data.get("saved_address_id")
        or data.get("address_id")
    )

    direct_address = (
        data.get("address")
        or ""
    ).strip()

    latitude_raw = (
        data.get("latitude")
        if "latitude" in data
        else data.get("lat")
    )

    longitude_raw = (
        data.get("longitude")
        if "longitude" in data
        else data.get("lon")
    )

    customer_address = None

    service_address = ""
    service_latitude = None
    service_longitude = None

    location_source = None

    # =========================================================
    # OPTION A — SAVED ADDRESS
    # =========================================================

    if saved_address_id:

        try:
            customer_address = (
                CustomerAddress.objects.get(
                    id=saved_address_id,
                    customer=request.user,
                )
            )

        except (
            CustomerAddress.DoesNotExist,
            ValueError,
            TypeError,
        ):

            return Response(
                {
                    "success": False,
                    "message": "Address not found",
                    "code": "ADDRESS_NOT_FOUND",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            customer_address.latitude is None
            or customer_address.longitude is None
        ):

            return Response(
                {
                    "success": False,
                    "message": (
                        "Selected address does not have "
                        "valid location coordinates."
                    ),
                    "code": (
                        "ADDRESS_COORDINATES_REQUIRED"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        service_address = (
            customer_address.address
        )

        service_latitude = (
            customer_address.latitude
        )

        service_longitude = (
            customer_address.longitude
        )

        location_source = "saved_address"

    # =========================================================
    # OPTION B — DIRECT/CURRENT LOCATION
    # =========================================================

    else:

        if not direct_address:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Provide saved_address_id "
                        "or a service address."
                    ),
                    "code": (
                        "SERVICE_LOCATION_REQUIRED"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            latitude_raw is None
            or longitude_raw is None
        ):

            return Response(
                {
                    "success": False,
                    "message": (
                        "latitude and longitude are "
                        "required for the service location."
                    ),
                    "code": (
                        "SERVICE_COORDINATES_REQUIRED"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service_latitude = Decimal(
                str(latitude_raw)
            )

            service_longitude = Decimal(
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

        # -----------------------------------------------------
        # LATITUDE RANGE
        # -----------------------------------------------------

        if not (
            Decimal("-90")
            <= service_latitude
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

        # -----------------------------------------------------
        # LONGITUDE RANGE
        # -----------------------------------------------------

        if not (
            Decimal("-180")
            <= service_longitude
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

        service_address = direct_address

        location_source = "direct"

    # =========================================================
    # CREATE SERVICE REQUEST
    # =========================================================

    sr = ServiceRequest.objects.create(
        customer=request.user,

        service_type=service_type,

        # -----------------------------------------------------
        # CUSTOMER PREFERRED SCHEDULE
        # -----------------------------------------------------

        preferred_date=preferred_date,

        preferred_start_time=(
            preferred_start_time
        ),

        preferred_end_time=(
            preferred_end_time
        ),

        # -----------------------------------------------------
        # SAVED ADDRESS REFERENCE
        # -----------------------------------------------------

        customer_address=customer_address,

        # -----------------------------------------------------
        # IMMUTABLE SERVICE LOCATION SNAPSHOT
        # -----------------------------------------------------

        address=service_address,

        lat=service_latitude,

        lon=service_longitude,

        # -----------------------------------------------------
        # SERVICE DETAILS
        # -----------------------------------------------------

        lawn_area=data.get(
            "lawn_area"
        ),

        polygon_points=parse_polygon_points(
            data.get("polygon_points")
        ),

        description=data.get(
            "description"
        ),

        image=request.FILES.get(
            "image"
        ),

        status="pending",
    )

    # =========================================================
    # FIND MATCHING PROVIDERS
    # =========================================================
    #
    # Matching now considers:
    #
    # - provider approved
    # - provider active
    # - provider online
    # - provider available
    # - requested service
    # - current provider location
    # - live location freshness
    # - effective geographical radius
    #
    # When preferred schedule is supplied:
    #
    # - weekly availability
    # - existing booking conflicts
    #
    # =========================================================

    matched_providers = []

    try:

        matched_providers = (
            find_matching_providers(
                sr
            )
        )

    except Exception:

        # Request creation should not be lost merely because
        # matching or provider notification fails.

        logger.exception(
            "Provider matching failed for "
            "service request %s",
            sr.id,
        )

    # =========================================================
    # NOTIFY ONLY MATCHED PROVIDERS
    # =========================================================

    notified_provider_ids = set()

    for match in matched_providers:

        provider_profile = (
            match.get(
                "provider_profile"
            )
        )

        if not provider_profile:
            continue

        provider = (
            provider_profile.provider
        )

        if (
            provider.id
            in notified_provider_ids
        ):
            continue

        notify(
            provider,
            "New Service Request",
            (
                f"New {service_type} "
                f"job available"
            ),
        )

        notified_provider_ids.add(
            provider.id
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Service request created successfully."
            ),

            "request_id": sr.id,

            # -------------------------------------------------
            # PREFERRED SCHEDULE
            # -------------------------------------------------

            "preferred_schedule": {
                "date": (
                    sr.preferred_date
                ),
                "start_time": (
                    sr.preferred_start_time
                ),
                "end_time": (
                    sr.preferred_end_time
                ),
            },

            # -------------------------------------------------
            # LOCATION
            # -------------------------------------------------

            "location": {
                "source": location_source,

                "saved_address_id": (
                    customer_address.id
                    if customer_address
                    else None
                ),

                "address": sr.address,

                "latitude": (
                    float(sr.lat)
                    if sr.lat is not None
                    else None
                ),

                "longitude": (
                    float(sr.lon)
                    if sr.lon is not None
                    else None
                ),
            },

            # -------------------------------------------------
            # MATCHING RESULT
            # -------------------------------------------------

            "matched_provider_count": len(
                matched_providers
            ),

            "notified_provider_count": len(
                notified_provider_ids
            ),
        },
        status=status.HTTP_201_CREATED,
    )


# =========================================
# PROVIDER LEADS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_leads(request):

    ok, message = provider_access_ok(request.user)
    if not ok:
        return Response(
            {"success": False, "message": message},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not request.user.is_approved:

        return Response(
            {
                "success": False,
                "message": "Your provider account is pending admin approval"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    my_quote = Quote.objects.filter(
        service_request_id=OuterRef("pk"),
        provider_id=request.user.id,
    )

    leads = (
        ServiceRequest.objects.filter(
            service_type=request.user.role,
            is_booked=False,
            selected_provider__isnull=True,
            status="pending"
        )
        .select_related("customer")
        .annotate(
            has_quoted=Exists(my_quote)
        )
        .order_by("-created_at")
    )

    return Response({
        "success": True,
        "leads": [
            {
                "id": lead.id,
                "customer": lead.customer.username,
                "customer_id": lead.customer.id,

                "customer_profile_picture": (
                    request.build_absolute_uri(lead.customer.profile_picture.url)
                    if lead.customer.profile_picture else None
                ),

                "address": service_request_address_text(lead),
                "lat": lead.lat,
                "lon": lead.lon,

                "lawn_area": (
                    lead.lawn_area
                    if lead.service_type == "gardener"
                    else None
                ),

                "polygon_points": (
                    lead.polygon_points
                    if lead.service_type == "gardener"
                    else None
                ),

                "description": lead.description,

                "image": (
                    request.build_absolute_uri(lead.image.url)
                    if lead.image else None
                ),

                "status": lead.status if lead.status else "pending",
                "has_quoted": lead.has_quoted,

                "preferred_date": lead.preferred_date,
                "preferred_start_time": lead.preferred_start_time,
                "preferred_end_time": lead.preferred_end_time,
            }
            for lead in leads
        ]
    })
# =========================================
# SEND QUOTE
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_quote(request):

    ok, message = provider_access_ok(request.user)
    if not ok:
        return Response(
            {"success": False, "message": message},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not request.user.is_approved:

        return Response(
            {
                "success": False,
                "message": "Your provider account is pending admin approval"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    service_request_id = request.data.get(
        "service_request_id"
    )

    price = request.data.get("price")

    sr = get_service_request_or_404(
        service_request_id
    )

    if not sr:

        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # Prevent duplicate quote
    if Quote.objects.filter(
        service_request=sr,
        provider=request.user
    ).exists():

        return Response(
            {
                "success": False,
                "message": "Quote already submitted"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    quote = Quote.objects.create(

        service_request=sr,

        provider=request.user,

        price=price,

        message=request.data.get("message")
    )

    sr.status = "quotation_received"
    sr.save()

    notify(
        sr.customer,
        "New Quote Received",
        f"{request.user.username} sent a quote of ₹{price}"
    )

    return Response(
        {
            "success": True,
            "quote_id": quote.id
        },
        status=status.HTTP_201_CREATED
    )


# =========================================
# VIEW QUOTES
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_quotes(request, request_id):

    sr = get_service_request_or_404(
        request_id
    )

    if not sr:

        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if sr.customer != request.user:

        return Response(
            {
                "success": False,
                "message": "Unauthorized"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    quotes = Quote.objects.filter(
        service_request=sr
    )

    quotes_data = []

    for q in quotes:

        profile = provider_profile_payload(
            q.provider,
            request
        )

        quotes_data.append({
            "id": q.id,
            "price": q.price,
            "message": q.message,
            "status": q.status,
            **profile,
        })

    return Response({
        "success": True,
        "quotes": quotes_data
    })


# =========================================
# SELECT PROVIDER
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def select_provider(request):

    # =========================================================
    # VALIDATE REQUEST ID
    # =========================================================

    service_request_id = request.data.get(
        "service_request_id"
    )

    quote_id = request.data.get(
        "quote_id"
    )

    if not service_request_id:

        return Response(
            {
                "success": False,
                "message": "service_request_id is required",
                "code": "SERVICE_REQUEST_ID_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not quote_id:

        return Response(
            {
                "success": False,
                "message": "quote_id is required",
                "code": "QUOTE_ID_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # LOCK SERVICE REQUEST
    # =========================================================
    #
    # Prevent two quotations from being accepted for the same
    # request at the same time.
    # =========================================================

    try:

        sr = (
            ServiceRequest.objects
            .select_for_update()
            .get(id=service_request_id)
        )

    except (
        ServiceRequest.DoesNotExist,
        ValueError,
        TypeError,
    ):

        return Response(
            {
                "success": False,
                "message": "Service request not found",
                "code": "SERVICE_REQUEST_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # CUSTOMER OWNERSHIP
    # =========================================================

    if sr.customer_id != request.user.id:

        return Response(
            {
                "success": False,
                "message": (
                    "You cannot select a provider "
                    "for this service request."
                ),
                "code": "NOT_SERVICE_REQUEST_OWNER",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # ALREADY BOOKED
    # =========================================================

    if sr.is_booked:

        return Response(
            {
                "success": False,
                "message": "Already booked",
                "code": "SERVICE_REQUEST_ALREADY_BOOKED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # GET SELECTED QUOTE
    # =========================================================

    try:

        quote = (
            Quote.objects
            .select_related("provider")
            .get(
                id=quote_id,
                service_request=sr,
            )
        )

    except (
        Quote.DoesNotExist,
        ValueError,
        TypeError,
    ):

        return Response(
            {
                "success": False,
                "message": "Quote not found",
                "code": "QUOTE_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    try:

        provider_profile = (
            ProviderProfile.objects
            .select_for_update()
            .get(
                provider=quote.provider
            )
        )

    except ProviderProfile.DoesNotExist:

        return Response(
            {
                "success": False,
                "message": (
                    "Selected provider profile "
                    "was not found."
                ),
                "code": "PROVIDER_PROFILE_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # FINAL PROVIDER ELIGIBILITY CHECK
    # =========================================================
    #
    # A provider may have been eligible when the request was
    # created but become unavailable before quote acceptance.
    # Use the same central matching engine again.
    # =========================================================

    try:

        current_matches = (
            find_matching_providers(sr)
        )

    except Exception:

        logger.exception(
            "Provider re-matching failed while "
            "selecting quote %s for request %s",
            quote.id,
            sr.id,
        )

        return Response(
            {
                "success": False,
                "message": (
                    "Unable to verify provider "
                    "availability right now."
                ),
                "code": (
                    "PROVIDER_AVAILABILITY_CHECK_FAILED"
                ),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    selected_provider_is_eligible = any(
        match.get("provider_profile")
        and match["provider_profile"].id
        == provider_profile.id
        for match in current_matches
    )

    if not selected_provider_is_eligible:

        return Response(
            {
                "success": False,
                "message": (
                    "The selected provider is no longer "
                    "available for this service request."
                ),
                "code": "PROVIDER_NO_LONGER_AVAILABLE",
            },
            status=status.HTTP_409_CONFLICT,
        )

    # =========================================================
    # FINAL BOOKING CONFLICT CHECK
    # =========================================================
    #
    # Only needed when the customer supplied a preferred
    # schedule.
    # =========================================================

    if (
        sr.preferred_date
        and sr.preferred_start_time
        and sr.preferred_end_time
    ):

        booking_conflict = (
            Booking.objects
            .filter(
                provider=quote.provider,
                scheduled_date=sr.preferred_date,
                status__in=[
                    "assigned",
                    "pending",
                    "in_progress",
                ],
                scheduled_start_time__lt=(
                    sr.preferred_end_time
                ),
                scheduled_end_time__gt=(
                    sr.preferred_start_time
                ),
            )
            .exists()
        )

        if booking_conflict:

            return Response(
                {
                    "success": False,
                    "message": (
                        "The selected provider already has "
                        "another booking during this time."
                    ),
                    "code": "PROVIDER_BOOKING_CONFLICT",
                },
                status=status.HTTP_409_CONFLICT,
            )

    # =========================================================
    # CREATE BOOKING
    # =========================================================
    #
    # Copy the customer's preferred schedule into the booking.
    # This becomes the booking's schedule snapshot.
    # =========================================================

    booking = Booking.objects.create(
        service_request=sr,
        customer=request.user,
        provider=quote.provider,
        quote=quote,
        final_price=quote.price,

        scheduled_date=sr.preferred_date,

        scheduled_start_time=(
            sr.preferred_start_time
        ),

        scheduled_end_time=(
            sr.preferred_end_time
        ),

        status="assigned",
    )

    # =========================================================
    # UPDATE SERVICE REQUEST
    # =========================================================

    sr.is_booked = True
    sr.status = "assigned"
    sr.selected_provider = quote.provider

    sr.save(
        update_fields=[
            "is_booked",
            "status",
            "selected_provider",
            "updated_at",
        ]
    )

    # =========================================================
    # ACCEPT SELECTED QUOTE
    # =========================================================

    quote.status = "accepted"

    quote.save(
        update_fields=[
            "status",
        ]
    )

    # =========================================================
    # REJECT OTHER QUOTES
    # =========================================================

    Quote.objects.filter(
        service_request=sr
    ).exclude(
        id=quote.id
    ).update(
        status="rejected"
    )

    # =========================================================
    # NOTIFY PROVIDER
    # =========================================================

    notify(
        quote.provider,
        "You Got a Job",
        f"You were selected for {sr.service_type}",
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": "Provider selected successfully.",

            "booking_id": booking.id,

            "service_request_id": sr.id,

            "status": booking.status,

            "schedule": {
                "date": booking.scheduled_date,
                "start_time": (
                    booking.scheduled_start_time
                ),
                "end_time": (
                    booking.scheduled_end_time
                ),
            },

            "provider": {
                "id": quote.provider.id,
                "username": quote.provider.username,

                "profile_picture": (
                    request.build_absolute_uri(
                        quote.provider
                        .profile_picture.url
                    )
                    if quote.provider.profile_picture
                    else None
                ),
            },

            "customer": {
                "id": request.user.id,
                "username": request.user.username,

                "profile_picture": (
                    request.build_absolute_uri(
                        request.user
                        .profile_picture.url
                    )
                    if request.user.profile_picture
                    else None
                ),
            },
        },
        status=status.HTTP_201_CREATED,
    )


# =========================================
# MY BOOKINGS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_bookings(request):

    review_exists = Review.objects.filter(
        booking_id=OuterRef("pk"),
        customer_id=OuterRef("customer_id"),
    )

    if request.user.role == "customer":
        bookings = Booking.objects.filter(customer=request.user)
    else:
        bookings = Booking.objects.filter(provider=request.user)

    bookings = (
        bookings
        .select_related("service_request", "customer", "provider")
        .annotate(has_review=Exists(review_exists))
        .order_by("-created_at")
    )

    return Response({
        "success": True,
        "bookings": [
            {
                "id": booking.id,
                "service_type": booking.service_request.service_type,

                "customer": booking.customer.username,
                "customer_id": booking.customer_id,
                "customer_profile_picture": (
                    request.build_absolute_uri(booking.customer.profile_picture.url)
                    if booking.customer.profile_picture else None
                ),

                "provider": booking.provider.username,
                "provider_id": booking.provider_id,
                "provider_profile_picture": (
                    request.build_absolute_uri(booking.provider.profile_picture.url)
                    if booking.provider.profile_picture else None
                ),

                "final_price": booking.final_price,
                "status": booking.status,
                "created_at": booking.created_at,

                "scheduled_date": booking.scheduled_date,
                "scheduled_start_time": booking.scheduled_start_time,
                "scheduled_end_time": booking.scheduled_end_time,

                "address": service_request_address_text(booking.service_request),
                "lat": booking.service_request.lat,
                "lon": booking.service_request.lon,
                "lawn_area": booking.service_request.lawn_area,
                "polygon_points": booking.service_request.polygon_points,

                "has_review": booking.has_review,
            }
            for booking in bookings
        ]
    })


# =========================================
# MY REQUESTS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_requests(request):

    if request.user.role != "customer":

        return Response(
            {
                "success": False,
                "message": "Only customers allowed"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    page = int(
        request.GET.get("page", 1)
    )

    page_size = int(
        request.GET.get("page_size", 10)
    )

    requests_queryset = ServiceRequest.objects.filter(
        customer=request.user
    ).order_by("-created_at")

    booked_count = requests_queryset.filter(is_booked=True).count()

    paginator = Paginator(
        requests_queryset,
        page_size
    )

    current_page = paginator.get_page(page)

    requests_data = []

    for req in current_page:

        booking = Booking.objects.filter(
            service_request=req
        ).first()

        row = {
            "id": req.id,
            "service_type": req.service_type,
            "address": service_request_address_text(req),
            "lat": req.lat,
            "lon": req.lon,
            "lawn_area": req.lawn_area,
            "polygon_points": req.polygon_points,
            "description": req.description,
            "status": req.status,
            "is_booked": req.is_booked,
            "booking_id": booking.id if booking else None,
            "booking_status": booking.status if booking else None,
            "created_at": req.created_at,

            "customer_id": req.customer.id,
            "customer": req.customer.username,
            "customer_profile_picture": (
                request.build_absolute_uri(req.customer.profile_picture.url)
                if req.customer.profile_picture else None
            ),

            "provider_id": None,
            "provider": None,
            "provider_email": None,
            "provider_phone": None,
            "provider_address": None,
            "provider_profile_picture": None,
            "average_rating": None,
            "total_reviews": None,
        }

        if booking:
            row.update(
                provider_profile_payload(
                    booking.provider,
                    request
                )
            )

        elif req.selected_provider_id:
            row.update(
                provider_profile_payload(
                    req.selected_provider,
                    request
                )
            )

        requests_data.append(row)

    return Response({
        "success": True,
        "page": page,
        "page_size": page_size,
        "total": paginator.count,
        "total_pages": paginator.num_pages,
        "requests": requests_data
    })


# =========================================
# GET NOTIFICATIONS
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_notifications(request):

    notifications = Notification.objects.filter(
        user=request.user
    ).order_by("-created_at")

    unread = notifications.filter(is_read=False).count()

    return Response({
        "success": True,
        "unread_count": unread,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifications
        ],
    })


# =========================================
# MARK NOTIFICATIONS READ
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):

    Notification.objects.filter(
        user=request.user,
        is_read=False,
    ).update(is_read=True)

    return Response({
        "success": True,
        "unread_count": 0,
    })


# =========================================
# UPDATE BOOKING STATUS
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_booking_status(request):
    """
    Update a ServiceBooking status.

    Provider transitions:

        accepted
            -> scheduled
            -> cancelled

        scheduled
            -> in_progress
            -> cancelled

        in_progress
            -> completed

    Customer:

        accepted
            -> cancelled

        scheduled
            -> cancelled

    Terminal statuses:

        completed
        cancelled
    """

    user = request.user

    # =========================================================
    # INPUT
    # =========================================================

    booking_id = request.data.get(
        "booking_id"
    )

    new_status = (
        request.data.get("status")
        or ""
    ).strip().lower()

    cancellation_reason = (
        request.data.get(
            "cancellation_reason"
        )
        or ""
    ).strip()

    if not booking_id:
        return Response(
            {
                "success": False,
                "message": "booking_id is required.",
                "code": "BOOKING_ID_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not new_status:
        return Response(
            {
                "success": False,
                "message": "status is required.",
                "code": "STATUS_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # VALID BOOKING STATUSES
    # =========================================================

    valid_statuses = {
        "accepted",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
    }

    if new_status not in valid_statuses:
        return Response(
            {
                "success": False,
                "message": "Invalid booking status.",
                "code": "INVALID_BOOKING_STATUS",
                "allowed_statuses": [
                    "accepted",
                    "scheduled",
                    "in_progress",
                    "completed",
                    "cancelled",
                ],
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # GET + LOCK BOOKING
    # =========================================================

    booking = (
        ServiceBooking.objects
        .select_for_update()
        .select_related(
            "customer",
            "provider_profile",
            "provider_profile__provider",
            "service_request",
            "quotation",
        )
        .filter(
            id=booking_id
        )
        .first()
    )

    if not booking:
        return Response(
            {
                "success": False,
                "message": "Booking not found.",
                "code": "BOOKING_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # TERMINAL STATUS
    # =========================================================

    if booking.status == "completed":
        return Response(
            {
                "success": False,
                "message": (
                    "Completed booking cannot "
                    "be changed."
                ),
                "code": "BOOKING_ALREADY_COMPLETED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if booking.status == "cancelled":
        return Response(
            {
                "success": False,
                "message": (
                    "Booking is already cancelled."
                ),
                "code": "BOOKING_ALREADY_CANCELLED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # IDENTIFY ACTOR
    # =========================================================

    provider_profile = getattr(
        user,
        "provider_profile",
        None,
    )

    is_booking_provider = (
        provider_profile is not None
        and booking.provider_profile_id
        == provider_profile.id
    )

    is_booking_customer = (
        booking.customer_id
        == user.id
    )

    if not (
        is_booking_provider
        or is_booking_customer
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "You are not authorized to "
                    "update this booking."
                ),
                "code": "UNAUTHORIZED_BOOKING_ACCESS",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # PROVIDER FLOW
    # =========================================================

    if is_booking_provider:

        if not user.is_active:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Your provider account "
                        "is inactive."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_approved:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Your provider account is "
                        "pending admin approval."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed_provider_transitions = {
            "accepted": {
                "scheduled",
                "cancelled",
            },
            "scheduled": {
                "in_progress",
                "cancelled",
            },
            "in_progress": {
                "completed",
            },
            "completed": set(),
            "cancelled": set(),
        }

        allowed_next_statuses = (
            allowed_provider_transitions.get(
                booking.status,
                set(),
            )
        )

        if new_status not in allowed_next_statuses:
            return Response(
                {
                    "success": False,
                    "message": (
                        f"Cannot change booking from "
                        f"{booking.status} to "
                        f"{new_status}."
                    ),
                    "code": "INVALID_STATUS_TRANSITION",
                    "current_status": booking.status,
                    "allowed_next_statuses": sorted(
                        allowed_next_statuses
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -----------------------------------------------------
        # PROVIDER CANCELLATION
        # -----------------------------------------------------

        if new_status == "cancelled":

            if not cancellation_reason:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "cancellation_reason is "
                            "required when cancelling "
                            "a booking."
                        ),
                        "code": (
                            "CANCELLATION_REASON_REQUIRED"
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            booking.status = "cancelled"

            booking.cancellation_reason = (
                cancellation_reason
            )

            booking.save(
                update_fields=[
                    "status",
                    "cancellation_reason",
                    "updated_at",
                ]
            )

            notify(
                booking.customer,
                "Booking Cancelled",
                (
                    "Your service provider cancelled "
                    "the booking. Reason: "
                    f"{cancellation_reason}"
                ),
            )

            return Response(
                {
                    "success": True,
                    "message": (
                        "Booking cancelled successfully."
                    ),
                    "booking_id": booking.id,
                    "status": booking.status,
                    "cancellation_reason": (
                        booking.cancellation_reason
                    ),
                },
                status=status.HTTP_200_OK,
            )

        # -----------------------------------------------------
        # NORMAL PROVIDER STATUS UPDATE
        # -----------------------------------------------------

        booking.status = new_status

        update_fields = [
            "status",
            "updated_at",
        ]

        if new_status == "completed":

            booking.completed_at = (
                timezone.now()
            )

            update_fields.append(
                "completed_at"
            )

        booking.save(
            update_fields=update_fields
        )

        notify(
            booking.customer,
            "Booking Update",
            (
                f"Your job is now "
                f"{new_status.replace('_', ' ')}."
            ),
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Booking status updated "
                    "successfully."
                ),
                "booking_id": booking.id,
                "previous_status": (
                    booking.status
                    if False
                    else None
                ),
                "status": booking.status,
                "completed_at": (
                    booking.completed_at
                    if booking.status == "completed"
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # CUSTOMER FLOW
    # =========================================================

    if is_booking_customer:

        if new_status != "cancelled":
            return Response(
                {
                    "success": False,
                    "message": (
                        "Customers can only cancel "
                        "bookings."
                    ),
                    "code": (
                        "CUSTOMER_STATUS_CHANGE_NOT_ALLOWED"
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        customer_cancellable_statuses = {
            "accepted",
            "scheduled",
        }

        if (
            booking.status
            not in customer_cancellable_statuses
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Booking cannot be cancelled "
                        "at its current stage."
                    ),
                    "code": (
                        "BOOKING_CANNOT_BE_CANCELLED"
                    ),
                    "current_status": booking.status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not cancellation_reason:
            return Response(
                {
                    "success": False,
                    "message": (
                        "cancellation_reason is "
                        "required when cancelling "
                        "a booking."
                    ),
                    "code": (
                        "CANCELLATION_REASON_REQUIRED"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = "cancelled"

        booking.cancellation_reason = (
            cancellation_reason
        )

        booking.save(
            update_fields=[
                "status",
                "cancellation_reason",
                "updated_at",
            ]
        )

        provider_user = (
            booking.provider_profile.provider
        )

        notify(
            provider_user,
            "Booking Cancelled",
            (
                f"{booking.customer.username} "
                "cancelled the booking. "
                f"Reason: {cancellation_reason}"
            ),
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Booking cancelled successfully."
                ),
                "booking_id": booking.id,
                "status": "cancelled",
                "cancellation_reason": (
                    booking.cancellation_reason
                ),
            },
            status=status.HTTP_200_OK,
        )


# =========================================
# SUBMIT REVIEW
# =========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_review(request):

    booking_id = request.data.get("booking_id")
    provider_id = request.data.get("provider_id")
    rating = request.data.get("rating")

    booking = get_booking_or_404(booking_id)
    if not booking:
        return Response(
            {"success": False, "message": "Booking not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if booking.customer != request.user:
        return Response(
            {"success": False, "message": "Only customer can submit review"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if booking.status != "completed":
        return Response(
            {"success": False, "message": "Review allowed only after completion"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if int(provider_id) != booking.provider.id:
        return Response(
            {"success": False, "message": "Invalid provider"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if Review.objects.filter(booking=booking, customer=request.user).exists():
        return Response(
            {"success": False, "message": "Review already submitted"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Rating must be between 1 and 5"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    review = Review.objects.create(
        booking=booking,
        customer=request.user,
        provider=booking.provider,
        rating=rating,
        review=request.data.get("review"),
    )

    try:
        notify(
            booking.provider,
            "New Review",
            f"You received {review.rating} stars",
        )
    except Exception:
        pass

    return Response(
        {"success": True, "review_id": review.id},
        status=status.HTTP_201_CREATED,
    )


# =========================================
# GET PROFILE
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile(request):

    user = request.user

    return Response({
        "success": True,
        "user": user_base_payload(user, request),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_profile(request):

    user = request.user

    username = request.data.get("username")
    email = request.data.get("email")
    phone = request.data.get("phone")
    address = request.data.get("address")
    service_type = request.data.get("service_type")
    bio = request.data.get("bio")
    experience_years = request.data.get("experience_years")

    # Direct upload method
    profile_picture = request.FILES.get("profile_picture")

    # Signed/local upload method
    profile_picture_key = request.data.get("profile_picture_key")

    if username:
        user.username = username

    if email:
        user.email = email

    if phone is not None:
        user.phone = phone
    if address is not None:
        user.address = address
    if bio is not None:
        user.bio = bio
    if experience_years is not None and experience_years != '':
        try:
            user.experience_years = int(experience_years)
        except (TypeError, ValueError):
            return Response(
                {"success": False, "message": "experience_years must be a number"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if request.FILES.get("profile_picture"):
        user.profile_picture = request.FILES["profile_picture"]

    if address is not None:
        user.address = address

    if bio is not None:
        user.bio = bio

    if experience_years is not None:
        user.experience_years = experience_years

    if profile_picture:
        user.profile_picture = profile_picture

    if profile_picture_key:
        user.profile_picture = profile_picture_key

    if service_type:
        if user.role == "customer":
            return Response(
                {"success": False, "message": "Customers cannot update service type"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not is_active_service_key(service_type):
            return Response(
                {"success": False, "message": "Invalid service type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.role = service_type

    user.save()

    profile = user_base_payload(user, request)
    profile["bio"] = user.bio or None
    profile["experience_years"] = user.experience_years

    return Response({
        "success": True,
        "message": "Profile updated successfully",
        "user": profile,
    })


# =========================================
# VIEW SPECIFIC LEAD / REQUEST
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view_lead_detail(request, request_id):

    service_request = get_service_request_or_404(request_id)

    if not service_request:
        return Response(
            {
                "success": False,
                "message": "Service request not found"
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if request.user.role == "customer":

        if service_request.customer != request.user:
            return Response(
                {
                    "success": False,
                    "message": "Unauthorized"
                },
                status=status.HTTP_403_FORBIDDEN
            )

    elif is_provider_role(request.user.role):

        if service_request.service_type != request.user.role:
            return Response(
                {
                    "success": False,
                    "message": "Unauthorized"
                },
                status=status.HTTP_403_FORBIDDEN
            )

    else:
        return Response(
            {
                "success": False,
                "message": "Unauthorized"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    my_quote = None

    if is_provider_role(request.user.role):
        my_quote = Quote.objects.filter(
            service_request=service_request,
            provider=request.user
        ).first()

    return Response({
        "success": True,
        "lead": {
            "id": service_request.id,

            "customer_id": service_request.customer.id,
            "customer": service_request.customer.username,
            "customer_profile_picture": (
                request.build_absolute_uri(service_request.customer.profile_picture.url)
                if service_request.customer.profile_picture else None
            ),

            "service_type": service_request.service_type,
            "address": service_request_address_text(service_request),
            "lat": service_request.lat,
            "lon": service_request.lon,

            "lawn_area": (
                service_request.lawn_area
                if service_request.service_type == "gardener"
                else None
            ),

            "polygon_points": (
                service_request.polygon_points
                if service_request.service_type == "gardener"
                else None
            ),

            "description": service_request.description,

            "image": (
                request.build_absolute_uri(service_request.image.url)
                if service_request.image else None
            ),

            "status": service_request.status,
            "is_booked": service_request.is_booked,
            "created_at": service_request.created_at,
            "has_quoted": my_quote is not None,

            "preferred_date": service_request.preferred_date,
            "preferred_start_time": service_request.preferred_start_time,
            "preferred_end_time": service_request.preferred_end_time,

            "my_quote": {
                "id": my_quote.id,
                "price": my_quote.price,
                "message": my_quote.message,
                "status": my_quote.status
            } if my_quote else None
        }
    })


from django.db.models import Avg, Count

@api_view(["GET"])
@permission_classes([AllowAny])
def popular_providers(request):
    valid_services = active_service_keys()

    providers = User.objects.filter(
        role__in=valid_services,
        is_active=True,
        is_approved=True,
    )

    data = []

    for provider in providers:

        reviews = Review.objects.filter(
            provider=provider
        )

        avg_rating = 0

        if reviews.exists():
            avg_rating = round(
                reviews.aggregate(
                    Avg("rating")
                )["rating__avg"],
                1
            )

        data.append({
            "id": provider.id,
            "username": provider.username,
            "role": provider.role,

            "profile_picture": (
                request.build_absolute_uri(
                    provider.profile_picture.url
                )
                if provider.profile_picture else None
            ),

            "experience_years": provider.experience_years,
            "is_verified": provider.is_verified,

            "average_rating": avg_rating,
            "total_reviews": reviews.count(),
        })

    data = sorted(
        data,
        key=lambda x: (
            x["average_rating"],
            x["total_reviews"]
        ),
        reverse=True
    )[:10]

    return Response({
        "success": True,
        "providers": data
    })


# =========================================
# DASHBOARD STATS (lightweight counts)
# =========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user

    if user.role == "customer":
        from .dashboard_cache import get_customer_stats

        stats = get_customer_stats(user.id)
        return Response({
            "success": True,
            "role": "customer",
            **stats,
        })

    if not is_provider_role(user.role):
        return Response(
            {"success": False, "message": "Unsupported role"},
            status=status.HTTP_403_FORBIDDEN,
        )

    from .dashboard_cache import get_provider_stats

    return Response({
        "success": True,
        **get_provider_stats(user),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_home(request):
    user = request.user
    if user.role != "customer":
        return Response(
            {"success": False, "message": "Only customers allowed"},
            status=status.HTTP_403_FORBIDDEN,
        )

    from adminpanel.catalog_helpers import build_home_catalog_payload
    from .dashboard_cache import get_customer_home_payload

    catalog = build_home_catalog_payload(request)
    payload = get_customer_home_payload(request, user.id, catalog)

    return Response(
        {
            "success": True,
            "booked_count": payload["booked_count"],
            "open_requests": payload["open_requests"],
            "catalog": payload["catalog"],
        },
        status=status.HTTP_200_OK,
    )
