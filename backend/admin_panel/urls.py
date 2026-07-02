from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('providers/pending/', views.pending_providers, name='admin_pending_providers'),
    path('providers/<int:provider_id>/approve/', views.approve_provider, name='admin_approve_provider'),
    path('providers/<int:provider_id>/reject/', views.reject_provider, name='admin_reject_provider'),
    path('providers/', views.all_providers, name='admin_all_providers'),
    path('providers/<int:provider_id>/activate/', views.activate_provider, name='admin_activate_provider'),
    path('providers/<int:provider_id>/deactivate/', views.deactivate_provider, name='admin_deactivate_provider'),
    path('providers/<int:provider_id>/verify/', views.verify_provider, name='admin_verify_provider'),
    path('providers/<int:provider_id>/unverify/', views.unverify_provider, name='admin_unverify_provider'),
    path('services/', views.list_services, name='admin_list_services'),
    path('services/create/', views.create_service, name='admin_create_service'),
    path('services/<int:service_id>/update/', views.update_service, name='admin_update_service'),
    path('services/<int:service_id>/delete/', views.delete_service, name='admin_delete_service'),
    path('customers/', views.all_customers, name='admin_all_customers'),
    path('customers/<int:customer_id>/activate/', views.activate_customer, name='admin_activate_customer'),
    path('customers/<int:customer_id>/deactivate/', views.deactivate_customer, name='admin_deactivate_customer'),
    path('requests/', views.all_requests, name='admin_all_requests'),
    path('bookings/', views.all_bookings, name='admin_all_bookings'),
    path('quotes/', views.all_quotes, name='admin_all_quotes'),
    path('provider-performance/', views.provider_performance, name='admin_provider_performance'),
]
