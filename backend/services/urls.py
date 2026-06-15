from django.urls import path

from .views import (

    # SERVICE REQUESTS
    create_service_request,
    provider_leads,
    my_requests,

    # QUOTES
    send_quote,
    view_quotes,
    select_provider,

    # BOOKINGS
    my_bookings,
    update_booking_status,

    # REVIEWS
    submit_review,

    # NOTIFICATIONS
    get_notifications,
    mark_notifications_read,

    # PROFILE
    get_profile,
    update_profile,
    view_lead_detail,
)


urlpatterns = [

    # =========================================
    # SERVICE REQUESTS
    # =========================================
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
        "my-requests/",
        my_requests,
        name="my_requests"
    ),

    # =========================================
    # QUOTES
    # =========================================
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

    # =========================================
    # BOOKINGS
    # =========================================
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

    # =========================================
    # REVIEWS
    # =========================================
    path(
        "submit-review/",
        submit_review,
        name="submit_review"
    ),

    # =========================================
    # NOTIFICATIONS
    # =========================================
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

    # =========================================
    # PROFILE
    # =========================================
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
    path("lead/<int:request_id>/",view_lead_detail,name="view_lead_detail"),
]