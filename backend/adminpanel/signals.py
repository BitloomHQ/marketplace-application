from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from accounts.authentication import invalidate_token_user_cache
from accounts.helpers import invalidate_service_category_cache
from accounts.models import User
from adminpanel.catalog_helpers import invalidate_home_catalog_cache
from adminpanel.admin_perf import invalidate_admin_cache
from adminpanel.analytics_cache import invalidate_analytics_cache
from service_requests.models import (
    CustomerServiceRequest,
    ProviderQuotation,
    ServiceBooking,
    ServiceReview,
)
from services.models import Booking, Quote, Review

from .models import ServiceCategory, SpotlightImage


@receiver(post_save, sender=ServiceCategory)
@receiver(post_delete, sender=ServiceCategory)
def clear_service_category_cache(**kwargs):
    invalidate_service_category_cache()
    invalidate_home_catalog_cache()
    invalidate_admin_cache()


@receiver(post_save, sender=SpotlightImage)
@receiver(post_delete, sender=SpotlightImage)
def clear_spotlight_cache(**kwargs):
    invalidate_home_catalog_cache()


@receiver(post_save, sender=User)
@receiver(post_delete, sender=User)
def clear_admin_user_cache(sender, instance, **kwargs):
    invalidate_token_user_cache(instance.id)

    # Avoid wiping analytics on unrelated profile saves (e.g. avatar/password).
    update_fields = kwargs.get("update_fields")
    if update_fields is not None:
        relevant = {
            "role",
            "is_active",
            "is_approved",
            "is_verified",
            "is_staff",
            "is_superuser",
        }
        if not relevant.intersection(update_fields):
            return

    invalidate_admin_cache()


@receiver(post_save, sender=Booking)
@receiver(post_delete, sender=Booking)
@receiver(post_save, sender=Quote)
@receiver(post_delete, sender=Quote)
@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def clear_admin_marketplace_cache(**kwargs):
    invalidate_admin_cache()


@receiver(post_save, sender=CustomerServiceRequest)
@receiver(post_delete, sender=CustomerServiceRequest)
@receiver(post_save, sender=ProviderQuotation)
@receiver(post_delete, sender=ProviderQuotation)
@receiver(post_save, sender=ServiceBooking)
@receiver(post_delete, sender=ServiceBooking)
@receiver(post_save, sender=ServiceReview)
@receiver(post_delete, sender=ServiceReview)
def clear_admin_analytics_cache(**kwargs):
    invalidate_analytics_cache()
    invalidate_admin_cache()
