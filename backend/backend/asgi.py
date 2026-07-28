"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter

import services.routing
from services.middleware import TokenAuthMiddleware

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': TokenAuthMiddleware(
        URLRouter(
            services.routing.websocket_urlpatterns,
        ),
    ),
})
