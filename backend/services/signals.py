from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .dashboard_cache import (
    invalidate_customer_dashboard_cache,
    invalidate_provider_dashboard_cache,
)
from .models import Booking, Quote, ServiceRequest


@receiver(post_save, sender=ServiceRequest)
@receiver(post_delete, sender=ServiceRequest)
def clear_customer_cache_on_request_change(sender, instance, **kwargs):
    invalidate_customer_dashboard_cache(instance.customer_id)


@receiver(post_save, sender=Booking)
@receiver(post_delete, sender=Booking)
def clear_dashboard_cache_on_booking_change(sender, instance, **kwargs):
    invalidate_customer_dashboard_cache(instance.customer_id)
    invalidate_provider_dashboard_cache(instance.provider_id)


@receiver(post_save, sender=Quote)
@receiver(post_delete, sender=Quote)
def clear_provider_cache_on_quote_change(sender, instance, **kwargs):
    invalidate_provider_dashboard_cache(instance.provider_id)
