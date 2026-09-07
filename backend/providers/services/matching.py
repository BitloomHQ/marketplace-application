from datetime import timedelta
from math import radians, sin, cos, sqrt, atan2

from django.utils import timezone

from adminpanel.models import MarketplaceLocationSettings
from providers.models import (
    ProviderAvailability,
    ProviderProfile,
)
from service_requests.models import ServiceBooking


# ============================================================
# DISTANCE
# ============================================================

def calculate_distance_km(
    latitude_1,
    longitude_1,
    latitude_2,
    longitude_2,
):
    """
    Calculate straight-line geographical distance between
    two latitude/longitude coordinates using Haversine.

    Returns distance in kilometres.
    """

    if (
        latitude_1 is None
        or longitude_1 is None
        or latitude_2 is None
        or longitude_2 is None
    ):
        return None

    try:
        lat1 = radians(float(latitude_1))
        lon1 = radians(float(longitude_1))
        lat2 = radians(float(latitude_2))
        lon2 = radians(float(longitude_2))

    except (
        TypeError,
        ValueError,
    ):
        return None

    latitude_difference = lat2 - lat1
    longitude_difference = lon2 - lon1

    a = (
        sin(latitude_difference / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(longitude_difference / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a),
    )

    earth_radius_km = 6371.0088

    return round(
        earth_radius_km * c,
        2,
    )


# ============================================================
# SERVICE REQUEST LOCATION
# ============================================================

def get_service_request_location(
    service_request,
):
    """
    Support both service-request structures used by
    the marketplace.

    New structure:
        latitude
        longitude

    Older structure:
        lat
        lon
    """

    latitude = getattr(
        service_request,
        "latitude",
        None,
    )

    longitude = getattr(
        service_request,
        "longitude",
        None,
    )

    if latitude is None:
        latitude = getattr(
            service_request,
            "lat",
            None,
        )

    if longitude is None:
        longitude = getattr(
            service_request,
            "lon",
            None,
        )

    return (
        latitude,
        longitude,
    )


# ============================================================
# SERVICE REQUEST CATEGORY
# ============================================================

def get_service_request_category(
    service_request,
):
    """
    Support both request naming conventions.

    New structure:
        category

    Older structure:
        service_type
    """

    category = getattr(
        service_request,
        "category",
        None,
    )

    if category:
        return category

    return getattr(
        service_request,
        "service_type",
        None,
    )


# ============================================================
# SERVICE REQUEST PREFERRED SCHEDULE
# ============================================================

def get_service_request_schedule(
    service_request,
):
    """
    Return the customer's preferred schedule.

    Schedule filtering is only enabled when ALL three
    scheduling fields are present.

    This preserves existing behaviour for requests where
    the customer does not choose a preferred schedule.
    """

    preferred_date = getattr(
        service_request,
        "preferred_date",
        None,
    )

    preferred_start_time = getattr(
        service_request,
        "preferred_start_time",
        None,
    )

    preferred_end_time = getattr(
        service_request,
        "preferred_end_time",
        None,
    )

    has_complete_schedule = all(
        [
            preferred_date,
            preferred_start_time,
            preferred_end_time,
        ]
    )

    return {
        "has_complete_schedule": (
            has_complete_schedule
        ),
        "preferred_date": (
            preferred_date
        ),
        "preferred_start_time": (
            preferred_start_time
        ),
        "preferred_end_time": (
            preferred_end_time
        ),
    }


# ============================================================
# EFFECTIVE PROVIDER RADIUS
# ============================================================

def get_effective_provider_radius(
    provider_profile,
    marketplace_settings=None,
):
    """
    Effective provider radius is controlled by:

    1. Marketplace admin maximum radius
    2. Provider preferred service radius

    Effective radius = minimum of both.
    """

    if marketplace_settings is None:

        marketplace_settings = (
            MarketplaceLocationSettings
            .get_settings()
        )

    admin_max_radius = float(
        marketplace_settings
        .max_provider_radius_km
    )

    if (
        provider_profile.service_radius_km
        is not None
    ):

        provider_radius = float(
            provider_profile
            .service_radius_km
        )

    else:

        provider_radius = float(
            marketplace_settings
            .default_provider_radius_km
        )

    return min(
        admin_max_radius,
        provider_radius,
    )


# ============================================================
# PROVIDER LOCATION FRESHNESS
# ============================================================

def provider_location_is_usable(
    provider_profile,
    marketplace_settings,
):
    """
    Determine whether provider coordinates are currently
    usable for marketplace matching.

    Manual location:
        Does not expire.

    Live GPS:
        Expires according to marketplace timeout.
    """

    if (
        provider_profile.current_latitude is None
        or provider_profile.current_longitude is None
    ):
        return False

    # --------------------------------------------------------
    # MANUAL LOCATION
    # --------------------------------------------------------

    if (
        provider_profile.location_source
        == ProviderProfile.LOCATION_SOURCE_MANUAL
    ):
        return True

    # --------------------------------------------------------
    # LIVE LOCATION
    # --------------------------------------------------------

    if (
        provider_profile.location_source
        == ProviderProfile.LOCATION_SOURCE_LIVE
    ):

        if (
            provider_profile.last_location_updated_at
            is None
        ):
            return False

        timeout_minutes = (
            marketplace_settings
            .live_location_timeout_minutes
        )

        expiry_time = (
            provider_profile
            .last_location_updated_at
            + timedelta(
                minutes=timeout_minutes
            )
        )

        if timezone.now() > expiry_time:
            return False

        return True

    return False


# ============================================================
# PROVIDER WEEKLY AVAILABILITY
# ============================================================

def provider_is_available_for_schedule(
    provider_profile,
    preferred_date,
    preferred_start_time,
    preferred_end_time,
):
    """
    Check whether the requested customer schedule fits
    completely inside one provider availability slot.

    Example:

        Provider availability:
            Monday 09:00 - 12:00

        Request 10:00 - 11:00
            -> True

        Request 11:00 - 13:00
            -> False
    """

    if not all(
        [
            preferred_date,
            preferred_start_time,
            preferred_end_time,
        ]
    ):
        return True

    if preferred_end_time <= preferred_start_time:
        return False

    day_of_week = preferred_date.weekday()

    return (
        ProviderAvailability.objects
        .filter(
            provider_profile=provider_profile,
            day_of_week=day_of_week,
            is_available=True,
            start_time__lte=preferred_start_time,
            end_time__gte=preferred_end_time,
        )
        .exists()
    )


# ============================================================
# PROVIDER BOOKING CONFLICT
# ============================================================
from service_requests.models import ServiceBooking

# ACTIVE marketplace booking flow
from services.models import Booking
def provider_has_booking_conflict(
    provider_profile,
    preferred_date,
    preferred_start_time,
    preferred_end_time,
):
    """
    Check whether the provider already has a booking occupying
    the requested time.

    Checks BOTH marketplace booking systems:

    1. ACTIVE marketplace:
       services.Booking

    2. Newer/parallel marketplace:
       service_requests.ServiceBooking

    Two ranges overlap when:

        existing_start < requested_end
        AND
        existing_end > requested_start

    Boundary-touching appointments are allowed.

    Example:

        Existing:
            10:00 - 11:00

        Request:
            11:00 - 12:00

        No conflict.
    """

    # =========================================================
    # SCHEDULE REQUIRED
    # =========================================================

    if not all(
        [
            preferred_date,
            preferred_start_time,
            preferred_end_time,
        ]
    ):
        return False

    # Invalid schedule should never be considered available.
    if preferred_end_time <= preferred_start_time:
        return True

    # =========================================================
    # ACTIVE MARKETPLACE BOOKING CONFLICT
    # services.Booking
    # =========================================================

    active_booking_conflict = (
        Booking.objects
        .filter(
            provider=provider_profile.provider,

            scheduled_date=preferred_date,

            status__in=[
                "assigned",
                "pending",
                "in_progress",
            ],

            scheduled_start_time__lt=(
                preferred_end_time
            ),

            scheduled_end_time__gt=(
                preferred_start_time
            ),
        )
        .exists()
    )

    if active_booking_conflict:
        return True

    # =========================================================
    # NEWER / PARALLEL BOOKING CONFLICT
    # service_requests.ServiceBooking
    # =========================================================

    service_booking_conflict = (
        ServiceBooking.objects
        .filter(
            provider_profile=provider_profile,

            scheduled_date=preferred_date,

            status__in=[
                "scheduled",
                "in_progress",
            ],

            scheduled_start_time__lt=(
                preferred_end_time
            ),

            scheduled_end_time__gt=(
                preferred_start_time
            ),
        )
        .exists()
    )

    if service_booking_conflict:
        return True

    return False


# ============================================================
# PROVIDER SCHEDULE ELIGIBILITY
# ============================================================

def provider_schedule_is_usable(
    provider_profile,
    schedule,
):
    """
    Determine whether the provider can receive a request
    for the customer's preferred schedule.

    If the customer did not choose a complete schedule,
    schedule filtering is skipped.
    """

    if not schedule["has_complete_schedule"]:
        return True

    preferred_date = (
        schedule["preferred_date"]
    )

    preferred_start_time = (
        schedule["preferred_start_time"]
    )

    preferred_end_time = (
        schedule["preferred_end_time"]
    )

    # Invalid range should never produce matches.
    if preferred_end_time <= preferred_start_time:
        return False

    # Provider must work during this period.
    if not provider_is_available_for_schedule(
        provider_profile,
        preferred_date,
        preferred_start_time,
        preferred_end_time,
    ):
        return False

    # Provider must not already be occupied.
    if provider_has_booking_conflict(
        provider_profile,
        preferred_date,
        preferred_start_time,
        preferred_end_time,
    ):
        return False

    return True


# ============================================================
# MATCH SCORE
# ============================================================

def calculate_match_score(
    provider_profile,
    distance_km,
    effective_radius_km,
):
    """
    Calculate provider ranking score.

    Distance contributes 80%.
    Provider rating contributes 20%.

    This score ranks eligible providers.
    It does not determine eligibility.
    """

    if effective_radius_km <= 0:
        return 0.0

    distance_ratio = min(
        distance_km / effective_radius_km,
        1.0,
    )

    distance_score = (
        1.0 - distance_ratio
    ) * 80.0

    try:
        rating = float(
            provider_profile.average_rating
            or 0
        )

    except (
        TypeError,
        ValueError,
    ):
        rating = 0.0

    rating = max(
        0.0,
        min(
            rating,
            5.0,
        ),
    )

    rating_score = (
        rating / 5.0
    ) * 20.0

    return round(
        distance_score + rating_score,
        2,
    )


# ============================================================
# FIND MATCHING PROVIDERS
# ============================================================

def find_matching_providers(
    service_request,
):
    """
    Find providers eligible for a customer service request.

    Provider must:

    - have active user account
    - be approved
    - have active provider profile
    - be available
    - be online
    - provide requested service
    - have valid current coordinates
    - have usable/fresh location
    - be inside effective service radius

    If customer selected preferred date/time:

    - provider must work during requested period
    - provider must not have another booking conflict

    Matching is coordinate based.

    City equality is intentionally NOT used.
    """

    # ========================================================
    # REQUEST LOCATION
    # ========================================================

    (
        request_latitude,
        request_longitude,
    ) = get_service_request_location(
        service_request
    )

    if (
        request_latitude is None
        or request_longitude is None
    ):
        return []

    # ========================================================
    # REQUEST SERVICE/CATEGORY
    # ========================================================

    request_category = (
        get_service_request_category(
            service_request
        )
    )

    if not request_category:
        return []

    # ========================================================
    # REQUEST SCHEDULE
    # ========================================================

    request_schedule = (
        get_service_request_schedule(
            service_request
        )
    )

    # ========================================================
    # MARKETPLACE SETTINGS
    # ========================================================

    marketplace_settings = (
        MarketplaceLocationSettings
        .get_settings()
    )

    if not (
        marketplace_settings
        .is_location_matching_enabled
    ):
        return []

    # ========================================================
    # PROVIDER DATABASE FILTER
    # ========================================================

    provider_profiles = (
        ProviderProfile.objects
        .filter(
            provider__is_active=True,
            provider__is_approved=True,

            is_profile_active=True,
            is_available=True,
            is_online=True,

            current_latitude__isnull=False,
            current_longitude__isnull=False,

            services__category=request_category,
            services__is_active=True,
        )
        .select_related(
            "provider",
        )
        .prefetch_related(
            "services",
            "availability_slots",
        )
        .distinct()
    )

    matches = []

    # ========================================================
    # PROVIDER MATCHING
    # ========================================================

    for provider_profile in provider_profiles:

        # ----------------------------------------------------
        # LOCATION FRESHNESS / VALIDITY
        # ----------------------------------------------------

        if not provider_location_is_usable(
            provider_profile,
            marketplace_settings,
        ):
            continue

        # ----------------------------------------------------
        # DISTANCE
        # ----------------------------------------------------

        distance_km = calculate_distance_km(
            request_latitude,
            request_longitude,
            provider_profile.current_latitude,
            provider_profile.current_longitude,
        )

        if distance_km is None:
            continue

        # ----------------------------------------------------
        # EFFECTIVE RADIUS
        # ----------------------------------------------------

        effective_radius_km = (
            get_effective_provider_radius(
                provider_profile,
                marketplace_settings,
            )
        )

        if distance_km > effective_radius_km:
            continue

        # ----------------------------------------------------
        # SCHEDULE AVAILABILITY
        # ----------------------------------------------------

        if not provider_schedule_is_usable(
            provider_profile,
            request_schedule,
        ):
            continue

        # ----------------------------------------------------
        # MATCH SCORE
        # ----------------------------------------------------

        match_score = calculate_match_score(
            provider_profile,
            distance_km,
            effective_radius_km,
        )

        # ----------------------------------------------------
        # PROVIDER PREFERRED RADIUS
        # ----------------------------------------------------

        if (
            provider_profile.service_radius_km
            is not None
        ):

            provider_preferred_radius = float(
                provider_profile
                .service_radius_km
            )

        else:

            provider_preferred_radius = float(
                marketplace_settings
                .default_provider_radius_km
            )

        # ----------------------------------------------------
        # RESULT
        # ----------------------------------------------------

        match_data = {
            "provider_profile": (
                provider_profile
            ),

            "distance_km": (
                distance_km
            ),

            "provider_preferred_radius_km": (
                provider_preferred_radius
            ),

            "admin_max_radius_km": float(
                marketplace_settings
                .max_provider_radius_km
            ),

            "effective_radius_km": (
                effective_radius_km
            ),

            "match_score": (
                match_score
            ),
        }

        # ----------------------------------------------------
        # SCHEDULE INFORMATION
        # ----------------------------------------------------

        if request_schedule[
            "has_complete_schedule"
        ]:

            match_data[
                "schedule_matched"
            ] = True

            match_data[
                "preferred_date"
            ] = request_schedule[
                "preferred_date"
            ]

            match_data[
                "preferred_start_time"
            ] = request_schedule[
                "preferred_start_time"
            ]

            match_data[
                "preferred_end_time"
            ] = request_schedule[
                "preferred_end_time"
            ]

        else:

            match_data[
                "schedule_matched"
            ] = None

        matches.append(
            match_data
        )

    # ========================================================
    # BEST MATCHES FIRST
    # ========================================================

    matches.sort(
        key=lambda match: (
            -match["match_score"],
            match["distance_km"],
        )
    )

    return matches