from django.urls import path

from providers.views import (
    provider_availability_api,
    provider_availability_detail_api,
    provider_dashboard,
    provider_job_detail,
    provider_jobs,
    provider_location_api,
    provider_profile_api,
    provider_service_area_api,
    provider_service_list_create_api,
    schedule_provider_job,
    start_provider_job,
)


urlpatterns = [
    path(
        "profile/",
        provider_profile_api,
        name="provider-profile",
    ),

    path(
        "services/",
        provider_service_list_create_api,
        name="provider-service-list-create",
    ),

    path(
        "availability/",
        provider_availability_api,
        name="provider-availability",
    ),

    path(
        "service-areas/",
        provider_service_area_api,
        name="provider-service-area",
    ),
    path(
        "dashboard/",
        provider_dashboard,
        name="provider-dashboard",
    ),
    path(
    "jobs/",
    provider_jobs,
    name="provider-jobs",
),

path(
    "jobs/<int:booking_id>/",
    provider_job_detail,
    name="provider-job-detail",
),
path(
    "jobs/<int:booking_id>/schedule/",
    schedule_provider_job,
    name="schedule-provider-job",
),
path(
    "jobs/<int:booking_id>/start/",
    start_provider_job,
    name="start-provider-job",
),
path(
    "location/",
    provider_location_api,
    name="provider-location",
),
path(
    "availability/<int:slot_id>/",
    provider_availability_detail_api,
    name="provider-availability-detail",
),
]