from accounts.helpers import media_url


def serialize_provider_job(
    booking,
    request=None,
):
    """
    Serialize a ServiceBooking for
    provider-facing APIs.
    """

    service_request = booking.service_request
    customer = booking.customer

    # =========================================================
    # CUSTOMER PROFILE
    # =========================================================

    customer_picture = media_url(
        request,
        customer.profile_picture,
    )

    # =========================================================
    # ACTION FLAGS
    # =========================================================

    can_schedule = (
        booking.status == "accepted"
    )

    can_start = (
        booking.status == "scheduled"
    )

    can_complete = (
        booking.status == "in_progress"
    )

    can_cancel = (
        booking.status in [
            "accepted",
            "scheduled",
        ]
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

        # -----------------------------------------------------
        # SERVICE
        # -----------------------------------------------------

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

        # -----------------------------------------------------
        # SERVICE REQUEST
        # -----------------------------------------------------

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

        # -----------------------------------------------------
        # CUSTOMER
        # -----------------------------------------------------

        "customer": {
            "id": customer.id,

            "username": (
                customer.username
            ),

            "full_name": (
                customer.get_full_name()
                or customer.username
            ),

            "profile_picture": (
                customer_picture
            ),
        },

        # -----------------------------------------------------
        # SCHEDULE
        # -----------------------------------------------------

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

        # -----------------------------------------------------
        # LOCATION
        # -----------------------------------------------------

        "location": {
            "address": (
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
        },

        # -----------------------------------------------------
        # CANCELLATION
        # -----------------------------------------------------

        "cancellation": {
            "is_cancelled": (
                booking.status == "cancelled"
            ),

            "reason": (
                booking.cancellation_reason
                or None
            ),
        },

        # -----------------------------------------------------
        # ACTIONS
        # -----------------------------------------------------

        "available_actions": {
            "can_schedule": can_schedule,
            "can_start": can_start,
            "can_complete": can_complete,
            "can_cancel": can_cancel,
        },

        # -----------------------------------------------------
        # TIMESTAMPS
        # -----------------------------------------------------

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