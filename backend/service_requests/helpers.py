from accounts.helpers import media_url


def build_request_tracking(service_request):
    """
    Build frontend-friendly progress tracking
    for a customer service request.
    """

    lifecycle = [
        {
            "key": "open",
            "label": "Request Created",
        },
        {
            "key": "matched",
            "label": "Providers Matched",
        },
        {
            "key": "quoted",
            "label": "Quotation Received",
        },
        {
            "key": "accepted",
            "label": "Quotation Accepted",
        },
        {
            "key": "in_progress",
            "label": "Work In Progress",
        },
        {
            "key": "completed",
            "label": "Completed",
        },
    ]

    current_status = service_request.status

    # =========================================================
    # SPECIAL STATES
    # =========================================================

    is_cancelled = (
        current_status == "cancelled"
    )

    is_expired = (
        current_status == "expired"
    )

    is_draft = (
        current_status == "draft"
    )

    # =========================================================
    # CURRENT POSITION
    # =========================================================

    lifecycle_keys = [
        step["key"]
        for step in lifecycle
    ]

    current_index = None

    if current_status in lifecycle_keys:
        current_index = lifecycle_keys.index(
            current_status
        )

    # =========================================================
    # BUILD STEPS
    # =========================================================

    steps = []

    for index, step in enumerate(lifecycle):

        completed = False
        current = False

        if current_index is not None:

            completed = (
                index <= current_index
            )

            current = (
                index == current_index
            )

        steps.append(
            {
                "key": step["key"],
                "label": step["label"],
                "completed": completed,
                "current": current,
            }
        )

    # =========================================================
    # PROGRESS PERCENTAGE
    # =========================================================

    progress_percentage = 0

    if current_index is not None:

        progress_percentage = round(
            (
                (current_index + 1)
                / len(lifecycle)
            )
            * 100
        )

    if is_draft:
        progress_percentage = 0

    # =========================================================
    # RETURN
    # =========================================================

    return {
        "current_status": current_status,

        "progress_percentage": (
            progress_percentage
        ),

        "is_draft": is_draft,

        "is_cancelled": is_cancelled,

        "is_expired": is_expired,

        "steps": steps,
    }


def serialize_customer_booking(
    booking,
    request=None,
):
    """
    Serialize ServiceBooking data for
    customer-facing APIs.
    """

    service_request = (
        booking.service_request
    )

    provider_profile = (
        booking.provider_profile
    )

    provider = (
        provider_profile.provider
    )

    # =========================================================
    # PROVIDER PROFILE PICTURE
    # =========================================================

    profile_picture = media_url(
        request,
        provider.profile_picture,
    )

    # =========================================================
    # REVIEW
    # =========================================================

    review = getattr(
        booking,
        "review",
        None,
    )

    review_data = None

    if review:

        review_data = {
            "id": review.id,

            "rating": (
                review.rating
            ),

            "review": (
                review.review
            ),

            "created_at": (
                review.created_at
            ),

            "updated_at": (
                review.updated_at
            ),
        }

    # =========================================================
    # REQUEST TRACKING
    # =========================================================

    tracking = build_request_tracking(
        service_request
    )

    # =========================================================
    # RESPONSE
    # =========================================================

    return {
        "booking_id": booking.id,

        "status": booking.status,

        "final_price": str(
            booking.final_price
        ),

        # =====================================================
        # SERVICE REQUEST
        # =====================================================

        "service_request": {
            "id": str(
                service_request.id
            ),

            "title": (
                service_request.title
            ),

            "description": (
                service_request.description
            ),

            "urgency": (
                service_request.urgency
            ),

            "status": (
                service_request.status
            ),

            "preferred_date": (
                service_request.preferred_date
            ),

            "preferred_start_time": (
                service_request
                .preferred_start_time
            ),

            "preferred_end_time": (
                service_request
                .preferred_end_time
            ),
        },

        # =====================================================
        # SERVICE
        # =====================================================

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

        # =====================================================
        # PROVIDER
        # =====================================================

        "provider": {
            "id": provider.id,

            "username": (
                provider.username
            ),

            "full_name": (
                provider.get_full_name()
                or provider.username
            ),

            "email": (
                provider.email
            ),

            "phone": (
                provider.phone
            ),

            "profile_picture": (
                profile_picture
            ),

            "is_verified": (
                provider.is_verified
            ),

            "experience_years": (
                provider.experience_years
            ),

            "bio": (
                provider.bio
                or None
            ),
        },

        # =====================================================
        # SCHEDULE
        # =====================================================

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

        # =====================================================
        # LOCATION
        # =====================================================

        "location": {
            "address": (
                service_request
                .service_address
            ),

            "city": (
                service_request.city
            ),

            "state": (
                service_request.state
            ),

            "postal_code": (
                service_request
                .postal_code
            ),

            "latitude": (
                service_request.latitude
            ),

            "longitude": (
                service_request.longitude
            ),
        },

        # =====================================================
        # TRACKING
        # =====================================================

        "tracking": tracking,

        # =====================================================
        # REVIEW
        # =====================================================

        "has_review": (
            review is not None
        ),

        "can_review": (
            booking.status == "completed"
            and review is None
        ),

        "review": review_data,

        # =====================================================
        # CANCELLATION
        # =====================================================

        "cancellation": {
            "is_cancelled": (
                booking.status
                == "cancelled"
            ),

            "reason": (
                booking.cancellation_reason
                or None
            ),
        },

        # =====================================================
        # TIMESTAMPS
        # =====================================================

        "created_at": (
            booking.created_at
        ),

        "updated_at": (
            booking.updated_at
        ),

        "completed_at": (
            booking.completed_at
        ),
    }