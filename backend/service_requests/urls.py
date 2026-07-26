from django.urls import path

from .views import customer_service_request_list_create_api


urlpatterns = [
    path(
        "",
        customer_service_request_list_create_api,
        name="customer-service-request-list-create",
    ),
]