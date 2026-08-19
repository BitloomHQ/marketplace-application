from math import radians, sin, cos, sqrt, atan2

from providers.models import ProviderProfile
from service_requests.models import CustomerServiceRequest


# ============================================================
# DISTANCE CALCULATION
# ============================================================

def calculate_distance_km(
    lat1,
    lon1,
    lat2,
    lon2,
):
    """
    Calculate straight-line distance between two geographic
    coordinates using the Haversine formula.

    Returns distance in kilometers.
    """

    if None in (lat1, lon1, lat2, lon2):
        return None

    # DecimalField values may be Decimal objects.
    # Convert them to float before doing math calculations.
    lat1 = float(lat1)
    lon1 = float(lon1)
    lat2 = float(lat2)
    lon2 = float(lon2)

    earth_radius_km = 6371.0

    lat1_rad = radians(lat1)
    lon1_rad = radians(lon1)
    lat2_rad = radians(lat2)
    lon2_rad = radians(lon2)

    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad)
        * cos(lat2_rad)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a),
    )

    return earth_radius_km * c


# ============================================================
# SERVICE AREA MATCHING
# ============================================================

def provider_matches_location(
    provider_profile,
    service_request,
):
    """
    Check whether the customer's requested location falls
    inside at least one active service area of the provider.
    """

    # --------------------------------------------------------
    # Customer has coordinates
    # --------------------------------------------------------

    if (
        service_request.latitude is not None
        and service_request.longitude is not None
    ):
        for area in provider_profile.service_areas.all():

            if not area.is_active:
                continue

            if (
                area.latitude is None
                or area.longitude is None
            ):
                continue

            distance = calculate_distance_km(
                service_request.latitude,
                service_request.longitude,
                area.latitude,
                area.longitude,
            )

            if distance is None:
                continue

            if distance <= area.service_radius_km:
                return True

        return False

    # --------------------------------------------------------
    # Fallback when coordinates are unavailable
    # --------------------------------------------------------
    # Use city + state matching.

    request_city = (
        service_request.city or ""
    ).strip().lower()

    request_state = (
        service_request.state or ""
    ).strip().lower()

    for area in provider_profile.service_areas.all():

        if not area.is_active:
            continue

        area_city = (
            area.city or ""
        ).strip().lower()

        area_state = (
            area.state or ""
        ).strip().lower()

        if (
            request_city == area_city
            and request_state == area_state
        ):
            return True

    return False
def get_provider_distance(
    provider_profile,
    service_request,
):
    """
    Return the shortest distance between the customer's
    requested location and any active provider service area.

    Returns None when coordinates are unavailable.
    """

    if (
        service_request.latitude is None
        or service_request.longitude is None
    ):
        return None

    distances = []

    for area in provider_profile.service_areas.all():

        if not area.is_active:
            continue

        if (
            area.latitude is None
            or area.longitude is None
        ):
            continue

        distance = calculate_distance_km(
            service_request.latitude,
            service_request.longitude,
            area.latitude,
            area.longitude,
        )

        if distance is not None:
            distances.append(distance)

    if not distances:
        return None

    return round(min(distances), 2)

# ============================================================
# FIND MATCHING PROVIDERS
# ============================================================
def provider_matches_availability(
    provider_profile,
    service_request,
):
    """
    Check whether the provider is available for the
    customer's preferred date and time.

    Rules:
    1. If no preferred date is provided, do not restrict matching.
    2. Match the provider's day_of_week with preferred_date.
    3. Provider availability slot must be active.
    4. Requested time must fit inside provider's availability slot.
    5. Emergency requests require accepts_emergency_work=True.
    """

    # --------------------------------------------------------
    # EMERGENCY CHECK
    # --------------------------------------------------------

    if (
        service_request.urgency == "emergency"
        and not provider_profile.accepts_emergency_work
    ):
        return False

    # --------------------------------------------------------
    # NO PREFERRED DATE
    # --------------------------------------------------------
    # preferred_date is optional in your model.
    # If customer hasn't selected one, availability should
    # not remove the provider from matching.

    if service_request.preferred_date is None:
        return True

    # Python weekday():
    # Monday = 0
    # Tuesday = 1
    # ...
    # Sunday = 6
    #
    # This exactly matches ProviderAvailability.DAY_CHOICES.

    requested_day = service_request.preferred_date.weekday()

    availability_slots = (
        provider_profile.availability_slots
        .filter(
            day_of_week=requested_day,
            is_available=True,
        )
    )

    if not availability_slots.exists():
        return False

    requested_start = service_request.preferred_start_time
    requested_end = service_request.preferred_end_time

    # --------------------------------------------------------
    # DATE PROVIDED BUT NO SPECIFIC TIME
    # --------------------------------------------------------

    if requested_start is None and requested_end is None:
        return True

    # --------------------------------------------------------
    # CHECK EACH AVAILABILITY SLOT
    # --------------------------------------------------------

    for slot in availability_slots:

        # An available slot should normally contain both times.
        if (
            slot.start_time is None
            or slot.end_time is None
        ):
            continue

        # Customer provided both start and end time.
        if (
            requested_start is not None
            and requested_end is not None
        ):
            if (
                slot.start_time <= requested_start
                and slot.end_time >= requested_end
            ):
                return True

        # Only preferred start time supplied.
        elif requested_start is not None:
            if (
                slot.start_time <= requested_start
                < slot.end_time
            ):
                return True

        # Only preferred end time supplied.
        elif requested_end is not None:
            if (
                slot.start_time < requested_end
                <= slot.end_time
            ):
                return True

    return False

