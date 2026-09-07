from django.utils import timezone


ALLOWED_PROVIDER_TRANSITIONS = {
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


def can_transition_booking(
    booking,
    new_status,
):
    """
    Check whether a provider is allowed to move
    a booking from its current status to new_status.
    """

    allowed_statuses = (
        ALLOWED_PROVIDER_TRANSITIONS.get(
            booking.status,
            set(),
        )
    )

    return new_status in allowed_statuses


def transition_booking(
    booking,
    new_status,
):
    """
    Perform a validated booking status transition.
    """

    if not can_transition_booking(
        booking,
        new_status,
    ):
        raise ValueError(
            (
                f"Cannot change booking status "
                f"from '{booking.status}' "
                f"to '{new_status}'."
            )
        )

    booking.status = new_status

    if new_status == "completed":
        booking.completed_at = timezone.now()

    booking.save(
        update_fields=[
            "status",
            "completed_at",
            "updated_at",
        ]
    )

    return booking