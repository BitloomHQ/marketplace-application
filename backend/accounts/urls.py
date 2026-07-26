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
    edit_address,
    maps_status,
    maps_autocomplete,
    maps_place_details,
    maps_geocode_address,
    maps_reverse_geocode,
    edit_address,
    active_services,
    change_password,
    forgot_password,
    reset_password,
    register,
    resend_email_otp,
    verify_email,
    account_status_api,
    logout_all_api,
    delete_profile_image_api,
    profile_completion_api,
    update_profile_api,
    upload_profile_image_api,
    view_profile_api,
    profile_image_api,

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
    path("active-services/",active_services,name="active_services"),
    path("change-password/",change_password,name="change_password"),
    path("forgot-password/",forgot_password,name="forgot_password"),
    path("reset-password/",reset_password,name="reset_password"),
    path(
        "register/",
        register,
        name="register"
    ),

    path(
        "verify-email/",
        verify_email,
        name="verify-email"
    ),

    path(
        "resend-email-otp/",
        resend_email_otp,
        name="resend-email-otp"
    ),
    path(
    "logout-all/",
    logout_all_api,
    name="logout-all",
),

path(
    "account-status/",
    account_status_api,
    name="account-status",
),

path(
    "profile/",
    view_profile_api,
    name="view-profile",
),

path(
    "profile/update/",
    update_profile_api,
    name="update-profile",
),

path(
    "profile/image/",
    upload_profile_image_api,
    name="upload-profile-image",
),

path(
    "profile/image/delete/",
    delete_profile_image_api,
    name="delete-profile-image",
),

path(
    "profile/completion/",
    profile_completion_api,
    name="profile-completion",
),
path(
    "profile/image/",
    profile_image_api,
    name="profile-image",
),
]