def provider_matches_budget(
    provider_profile,
    service_request,
):
    """
    Check whether the provider fits the customer's budget.

    Rules:
    1. If customer has no budget, do not filter provider.
    2. Provider minimum booking amount must not exceed budget_max.
    3. Fixed/base-price services must not exceed budget_max.
    4. Quotation-based services are allowed because final price
       is decided later through quotes.
    """

    budget_max = service_request.budget_max

    # Customer did not specify maximum budget
    if budget_max is None:
        return True

    # --------------------------------------------------------
    # PROVIDER MINIMUM BOOKING AMOUNT
    # --------------------------------------------------------

    minimum_booking = provider_profile.minimum_booking_amount

    if (
        minimum_booking is not None
        and minimum_booking > budget_max
    ):
        return False

    # --------------------------------------------------------
    # FIND PROVIDER'S SERVICE FOR THIS CATEGORY
    # --------------------------------------------------------

    provider_service = (
        provider_profile.services
        .filter(
            category=service_request.category,
            is_active=True,
        )
        .first()
    )

    if provider_service is None:
        return False

    # Quotation-based work has no exact price yet.
    if provider_service.pricing_type == "quotation":
        return True

    # Other pricing types may have a base price.
    if (
        provider_service.base_price is not None
        and provider_service.base_price > budget_max
    ):
        return False

    return True


def find_matching_providers(service_request):
    """
    Find providers matching the customer service request.

    Matching rules:

    1. Provider account is active.
    2. Provider account is approved.
    3. Provider profile is active.
    4. Provider is currently available.
    5. Provider offers the requested category.
    6. Provider service is active.
    7. Customer location is inside provider service area.
    8. Provider matches requested date/time availability.
    9. Provider matches customer budget.
    10. Providers are ranked using match score.
    11. Distance is included in ranking.
    """

    if not isinstance(
        service_request,
        CustomerServiceRequest,
    ):
        raise ValueError(
            "service_request must be a "
            "CustomerServiceRequest instance."
        )

    # ========================================================
    # STEP 1: BASIC PROVIDER MATCHING
    # ========================================================

    candidate_providers = (
        ProviderProfile.objects
        .filter(
            provider__is_active=True,
            provider__is_approved=True,

            is_profile_active=True,
            is_available=True,

            services__category=service_request.category,
            services__is_active=True,
        )
        .select_related(
            "provider",
        )
        .prefetch_related(
            "services",
            "availability_slots",
            "service_areas",
        )
        .distinct()
    )

    # ========================================================
    # STEP 2-4: FILTER PROVIDERS
    # ========================================================

    matching_providers = []

    for provider_profile in candidate_providers:

        # ----------------------------------------------------
        # STEP 2: LOCATION / SERVICE RADIUS
        # ----------------------------------------------------

        if not provider_matches_location(
            provider_profile,
            service_request,
        ):
            continue

        # ----------------------------------------------------
        # STEP 3: DATE / TIME AVAILABILITY
        # ----------------------------------------------------

        if not provider_matches_availability(
            provider_profile,
            service_request,
        ):
            continue

        # ----------------------------------------------------
        # STEP 4: BUDGET
        # ----------------------------------------------------

        if not provider_matches_budget(
            provider_profile,
            service_request,
        ):
            continue

        matching_providers.append(
            provider_profile
        )

    # ========================================================
    # STEP 5: DISTANCE + MATCH SCORE
    # ========================================================

    ranked_providers = []

    for provider_profile in matching_providers:

        distance_km = get_provider_distance(
            provider_profile,
            service_request,
        )

        score = calculate_provider_match_score(
            provider_profile,
            service_request,
            distance_km=distance_km,
        )

        ranked_providers.append(
            {
                "provider_profile": provider_profile,
                "distance_km": distance_km,
                "match_score": score,
            }
        )

    # ========================================================
    # SORT BEST PROVIDERS FIRST
    # ========================================================

    ranked_providers.sort(
        key=lambda item: (
            -item["match_score"],
            (
                item["distance_km"]
                if item["distance_km"] is not None
                else float("inf")
            ),
        )
    )

    return ranked_providers

def calculate_provider_match_score(
    provider_profile,
    service_request,
    distance_km=None,
):
    """
    Calculate a ranking score for an already-matched provider.

    Higher score = better recommendation.
    """

    score = 0

    # --------------------------------------------------------
    # RATING
    # Maximum contribution: 50 points
    # --------------------------------------------------------

    rating = float(
        provider_profile.average_rating or 0
    )

    score += rating * 10

    # Example:
    # 4.8 rating = 48 points


    # --------------------------------------------------------
    # COMPLETED JOBS
    # Maximum contribution: 20 points
    # --------------------------------------------------------

    completed_jobs = (
        provider_profile.completed_jobs or 0
    )

    score += min(
        completed_jobs,
        20,
    )


    # --------------------------------------------------------
    # EMERGENCY SUPPORT
    # --------------------------------------------------------

    if (
        service_request.urgency == "emergency"
        and provider_profile.accepts_emergency_work
    ):
        score += 15


    # --------------------------------------------------------
    # SERVICE PRICE / BUDGET FIT
    # Maximum contribution: 15 points
    # --------------------------------------------------------

    if service_request.budget_max is not None:

        provider_service = (
            provider_profile.services
            .filter(
                category=service_request.category,
                is_active=True,
            )
            .first()
        )

        if provider_service:

            if provider_service.pricing_type == "quotation":
                score += 5

            elif provider_service.base_price is not None:

                base_price = float(
                    provider_service.base_price
                )

                budget_max = float(
                    service_request.budget_max
                )

                if budget_max > 0:

                    ratio = base_price / budget_max

                    if ratio <= 0.70:
                        score += 15

                    elif ratio <= 0.85:
                        score += 10

                    elif ratio <= 1:
                        score += 5

    return round(score, 2)