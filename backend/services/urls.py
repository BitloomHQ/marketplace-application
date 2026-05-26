from django.urls import path

from .views import (
    create_service_request,
    provider_leads,
    send_quote,
    view_quotes,
    select_provider,
    my_bookings,
    update_booking_status,
    submit_review,
    my_requests,
    get_notifications,
    mark_notifications_read,
    get_profile,
    update_profile,
    update_service_type,
)

urlpatterns = [

    path(
        "create/",
        create_service_request,
        name="create_service_request"
    ),

    path(
        "provider-leads/",
        provider_leads,
        name="provider_leads"
    ),

    path(
        "send-quote/",
        send_quote,
        name="send_quote"
    ),

    path(
        "view-quotes/<int:request_id>/",
        view_quotes,
        name="view_quotes"
    ),

    path(
        "select-provider/",
        select_provider,
        name="select_provider"
    ),

    path(
        "my-bookings/",
        my_bookings,
        name="my_bookings"
    ),

    path(
        "update-booking-status/",
        update_booking_status,
        name="update_booking_status"
    ),

    path(
        "submit-review/",
        submit_review,
        name="submit_review"
    ),
    path(
    "my-requests/",
    my_requests,
    name="my_requests"
),
path(
    "notifications/",
    get_notifications,
    name="get_notifications"
),

path(
    "notifications/mark-read/",
    mark_notifications_read,
    name="mark_notifications_read"
),
path(
    "profile/",
    get_profile,
    name="get_profile"
),

path(
    "update-profile/",
    update_profile,
    name="update_profile"
),
path(
    "update-service-type/",
    update_service_type,
    name="update_service_type"
),
]