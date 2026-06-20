from django.urls import path

from .views import (
    admin_dashboard,
    pending_providers,
    approve_provider,
    reject_provider,
    service_categories,
    create_service_category,
    update_service_category,
    delete_service_category,
    
    activate_provider,
    deactivate_provider,
    verify_provider,
    unverify_provider,
    all_customers,
    activate_customer,
    deactivate_customer,
    all_service_requests,
    all_bookings,
    all_quotes,
    provider_performance,
    all_providers,
)

urlpatterns = [
    path("dashboard/", admin_dashboard, name="admin_dashboard"),

    path("providers/pending/", pending_providers, name="pending_providers"),
    path("providers/<int:provider_id>/approve/", approve_provider, name="approve_provider"),
    path("providers/<int:provider_id>/reject/", reject_provider, name="reject_provider"),

    path("services/", service_categories, name="service_categories"),
    path("services/create/", create_service_category, name="create_service_category"),
    path("services/<int:service_id>/update/", update_service_category, name="update_service_category"),
    path("services/<int:service_id>/delete/", delete_service_category, name="delete_service_category"),
    
    path("providers/<int:provider_id>/activate/", activate_provider, name="activate_provider"),
    path("providers/<int:provider_id>/deactivate/", deactivate_provider, name="deactivate_provider"),
    path("providers/<int:provider_id>/verify/", verify_provider, name="verify_provider"),
    path("providers/<int:provider_id>/unverify/", unverify_provider, name="unverify_provider"),
    path("customers/", all_customers, name="all_customers"),
    path("customers/<int:customer_id>/activate/", activate_customer, name="activate_customer"),
    path("customers/<int:customer_id>/deactivate/", deactivate_customer, name="deactivate_customer"),
    path("requests/", all_service_requests, name="all_service_requests"),
    path("bookings/", all_bookings, name="all_bookings"),
    path("quotes/", all_quotes, name="all_quotes"),
    path("provider-performance/", provider_performance, name="provider_performance"),
    path("providers/", all_providers, name="all_providers"),
]