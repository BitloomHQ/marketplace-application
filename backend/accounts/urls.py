from django.urls import path

from .auth_api import login_api, register, resend_email_otp, verify_email
from .password_api import change_password, forgot_password, reset_password
from .profile_api import (
    get_profile_api,
    profile_completion_api,
    profile_image_api,
    update_profile_api,
)
from .views import (
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
    active_services,
    public_services,
)

urlpatterns = [
    path('register/', register, name='register'),
    path('login/', login_api, name='login'),
    path('verify-email/', verify_email, name='verify_email'),
    path('resend-email-otp/', resend_email_otp, name='resend_email_otp'),
    path('change-password/', change_password, name='change_password'),
    path('forgot-password/', forgot_password, name='forgot_password'),
    path('reset-password/', reset_password, name='reset_password'),
    path('profile/', get_profile_api, name='get_profile'),
    path('profile/update/', update_profile_api, name='update_profile'),
    path('profile/image/', profile_image_api, name='profile_image'),
    path('profile/image/delete/', profile_image_api, name='profile_image_delete'),
    path('profile/completion/', profile_completion_api, name='profile_completion'),
    path('dashboard/', dashboard_api, name='dashboard'),
    path('customer-dashboard/', customer_dashboard, name='customer_dashboard'),
    path('providers/', providers_by_service, name='providers_dashboard'),
    path('add-address/', add_address, name='add_address'),
    path('my-addresses/', my_addresses, name='my_addresses'),
    path('delete-address/<int:address_id>/', delete_address, name='delete_address'),
    path('edit-address/<int:address_id>/', edit_address, name='edit_address'),
    path('maps/status/', maps_status, name='maps_status'),
    path('maps/autocomplete/', maps_autocomplete, name='maps_autocomplete'),
    path('maps/place-details/', maps_place_details, name='maps_place_details'),
    path('maps/geocode-address/', maps_geocode_address, name='maps_geocode_address'),
    path('maps/reverse-geocode/', maps_reverse_geocode, name='maps_reverse_geocode'),
    path('active-services/', active_services, name='active_services'),
    path('public-services/', public_services, name='public_services'),
]
