from django.urls import path

from .views import (
    RegisterView,
    login_api,
    
)

from django.urls import path

from .views import (

    RegisterView,

    login_api,

    dashboard_api,

    providers_by_service,

    customer_dashboard,
    
    add_address,

    my_addresses,

    delete_address,
    maps_status,
    maps_autocomplete,
    maps_place_details,
    maps_geocode_address,
    maps_reverse_geocode,
    edit_address,
)


urlpatterns = [

    # =====================================
    # AUTHENTICATION
    # =====================================

    path(
        'register/',
        RegisterView.as_view(),
        name='register'
    ),

    path(
        'login/',
        login_api,
        name='login'
    ),

    # =====================================
    # DASHBOARD
    # =====================================

    path(
        'dashboard/',
        dashboard_api,
        name='dashboard'
    ),

    path(
        'customer-dashboard/',
        customer_dashboard,
        name='customer_dashboard'
    ),

    # =====================================
    # PROVIDERS
    # =====================================

    path(
        'providers/',
        providers_by_service,
        name='providers_dashboard'
    ),
    path("add-address/", add_address,name='add_address'),
    path("my-addresses/", my_addresses,name='my_addresses'),
    path("delete-address/<int:address_id>/", delete_address,name='delete_address'),
    path("maps/status/", maps_status, name="maps_status"),
    path("maps/autocomplete/", maps_autocomplete, name="maps_autocomplete"),
    path("maps/place-details/", maps_place_details, name="maps_place_details"),
    path("maps/geocode-address/", maps_geocode_address, name="maps_geocode_address"),
    path("maps/reverse-geocode/", maps_reverse_geocode, name="maps_reverse_geocode"),
    path("edit-address/<int:address_id>/",edit_address,name="edit_address"),
]