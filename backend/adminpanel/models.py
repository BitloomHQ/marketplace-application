from django.db import models

from backend import settings


class ServiceCategory(models.Model):

    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("coming_soon", "Coming Soon"),
    )

    name = models.CharField(max_length=100)
    key = models.SlugField(max_length=100, unique=True)
    description = models.TextField()

    service_image = models.ImageField(
        upload_to="service_categories/",
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="coming_soon",
    )

    start_date = models.CharField(
        max_length=100,
        default="Yet to start",
    )

    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_popular = models.BooleanField(
    default=False
)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["status", "is_popular"]),
            models.Index(fields=["display_order", "name"]),
        ]

    def __str__(self):
        return self.name



# =========================================
# SPOTLIGHT IMAGES (Homepage Banner)
# =========================================
class SpotlightImage(models.Model):

    title = models.CharField(max_length=150)

    subtitle = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    image = models.ImageField(
        upload_to="spotlight_images/",
    )

    redirect_url = models.URLField(
        blank=True,
        default="",
    )

    display_order = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "display_order"]),
        ]

    def __str__(self):
        return self.title



class AdminPermissionProfile(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_permission_profile",
    )

    manage_providers = models.BooleanField(default=False)
    manage_customers = models.BooleanField(default=False)
    manage_services = models.BooleanField(default=False)
    manage_bookings = models.BooleanField(default=False)
    manage_quotes = models.BooleanField(default=False)
    view_reports = models.BooleanField(default=False)
    manage_spotlights = models.BooleanField(default=False)
    manage_admin_users = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.email


from django.conf import settings
from django.db import models

from django.core.validators import MinValueValidator
from django.db import models


class MarketplaceLocationSettings(models.Model):
    """
    Global marketplace location/matching configuration.

    Only one active configuration is expected for the platform.
    """

    max_provider_radius_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=20.00,
        validators=[
            MinValueValidator(1),
        ],
        help_text=(
            "Maximum distance within which providers "
            "can receive customer service requests."
        ),
    )

    default_provider_radius_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=10.00,
        validators=[
            MinValueValidator(1),
        ],
        help_text=(
            "Default provider preference when a provider "
            "has not selected their own radius."
        ),
    )

    is_location_matching_enabled = models.BooleanField(
        default=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    live_location_timeout_minutes = models.PositiveIntegerField(
    default=15,
    validators=[MinValueValidator(1)],
    help_text=(
        "Number of minutes a provider's live GPS location "
        "remains valid for marketplace matching."
    ),
)

    class Meta:
        verbose_name = "Marketplace Location Settings"
        verbose_name_plural = "Marketplace Location Settings"

    def __str__(self):
        return "Marketplace Location Settings"

    @classmethod
    def get_settings(cls):
        settings_obj, _ = cls.objects.get_or_create(
            pk=1,
        )
        return settings_obj


