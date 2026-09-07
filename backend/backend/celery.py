import os

from celery import Celery


os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "backend.settings",
)


app = Celery("backend")


# Read Celery configuration from Django settings.
# All Celery settings will use the CELERY_ prefix.
app.config_from_object(
    "django.conf:settings",
    namespace="CELERY",
)


# Automatically discover tasks.py files
# inside installed Django applications.
app.autodiscover_tasks()