from django.urls import path

from .views import (
    booking_review_api,
    customer_service_request_list_create_api,
    matched_providers_api,
    provider_leads_api,
    provider_lead_detail_api,
    provider_reviews_api,
    submit_quotation_api,
    customer_request_quotations_api,
    accept_quotation_api,
    my_bookings_api,
    booking_detail_api,
    start_booking_api,
    complete_booking_api,
    cancel_booking_api,
    submit_review_api,
    notifications_api,
    mark_notification_read_api,
    mark_all_notifications_read_api,
    
    
)


urlpatterns = [

    # =========================================================
    # CUSTOMER SERVICE REQUESTS
    # =========================================================

    # GET  -> Get customer's service requests
    # POST -> Create a new service request
    path(
        "",
        customer_service_request_list_create_api,
        name="customer-service-request-list-create",
    ),

    # =========================================================
    # MATCHED PROVIDERS
    # =========================================================

    # GET -> Get ranked providers matching a service request
    path(
        "<uuid:request_id>/matched-providers/",
        matched_providers_api,
        name="matched-providers",
    ),

    # =========================================================
    # PROVIDER LEADS
    # =========================================================

    # GET -> Get service requests matching logged-in provider
    path(
        "provider-leads/",
        provider_leads_api,
        name="provider-leads",
    ),
    path(
    "provider-leads/<uuid:request_id>/",
    provider_lead_detail_api,
    name="provider-lead-detail",
),
path(
    "provider-leads/<uuid:request_id>/quotation/",
    submit_quotation_api,
    name="submit-provider-quotation",
),
path(
    "<uuid:request_id>/quotations/",
    customer_request_quotations_api,
    name="customer-request-quotations",
),
path(
    "<uuid:request_id>/quotations/<int:quotation_id>/accept/",
    accept_quotation_api,
    name="accept-quotation",
),
# ============================================================
# BOOKING APIs
# ============================================================

path(
    "bookings/",
    my_bookings_api,
    name="my-bookings",
),

path(
    "bookings/<int:booking_id>/",
    booking_detail_api,
    name="booking-detail",
),

path(
    "bookings/<int:booking_id>/start/",
    start_booking_api,
    name="start-booking",
),

path(
    "bookings/<int:booking_id>/complete/",
    complete_booking_api,
    name="complete-booking",
),

path(
    "bookings/<int:booking_id>/cancel/",
    cancel_booking_api,
    name="cancel-booking",
),
path(
    "bookings/<int:booking_id>/review/",
    submit_review_api,
    name="submit-review",
),
path(
    "bookings/<int:booking_id>/review/details/",
    booking_review_api,
    name="booking-review-details",
),
path(
    "providers/<int:provider_id>/reviews/",
    provider_reviews_api,
    name="provider-reviews",
),
# ============================================================
# NOTIFICATIONS
# ============================================================

path(
    "notifications/",
    notifications_api,
    name="notifications",
),

path(
    "notifications/<int:notification_id>/read/",
    mark_notification_read_api,
    name="mark-notification-read",
),

path(
    "notifications/read-all/",
    mark_all_notifications_read_api,
    name="mark-all-notifications-read",
),
]