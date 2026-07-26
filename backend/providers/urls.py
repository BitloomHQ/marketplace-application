from django.urls import path

from providers.views import (
    provider_availability_api,
    provider_profile_api,
    provider_service_area_api,
    provider_service_list_create_api,
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
]