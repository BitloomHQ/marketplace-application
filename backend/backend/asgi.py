"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

import services.routing

from services.middleware import TokenAuthMiddleware

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "backend.settings"
)

application = ProtocolTypeRouter({

    "http": get_asgi_application(),

    "websocket": TokenAuthMiddleware(
        URLRouter(
            services.routing.websocket_urlpatterns
        )
    ),
})