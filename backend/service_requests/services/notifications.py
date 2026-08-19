from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from service_requests.models import ServiceNotification


def send_websocket_notification(notification):
    """
    Send an already-created ServiceNotification
    to the user's existing WebSocket group.
    """

    channel_layer = get_channel_layer()

    if channel_layer is None:
        return

    async_to_sync(
        channel_layer.group_send
    )(
        f"user_{notification.user_id}",
        {
            "type": "send_notification",
            "data": {
                "id": notification.id,
                "notification_type": (
                    notification.notification_type
                ),
                "title": notification.title,
                "message": notification.message,
                "service_request_id": (
                    str(notification.service_request_id)
                    if notification.service_request_id
                    else None
                ),
                "booking_id": notification.booking_id,
                "is_read": notification.is_read,
                "created_at": (
                    notification.created_at.isoformat()
                ),
            },
        },
    )


def create_notification(
    *,
    user,
    notification_type,
    title,
    message,
    service_request=None,
    booking=None,
):
    """
    Create notification in database and immediately
    send it through the existing WebSocket connection.
    """

    if not user:
        raise ValueError(
            "A user is required to create a notification."
        )

    if notification_type not in dict(
        ServiceNotification.TYPE_CHOICES
    ):
        raise ValueError(
            f"Invalid notification type: {notification_type}"
        )

    # ---------------------------------------------------------
    # SAVE DATABASE NOTIFICATION
    # ---------------------------------------------------------

    notification = ServiceNotification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        service_request=service_request,
        booking=booking,
    )

    # ---------------------------------------------------------
    # SEND REAL-TIME WEBSOCKET NOTIFICATION
    # ---------------------------------------------------------

    send_websocket_notification(
        notification
    )

    return notification


def notify_matching_providers(
    service_request,
    matched_providers,
):
    """
    Notify every provider matched with a new
    customer service request.
    """

    notifications = []

    for match in matched_providers:

        provider_profile = match.get(
            "provider_profile"
        )

        if not provider_profile:
            continue

        provider_user = provider_profile.provider

        notification = create_notification(
            user=provider_user,
            notification_type="new_request",
            title="New service request",
            message=(
                f"A new {service_request.category.name} "
                f"service request is available in your area."
            ),
            service_request=service_request,
        )

        notifications.append(
            notification
        )

    return notifications