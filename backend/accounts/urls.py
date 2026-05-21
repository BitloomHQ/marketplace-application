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

    customer_dashboard
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
]