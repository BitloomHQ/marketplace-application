from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .helpers import serialize_provider_job
from providers.models import (
    ProviderProfile,
    ProviderService,
)
from providers.permissions import IsApprovedProvider
from providers.serializers import (
    ProviderProfileSerializer,
    ProviderServiceSerializer,
)
from providers.models import (
    ProviderAvailability,
    ProviderProfile,
    ProviderService,
)
from providers.serializers import (
    ProviderAvailabilitySerializer,
    ProviderServiceAreaSerializer,
)
from .services.provider_dashboard import (
    get_provider_dashboard_payload,
)
from django.core.paginator import Paginator

from service_requests.models import ServiceBooking

from .helpers import serialize_provider_job
from datetime import datetime

from django.utils import timezone

from providers.services.job_management import (
    transition_booking,
)
from service_requests.models import ServiceBooking
from decimal import Decimal, InvalidOperation

@api_view([
    "GET",
    "POST",
    "PATCH",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
@transaction.atomic
def provider_profile_api(request):
    profile = ProviderProfile.objects.filter(
        provider=request.user,
    ).first()

    if request.method == "GET":
        if not profile:
            return Response(
                {
                    "success": False,
                    "message": "Provider profile does not exist.",
                    "code": "PROVIDER_PROFILE_NOT_FOUND",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProviderProfileSerializer(
            profile,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Provider profile fetched successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    if request.method == "POST":
        if profile:
            return Response(
                {
                    "success": False,
                    "message": "Provider profile already exists.",
                    "code": "PROVIDER_PROFILE_ALREADY_EXISTS",
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ProviderProfileSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Provider profile creation failed.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = serializer.save(
            provider=request.user,
        )

        return Response(
            {
                "success": True,
                "message": "Provider profile created successfully.",
                "data": ProviderProfileSerializer(
                    profile,
                    context={
                        "request": request,
                    },
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    if not profile:
        return Response(
            {
                "success": False,
                "message": "Create your provider profile first.",
                "code": "PROVIDER_PROFILE_NOT_FOUND",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ProviderProfileSerializer(
        profile,
        data=request.data,
        partial=True,
        context={
            "request": request,
        },
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Provider profile update failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile = serializer.save()

    return Response(
        {
            "success": True,
            "message": "Provider profile updated successfully.",
            "data": ProviderProfileSerializer(
                profile,
                context={
                    "request": request,
                },
            ).data,
        },
        status=status.HTTP_200_OK,
    )
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from adminpanel.models import MarketplaceLocationSettings

from providers.models import ProviderProfile
from providers.permissions import IsApprovedProvider

@api_view([
    "GET",
    "PATCH",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
@transaction.atomic
def provider_location_api(request):
    """
    Get or update the logged-in provider's current
    working location.

    Location can come from:

    LIVE:
        Device/browser GPS.

    MANUAL:
        Provider manually selects/searches a location.

    Provider chooses their preferred service radius,
    but it cannot exceed the maximum radius configured
    by the marketplace admin.
    """

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    profile = (
        ProviderProfile.objects
        .select_for_update()
        .filter(
            provider=request.user,
        )
        .first()
    )

    if not profile:
        return Response(
            {
                "success": False,
                "message": (
                    "Create your provider profile first."
                ),
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # MARKETPLACE LOCATION SETTINGS
    # =========================================================

    marketplace_settings = (
        MarketplaceLocationSettings.get_settings()
    )

    admin_max_radius = Decimal(
        str(
            marketplace_settings
            .max_provider_radius_km
        )
    )

    default_provider_radius = Decimal(
        str(
            marketplace_settings
            .default_provider_radius_km
        )
    )

    # =========================================================
    # EFFECTIVE RADIUS
    # =========================================================

    provider_radius = (
        profile.service_radius_km
        if profile.service_radius_km is not None
        else default_provider_radius
    )

    effective_radius = min(
        Decimal(str(provider_radius)),
        admin_max_radius,
    )

    # =========================================================
    # GET CURRENT LOCATION
    # =========================================================

    if request.method == "GET":

        has_location = (
            profile.current_latitude is not None
            and profile.current_longitude is not None
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Provider location fetched successfully."
                ),
                "data": {
                    "has_location": has_location,

                    "latitude": (
                        float(profile.current_latitude)
                        if profile.current_latitude
                        is not None
                        else None
                    ),

                    "longitude": (
                        float(profile.current_longitude)
                        if profile.current_longitude
                        is not None
                        else None
                    ),

                    "location_source": (
                        profile.location_source
                    ),

                    "location_text": (
                        profile.current_location_text
                    ),

                    # Provider's selected preference.
                    "service_radius_km": (
                        float(provider_radius)
                    ),

                    # Admin-controlled maximum.
                    "admin_max_radius_km": (
                        float(admin_max_radius)
                    ),

                    # Radius actually used by matching.
                    "effective_radius_km": (
                        float(effective_radius)
                    ),

                    "is_location_matching_enabled": (
                        marketplace_settings
                        .is_location_matching_enabled
                    ),

                    "is_online": (
                        profile.is_online
                    ),

                    "is_available": (
                        profile.is_available
                    ),

                    "last_location_updated_at": (
                        profile.last_location_updated_at
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # PATCH INPUT
    # =========================================================

    latitude_raw = request.data.get(
        "latitude"
    )

    longitude_raw = request.data.get(
        "longitude"
    )

    location_source = request.data.get(
        "location_source"
    )

    location_text = request.data.get(
        "location_text"
    )

    service_radius_raw = request.data.get(
        "service_radius_km"
    )

    is_online_raw = request.data.get(
        "is_online"
    )

    # =========================================================
    # COORDINATES MUST COME TOGETHER
    # =========================================================

    latitude_provided = (
        latitude_raw is not None
    )

    longitude_provided = (
        longitude_raw is not None
    )

    if latitude_provided != longitude_provided:

        return Response(
            {
                "success": False,
                "message": (
                    "latitude and longitude must "
                    "be provided together."
                ),
                "code": "INCOMPLETE_LOCATION",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # PARSE COORDINATES
    # =========================================================

    latitude = None
    longitude = None

    if latitude_provided:

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
    # LOCATION SOURCE
    # =========================================================

    if location_source is not None:

        location_source = (
            str(location_source)
            .strip()
            .lower()
        )

        valid_sources = [
            ProviderProfile.LOCATION_SOURCE_LIVE,
            ProviderProfile.LOCATION_SOURCE_MANUAL,
        ]

        if location_source not in valid_sources:

            return Response(
                {
                    "success": False,
                    "message": (
                        "location_source must be "
                        "'live' or 'manual'."
                    ),
                    "code": (
                        "INVALID_LOCATION_SOURCE"
                    ),
                    "allowed_values": (
                        valid_sources
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    if latitude_provided and not location_source:

        return Response(
            {
                "success": False,
                "message": (
                    "location_source is required "
                    "when updating location."
                ),
                "code": (
                    "LOCATION_SOURCE_REQUIRED"
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # PROVIDER PREFERRED SERVICE RADIUS
    # =========================================================

    service_radius = None

    if service_radius_raw is not None:

        try:
            service_radius = Decimal(
                str(service_radius_raw)
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
                        "service_radius_km must "
                        "be a valid number."
                    ),
                    "code": (
                        "INVALID_SERVICE_RADIUS"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if service_radius < Decimal("1"):

            return Response(
                {
                    "success": False,
                    "message": (
                        "service_radius_km must "
                        "be at least 1 km."
                    ),
                    "code": (
                        "SERVICE_RADIUS_TOO_SMALL"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -----------------------------------------------------
        # IMPORTANT:
        # Maximum radius comes from ADMIN settings.
        # Nothing is hardcoded here.
        # -----------------------------------------------------

        if service_radius > admin_max_radius:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Selected service radius exceeds "
                        "the maximum radius allowed by "
                        "the marketplace."
                    ),
                    "code": (
                        "SERVICE_RADIUS_EXCEEDS_ADMIN_LIMIT"
                    ),
                    "maximum_allowed_radius_km": (
                        float(admin_max_radius)
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # BOOLEAN PARSER
    # =========================================================

    is_online = None

    if is_online_raw is not None:

        if isinstance(
            is_online_raw,
            bool,
        ):
            is_online = is_online_raw

        else:
            normalized_online = (
                str(is_online_raw)
                .strip()
                .lower()
            )

            if normalized_online in [
                "true",
                "1",
                "yes",
                "on",
            ]:
                is_online = True

            elif normalized_online in [
                "false",
                "0",
                "no",
                "off",
            ]:
                is_online = False

            else:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "is_online must be "
                            "true or false."
                        ),
                        "code": (
                            "INVALID_ONLINE_STATUS"
                        ),
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

    # =========================================================
    # PROVIDER MUST HAVE LOCATION BEFORE GOING ONLINE
    # =========================================================

    resulting_latitude = (
        latitude
        if latitude_provided
        else profile.current_latitude
    )

    resulting_longitude = (
        longitude
        if longitude_provided
        else profile.current_longitude
    )

    if is_online is True:

        if not (
            marketplace_settings
            .is_location_matching_enabled
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Location-based marketplace "
                        "matching is currently disabled."
                    ),
                    "code": (
                        "LOCATION_MATCHING_DISABLED"
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        if (
            resulting_latitude is None
            or resulting_longitude is None
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Set your working location "
                        "before going online."
                    ),
                    "code": (
                        "LOCATION_REQUIRED_FOR_ONLINE"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not profile.is_available:

            return Response(
                {
                    "success": False,
                    "message": (
                        "Provider must be available "
                        "before going online."
                    ),
                    "code": (
                        "PROVIDER_NOT_AVAILABLE"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # UPDATE PROFILE
    # =========================================================

    update_fields = []

    if latitude_provided:

        profile.current_latitude = latitude
        profile.current_longitude = longitude

        profile.location_source = (
            location_source
        )

        profile.last_location_updated_at = (
            timezone.now()
        )

        update_fields.extend([
            "current_latitude",
            "current_longitude",
            "location_source",
            "last_location_updated_at",
        ])

    elif location_source is not None:

        if (
            profile.current_latitude is None
            or profile.current_longitude is None
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "A location must exist before "
                        "location_source can be changed."
                    ),
                    "code": "LOCATION_NOT_SET",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.location_source = (
            location_source
        )

        update_fields.append(
            "location_source"
        )

    if location_text is not None:

        profile.current_location_text = (
            str(location_text)
            .strip()[:255]
        )

        update_fields.append(
            "current_location_text"
        )

    if service_radius is not None:

        profile.service_radius_km = (
            service_radius
        )

        update_fields.append(
            "service_radius_km"
        )

    if is_online is not None:

        profile.is_online = (
            is_online
        )

        update_fields.append(
            "is_online"
        )

    # =========================================================
    # NOTHING TO UPDATE
    # =========================================================

    if not update_fields:

        return Response(
            {
                "success": False,
                "message": (
                    "No location fields were "
                    "provided for update."
                ),
                "code": "NO_FIELDS_TO_UPDATE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    update_fields.append(
        "updated_at"
    )

    profile.save(
        update_fields=list(
            dict.fromkeys(update_fields)
        )
    )

    # =========================================================
    # RECALCULATE EFFECTIVE RADIUS
    # =========================================================

    final_provider_radius = (
        profile.service_radius_km
        if profile.service_radius_km is not None
        else default_provider_radius
    )

    final_effective_radius = min(
        Decimal(
            str(final_provider_radius)
        ),
        admin_max_radius,
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": (
                "Provider location updated successfully."
            ),
            "data": {
                "latitude": (
                    float(profile.current_latitude)
                    if profile.current_latitude
                    is not None
                    else None
                ),

                "longitude": (
                    float(profile.current_longitude)
                    if profile.current_longitude
                    is not None
                    else None
                ),

                "location_source": (
                    profile.location_source
                ),

                "location_text": (
                    profile.current_location_text
                ),

                "service_radius_km": (
                    float(final_provider_radius)
                ),

                "admin_max_radius_km": (
                    float(admin_max_radius)
                ),

                "effective_radius_km": (
                    float(final_effective_radius)
                ),

                "is_location_matching_enabled": (
                    marketplace_settings
                    .is_location_matching_enabled
                ),

                "is_online": (
                    profile.is_online
                ),

                "is_available": (
                    profile.is_available
                ),

                "last_location_updated_at": (
                    profile.last_location_updated_at
                ),
            },
        },
        status=status.HTTP_200_OK,
    )
@api_view([
    "GET",
    "POST",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
def provider_service_list_create_api(request):
    profile = ProviderProfile.objects.filter(
        provider=request.user,
    ).first()

    if not profile:
        return Response(
            {
                "success": False,
                "message": "Create your provider profile first.",
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        services = profile.services.select_related(
            "category",
        ).all()

        serializer = ProviderServiceSerializer(
            services,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": "Provider services fetched successfully.",
                "count": services.count(),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    serializer = ProviderServiceSerializer(
        data=request.data,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Provider service creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    category = serializer.validated_data["category"]

    if ProviderService.objects.filter(
        provider_profile=profile,
        category=category,
    ).exists():
        return Response(
            {
                "success": False,
                "message": (
                    "You have already added this service category."
                ),
                "code": "SERVICE_ALREADY_ADDED",
            },
            status=status.HTTP_409_CONFLICT,
        )

    service = serializer.save(
        provider_profile=profile,
    )

    return Response(
        {
            "success": True,
            "message": "Provider service added successfully.",
            "data": ProviderServiceSerializer(
                service,
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )

@api_view([
    "GET",
    "POST",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
@transaction.atomic
def provider_availability_api(request):
    """
    GET:
        Return all availability slots for the
        logged-in provider.

    POST:
        Create one availability slot.

    Example:

        {
            "day_of_week": 0,
            "start_time": "09:00",
            "end_time": "13:00",
            "is_available": true
        }
    """

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    profile = (
        ProviderProfile.objects
        .select_for_update()
        .filter(
            provider=request.user,
        )
        .first()
    )

    if not profile:
        return Response(
            {
                "success": False,
                "message": (
                    "Create your provider profile first."
                ),
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # GET AVAILABILITY
    # =========================================================

    if request.method == "GET":

        slots = (
            profile.availability_slots
            .all()
            .order_by(
                "day_of_week",
                "start_time",
            )
        )

        serializer = (
            ProviderAvailabilitySerializer(
                slots,
                many=True,
            )
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Provider availability "
                    "fetched successfully."
                ),
                "count": slots.count(),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # CREATE SLOT
    # =========================================================

    serializer = ProviderAvailabilitySerializer(
        data=request.data,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": (
                    "Availability creation failed."
                ),
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # VALIDATED VALUES
    # =========================================================

    day_of_week = (
        serializer.validated_data.get(
            "day_of_week"
        )
    )

    start_time = (
        serializer.validated_data.get(
            "start_time"
        )
    )

    end_time = (
        serializer.validated_data.get(
            "end_time"
        )
    )

    is_available = (
        serializer.validated_data.get(
            "is_available",
            True,
        )
    )

    # =========================================================
    # DAY VALIDATION
    # =========================================================

    if day_of_week not in range(7):
        return Response(
            {
                "success": False,
                "message": (
                    "day_of_week must be "
                    "between 0 and 6."
                ),
                "code": "INVALID_DAY_OF_WEEK",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # TIME VALIDATION
    # =========================================================

    if is_available:

        if (
            start_time is None
            or end_time is None
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "start_time and end_time "
                        "are required for an "
                        "available slot."
                    ),
                    "code": (
                        "AVAILABILITY_TIME_REQUIRED"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_time >= end_time:
            return Response(
                {
                    "success": False,
                    "message": (
                        "end_time must be later "
                        "than start_time."
                    ),
                    "code": (
                        "INVALID_AVAILABILITY_RANGE"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # OVERLAPPING SLOT CHECK
    # =========================================================

    if (
        is_available
        and start_time is not None
        and end_time is not None
    ):

        overlapping_slot = (
            ProviderAvailability.objects
            .filter(
                provider_profile=profile,
                day_of_week=day_of_week,
                is_available=True,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            .first()
        )

        if overlapping_slot:
            return Response(
                {
                    "success": False,
                    "message": (
                        "This availability slot "
                        "overlaps with an existing "
                        "slot."
                    ),
                    "code": (
                        "AVAILABILITY_SLOT_OVERLAP"
                    ),
                    "conflicting_slot": {
                        "id": (
                            overlapping_slot.id
                        ),
                        "day_of_week": (
                            overlapping_slot.day_of_week
                        ),
                        "start_time": (
                            overlapping_slot.start_time
                        ),
                        "end_time": (
                            overlapping_slot.end_time
                        ),
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

    # =========================================================
    # SAVE
    # =========================================================

    availability = serializer.save(
        provider_profile=profile,
    )

    # Run model validation too.
    availability.full_clean()

    availability.save()

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": (
                "Availability added successfully."
            ),
            "data": (
                ProviderAvailabilitySerializer(
                    availability,
                ).data
            ),
        },
        status=status.HTTP_201_CREATED,
    )

@api_view([
    "GET",
    "POST",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
@transaction.atomic
def provider_service_area_api(request):
    profile = ProviderProfile.objects.filter(
        provider=request.user,
    ).first()

    if not profile:
        return Response(
            {
                "success": False,
                "message": "Create your provider profile first.",
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        areas = profile.service_areas.all()

        serializer = ProviderServiceAreaSerializer(
            areas,
            many=True,
        )

        return Response(
            {
                "success": True,
                "message": "Service areas fetched successfully.",
                "count": areas.count(),
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    serializer = ProviderServiceAreaSerializer(
        data=request.data,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Service area creation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if serializer.validated_data.get("is_primary"):
        profile.service_areas.update(
            is_primary=False,
        )

    area = serializer.save(
        provider_profile=profile,
    )

    return Response(
        {
            "success": True,
            "message": "Service area added successfully.",
            "data": ProviderServiceAreaSerializer(
                area,
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_dashboard(request):
    """
    Return the production-ready dashboard
    for the logged-in provider.
    """

    user = request.user

    # =========================================================
    # PROVIDER ROLE CHECK
    # =========================================================

    if not user.is_provider:
        return Response(
            {
                "success": False,
                "message": (
                    "Only providers can access "
                    "the provider dashboard."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # PROVIDER APPROVAL CHECK
    # =========================================================

    if not user.is_approved:
        return Response(
            {
                "success": False,
                "message": (
                    "Your provider account is "
                    "pending admin approval."
                ),
                "account_status": "pending_approval",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # ACTIVE ACCOUNT CHECK
    # =========================================================

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": (
                    "Your provider account "
                    "is currently inactive."
                ),
                "account_status": "inactive",
                "reason": (
                    user.deactivate_reason
                    or user.status_note
                    or None
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    provider_profile = getattr(
        user,
        "provider_profile",
        None,
    )

    if not provider_profile:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider profile not found."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # DASHBOARD PAYLOAD
    # =========================================================

    dashboard = get_provider_dashboard_payload(
        provider_profile=provider_profile,
        request=request,
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": (
                "Provider dashboard "
                "fetched successfully."
            ),
            "data": dashboard,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_jobs(request):
    """
    Return jobs belonging to the logged-in provider.

    Supported filters:

    ?status=accepted
    ?status=scheduled
    ?status=in_progress
    ?status=completed
    ?status=cancelled

    Pagination:

    ?page=1
    ?page_size=10
    """

    user = request.user

    # =========================================================
    # PROVIDER ACCESS
    # =========================================================

    if not user.is_provider:
        return Response(
            {
                "success": False,
                "message": (
                    "Only providers can access jobs."
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

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": (
                    "Your provider account "
                    "is currently inactive."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    provider_profile = getattr(
        user,
        "provider_profile",
        None,
    )

    if not provider_profile:
        return Response(
            {
                "success": False,
                "message": "Provider profile not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # BASE QUERYSET
    # Critical security filter:
    # provider only sees their own jobs.
    # =========================================================

    base_queryset = (
        ServiceBooking.objects
        .filter(
            provider_profile=provider_profile
        )
    )

    # =========================================================
    # SUMMARY
    # =========================================================

    summary = {
        "total": (
            base_queryset.count()
        ),

        "accepted": (
            base_queryset
            .filter(status="accepted")
            .count()
        ),

        "scheduled": (
            base_queryset
            .filter(status="scheduled")
            .count()
        ),

        "in_progress": (
            base_queryset
            .filter(status="in_progress")
            .count()
        ),

        "completed": (
            base_queryset
            .filter(status="completed")
            .count()
        ),

        "cancelled": (
            base_queryset
            .filter(status="cancelled")
            .count()
        ),
    }

    # =========================================================
    # STATUS FILTER
    # =========================================================

    job_status = (
        request.query_params.get("status")
    )

    valid_statuses = [
        "accepted",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
    ]

    if job_status:

        job_status = (
            job_status.strip().lower()
        )

        if job_status not in valid_statuses:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Invalid job status."
                    ),
                    "allowed_statuses": (
                        valid_statuses
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # APPLY FILTER
    # =========================================================

    jobs = base_queryset

    if job_status:
        jobs = jobs.filter(
            status=job_status
        )

    # =========================================================
    # OPTIMIZATION
    # =========================================================

    jobs = (
        jobs
        .select_related(
            "customer",
            "service_request",
            "service_request__category",
            "quotation",
            "provider_profile",
            "provider_profile__provider",
        )
        .order_by("-created_at")
    )

    # =========================================================
    # PAGINATION
    # =========================================================

    try:
        page_number = int(
            request.query_params.get(
                "page",
                1,
            )
        )
    except (TypeError, ValueError):
        page_number = 1

    try:
        page_size = int(
            request.query_params.get(
                "page_size",
                10,
            )
        )
    except (TypeError, ValueError):
        page_size = 10

    page_number = max(
        page_number,
        1,
    )

    page_size = max(
        1,
        min(page_size, 100),
    )

    paginator = Paginator(
        jobs,
        page_size,
    )

    page = paginator.get_page(
        page_number
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Provider jobs fetched successfully."
            ),

            "summary": summary,

            "filters": {
                "status": job_status,
            },

            "pagination": {
                "page": page.number,

                "page_size": page_size,

                "total_items": (
                    paginator.count
                ),

                "total_pages": (
                    paginator.num_pages
                ),

                "has_next": (
                    page.has_next()
                ),

                "has_previous": (
                    page.has_previous()
                ),
            },

            "jobs": [
                serialize_provider_job(
                    booking,
                    request,
                )
                for booking
                in page.object_list
            ],
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_job_detail(
    request,
    booking_id,
):
    """
    Return complete information for one
    booking belonging to the provider.
    """

    user = request.user

    # =========================================================
    # PROVIDER ACCESS
    # =========================================================

    if not user.is_provider:
        return Response(
            {
                "success": False,
                "message": (
                    "Only providers can access "
                    "job details."
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

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": (
                    "Your provider account "
                    "is currently inactive."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    provider_profile = getattr(
        user,
        "provider_profile",
        None,
    )

    if not provider_profile:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider profile not found."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # BOOKING + OWNERSHIP
    # =========================================================

    booking = (
        ServiceBooking.objects
        .filter(
            id=booking_id,
            provider_profile=provider_profile,
        )
        .select_related(
            "customer",
            "service_request",
            "service_request__category",
            "quotation",
            "provider_profile",
            "provider_profile__provider",
        )
        .first()
    )

    if not booking:
        return Response(
            {
                "success": False,
                "message": "Job not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # BASE JOB DATA
    # =========================================================

    job_data = serialize_provider_job(
        booking,
        request,
    )

    # =========================================================
    # ACCEPTED QUOTATION
    # =========================================================

    quotation = booking.quotation

    quotation_data = {
        "id": quotation.id,

        "quoted_price": str(
            quotation.quoted_price
        ),

        "message": (
            quotation.message
        ),

        "estimated_duration_minutes": (
            quotation.estimated_duration_minutes
        ),

        "status": quotation.status,

        "created_at": quotation.created_at,

        "updated_at": quotation.updated_at,
    }

    # =========================================================
    # CUSTOMER CONTACT
    # Only available after a booking relationship exists.
    # =========================================================

    customer = booking.customer

    customer_contact = {
        "phone": customer.phone,
        "email": customer.email,
    }

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Provider job details "
                "fetched successfully."
            ),

            "job": job_data,

            "quotation": quotation_data,

            "customer_contact": (
                customer_contact
            ),
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def schedule_provider_job(
    request,
    booking_id,
):
    """
    Schedule an accepted provider booking.

    Required:
    - scheduled_date
    - scheduled_start_time
    - scheduled_end_time

    Validation:
    - Provider must own the booking.
    - Booking must be accepted.
    - Date cannot be in the past.
    - End time must be after start time.
    - Requested time must fall completely inside
      one provider availability slot.
    - Provider cannot have another overlapping
      scheduled/in-progress booking.
    """

    user = request.user

    # =========================================================
    # PROVIDER ACCESS
    # =========================================================

    if not user.is_provider:
        return Response(
            {
                "success": False,
                "message": (
                    "Only providers can schedule jobs."
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

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": (
                    "Your provider account "
                    "is currently inactive."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    provider_profile = getattr(
        user,
        "provider_profile",
        None,
    )

    if not provider_profile:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider profile not found."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # BOOKING + OWNERSHIP
    # =========================================================
    #
    # Lock the booking while scheduling it.
    # =========================================================

    booking = (
        ServiceBooking.objects
        .select_for_update()
        .filter(
            id=booking_id,
            provider_profile=provider_profile,
        )
        .first()
    )

    if not booking:
        return Response(
            {
                "success": False,
                "message": "Job not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # CURRENT STATUS
    # =========================================================

    if booking.status != "accepted":
        return Response(
            {
                "success": False,
                "message": (
                    "Only accepted jobs can "
                    "be scheduled."
                ),
                "current_status": booking.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # REQUEST DATA
    # =========================================================

    scheduled_date = request.data.get(
        "scheduled_date"
    )

    scheduled_start_time = request.data.get(
        "scheduled_start_time"
    )

    scheduled_end_time = request.data.get(
        "scheduled_end_time"
    )

    if not all(
        [
            scheduled_date,
            scheduled_start_time,
            scheduled_end_time,
        ]
    ):
        return Response(
            {
                "success": False,
                "message": (
                    "scheduled_date, "
                    "scheduled_start_time and "
                    "scheduled_end_time are required."
                ),
                "code": "SCHEDULE_FIELDS_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # PARSE DATE
    # =========================================================

    try:
        parsed_date = datetime.strptime(
            str(scheduled_date),
            "%Y-%m-%d",
        ).date()

    except (TypeError, ValueError):
        return Response(
            {
                "success": False,
                "message": (
                    "Invalid scheduled_date. "
                    "Use YYYY-MM-DD."
                ),
                "code": "INVALID_SCHEDULE_DATE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # PARSE TIMES
    # =========================================================

    try:
        parsed_start_time = datetime.strptime(
            str(scheduled_start_time),
            "%H:%M",
        ).time()

        parsed_end_time = datetime.strptime(
            str(scheduled_end_time),
            "%H:%M",
        ).time()

    except (TypeError, ValueError):
        return Response(
            {
                "success": False,
                "message": (
                    "Invalid time format. "
                    "Use HH:MM."
                ),
                "code": "INVALID_SCHEDULE_TIME",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # VALIDATE DATE
    # =========================================================

    today = timezone.localdate()

    if parsed_date < today:
        return Response(
            {
                "success": False,
                "message": (
                    "A job cannot be scheduled "
                    "for a past date."
                ),
                "code": "PAST_SCHEDULE_DATE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # VALIDATE TIME RANGE
    # =========================================================

    if parsed_end_time <= parsed_start_time:
        return Response(
            {
                "success": False,
                "message": (
                    "scheduled_end_time must be "
                    "after scheduled_start_time."
                ),
                "code": "INVALID_TIME_RANGE",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # OPTIONAL: PREVENT PAST TIME TODAY
    # =========================================================

    if parsed_date == today:

        current_time = (
            timezone.localtime()
            .time()
            .replace(
                second=0,
                microsecond=0,
            )
        )

        if parsed_start_time <= current_time:
            return Response(
                {
                    "success": False,
                    "message": (
                        "A job cannot be scheduled "
                        "for a past time."
                    ),
                    "code": "PAST_SCHEDULE_TIME",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # PROVIDER WORKING HOURS
    # =========================================================
    #
    # Python weekday():
    #
    # Monday    = 0
    # Tuesday   = 1
    # ...
    # Sunday    = 6
    #
    # This matches ProviderAvailability.DAY_CHOICES.
    # =========================================================

    day_of_week = parsed_date.weekday()

    availability_slot = (
        ProviderAvailability.objects
        .filter(
            provider_profile=provider_profile,
            day_of_week=day_of_week,
            is_available=True,

            # Requested booking must fit completely
            # inside one availability slot.
            start_time__lte=parsed_start_time,
            end_time__gte=parsed_end_time,
        )
        .order_by(
            "start_time"
        )
        .first()
    )

    if not availability_slot:

        available_slots = (
            ProviderAvailability.objects
            .filter(
                provider_profile=provider_profile,
                day_of_week=day_of_week,
                is_available=True,
            )
            .order_by(
                "start_time"
            )
        )

        return Response(
            {
                "success": False,
                "message": (
                    "The selected time is outside "
                    "your configured working hours."
                ),
                "code": (
                    "OUTSIDE_PROVIDER_AVAILABILITY"
                ),
                "requested_schedule": {
                    "date": parsed_date,
                    "day_of_week": day_of_week,
                    "start_time": (
                        parsed_start_time
                    ),
                    "end_time": (
                        parsed_end_time
                    ),
                },
                "available_slots": [
                    {
                        "id": slot.id,
                        "start_time": (
                            slot.start_time
                        ),
                        "end_time": (
                            slot.end_time
                        ),
                    }
                    for slot in available_slots
                ],
            },
            status=status.HTTP_409_CONFLICT,
        )

    # =========================================================
    # DOUBLE-BOOKING CHECK
    # =========================================================
    #
    # Time ranges overlap when:
    #
    # existing.start < requested.end
    # AND
    # existing.end > requested.start
    #
    # Example:
    #
    # Existing: 10:00 - 12:00
    # Requested: 11:00 - 13:00
    # Result: CONFLICT
    #
    # Existing: 10:00 - 12:00
    # Requested: 12:00 - 13:00
    # Result: ALLOWED
    # =========================================================

    conflicting_booking = (
        ServiceBooking.objects
        .select_for_update()
        .filter(
            provider_profile=provider_profile,
            scheduled_date=parsed_date,
            status__in=[
                "scheduled",
                "in_progress",
            ],
            scheduled_start_time__lt=(
                parsed_end_time
            ),
            scheduled_end_time__gt=(
                parsed_start_time
            ),
        )
        .exclude(
            id=booking.id,
        )
        .order_by(
            "scheduled_start_time"
        )
        .first()
    )

    if conflicting_booking:
        return Response(
            {
                "success": False,
                "message": (
                    "You already have another job "
                    "scheduled during this time."
                ),
                "code": "BOOKING_TIME_CONFLICT",
                "conflicting_booking": {
                    "booking_id": (
                        conflicting_booking.id
                    ),
                    "date": (
                        conflicting_booking
                        .scheduled_date
                    ),
                    "start_time": (
                        conflicting_booking
                        .scheduled_start_time
                    ),
                    "end_time": (
                        conflicting_booking
                        .scheduled_end_time
                    ),
                    "status": (
                        conflicting_booking.status
                    ),
                },
            },
            status=status.HTTP_409_CONFLICT,
        )

    # =========================================================
    # SAVE SCHEDULE
    # =========================================================

    booking.scheduled_date = parsed_date
    booking.scheduled_start_time = (
        parsed_start_time
    )
    booking.scheduled_end_time = (
        parsed_end_time
    )

    booking.save(
        update_fields=[
            "scheduled_date",
            "scheduled_start_time",
            "scheduled_end_time",
            "updated_at",
        ]
    )

    # =========================================================
    # STATUS TRANSITION
    # accepted -> scheduled
    # =========================================================

    try:
        transition_booking(
            booking,
            "scheduled",
        )

    except ValueError as exc:

        # Important:
        # Because returning normally would commit the
        # transaction, explicitly roll it back if the
        # status transition fails after schedule fields
        # have already been saved.
        transaction.set_rollback(True)

        return Response(
            {
                "success": False,
                "message": str(exc),
                "code": "BOOKING_TRANSITION_FAILED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,
            "message": (
                "Job scheduled successfully."
            ),

            "booking_id": booking.id,

            "status": booking.status,

            "schedule": {
                "date": (
                    booking.scheduled_date
                ),
                "day_of_week": (
                    day_of_week
                ),
                "start_time": (
                    booking.scheduled_start_time
                ),
                "end_time": (
                    booking.scheduled_end_time
                ),
            },

            "availability_slot": {
                "id": availability_slot.id,
                "day_of_week": (
                    availability_slot.day_of_week
                ),
                "start_time": (
                    availability_slot.start_time
                ),
                "end_time": (
                    availability_slot.end_time
                ),
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_provider_job(
    request,
    booking_id,
):
    """
    Start a scheduled job belonging
    to the logged-in provider.

    Valid transition:
    scheduled -> in_progress
    """

    user = request.user

    # =========================================================
    # PROVIDER ACCESS
    # =========================================================

    if not user.is_provider:
        return Response(
            {
                "success": False,
                "message": (
                    "Only providers can start jobs."
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

    if not user.is_active:
        return Response(
            {
                "success": False,
                "message": (
                    "Your provider account "
                    "is currently inactive."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    provider_profile = getattr(
        user,
        "provider_profile",
        None,
    )

    if not provider_profile:
        return Response(
            {
                "success": False,
                "message": (
                    "Provider profile not found."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # BOOKING + OWNERSHIP CHECK
    # =========================================================

    booking = (
        ServiceBooking.objects
        .filter(
            id=booking_id,
            provider_profile=provider_profile,
        )
        .first()
    )

    if not booking:
        return Response(
            {
                "success": False,
                "message": "Job not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # STATUS CHECK
    # =========================================================

    if booking.status != "scheduled":
        return Response(
            {
                "success": False,
                "message": (
                    "Only scheduled jobs "
                    "can be started."
                ),
                "current_status": (
                    booking.status
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # TRANSITION
    # scheduled -> in_progress
    # =========================================================

    try:
        transition_booking(
            booking,
            "in_progress",
        )

    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # KEEP SERVICE REQUEST IN SYNC
    # =========================================================

    service_request = (
        booking.service_request
    )

    if service_request.status != "in_progress":

        service_request.status = "in_progress"

        service_request.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

    # =========================================================
    # RESPONSE
    # =========================================================

    return Response(
        {
            "success": True,

            "message": (
                "Job started successfully."
            ),

            "booking_id": (
                booking.id
            ),

            "status": (
                booking.status
            ),

            "service_request": {
                "id": str(
                    service_request.id
                ),
                "status": (
                    service_request.status
                ),
            },

            "available_actions": {
                "can_schedule": False,
                "can_start": False,
                "can_complete": True,
                "can_cancel": False,
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view([
    "PATCH",
    "DELETE",
])
@permission_classes([
    IsAuthenticated,
    IsApprovedProvider,
])
@transaction.atomic
def provider_availability_detail_api(
    request,
    slot_id,
):
    """
    PATCH:
        Update one availability slot belonging
        to the logged-in provider.

    DELETE:
        Delete one availability slot belonging
        to the logged-in provider.
    """

    # =========================================================
    # PROVIDER PROFILE
    # =========================================================

    profile = (
        ProviderProfile.objects
        .select_for_update()
        .filter(
            provider=request.user,
        )
        .first()
    )

    if not profile:
        return Response(
            {
                "success": False,
                "message": (
                    "Create your provider profile first."
                ),
                "code": "PROVIDER_PROFILE_REQUIRED",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # SLOT + OWNERSHIP
    # =========================================================

    slot = (
        ProviderAvailability.objects
        .select_for_update()
        .filter(
            id=slot_id,
            provider_profile=profile,
        )
        .first()
    )

    if not slot:
        return Response(
            {
                "success": False,
                "message": (
                    "Availability slot not found."
                ),
                "code": (
                    "AVAILABILITY_SLOT_NOT_FOUND"
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # DELETE
    # =========================================================

    if request.method == "DELETE":

        slot.delete()

        return Response(
            {
                "success": True,
                "message": (
                    "Availability slot deleted "
                    "successfully."
                ),
            },
            status=status.HTTP_200_OK,
        )

    # =========================================================
    # PATCH
    # =========================================================

    serializer = ProviderAvailabilitySerializer(
        slot,
        data=request.data,
        partial=True,
    )

    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": (
                    "Availability update failed."
                ),
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # RESULTING VALUES
    # =========================================================

    day_of_week = (
        serializer.validated_data.get(
            "day_of_week",
            slot.day_of_week,
        )
    )

    start_time = (
        serializer.validated_data.get(
            "start_time",
            slot.start_time,
        )
    )

    end_time = (
        serializer.validated_data.get(
            "end_time",
            slot.end_time,
        )
    )

    is_available = (
        serializer.validated_data.get(
            "is_available",
            slot.is_available,
        )
    )

    # =========================================================
    # DAY VALIDATION
    # =========================================================

    if day_of_week not in range(7):
        return Response(
            {
                "success": False,
                "message": (
                    "day_of_week must be "
                    "between 0 and 6."
                ),
                "code": "INVALID_DAY_OF_WEEK",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # TIME VALIDATION
    # =========================================================

    if is_available:

        if (
            start_time is None
            or end_time is None
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "start_time and end_time "
                        "are required for an "
                        "available slot."
                    ),
                    "code": (
                        "AVAILABILITY_TIME_REQUIRED"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_time >= end_time:
            return Response(
                {
                    "success": False,
                    "message": (
                        "end_time must be later "
                        "than start_time."
                    ),
                    "code": (
                        "INVALID_AVAILABILITY_RANGE"
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # =========================================================
    # OVERLAP CHECK
    # =========================================================

    if (
        is_available
        and start_time is not None
        and end_time is not None
    ):

        conflicting_slot = (
            ProviderAvailability.objects
            .filter(
                provider_profile=profile,
                day_of_week=day_of_week,
                is_available=True,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            .exclude(
                id=slot.id,
            )
            .first()
        )

        if conflicting_slot:
            return Response(
                {
                    "success": False,
                    "message": (
                        "This availability slot "
                        "overlaps with an existing "
                        "slot."
                    ),
                    "code": (
                        "AVAILABILITY_SLOT_OVERLAP"
                    ),
                    "conflicting_slot": {
                        "id": conflicting_slot.id,
                        "day_of_week": (
                            conflicting_slot.day_of_week
                        ),
                        "start_time": (
                            conflicting_slot.start_time
                        ),
                        "end_time": (
                            conflicting_slot.end_time
                        ),
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

    # =========================================================
    # SAVE
    # =========================================================

    slot = serializer.save()

    return Response(
        {
            "success": True,
            "message": (
                "Availability slot updated "
                "successfully."
            ),
            "data": (
                ProviderAvailabilitySerializer(
                    slot,
                ).data
            ),
        },
        status=status.HTTP_200_OK,
    )