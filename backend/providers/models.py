from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class ProviderProfile(models.Model):
    provider = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_profile",
    )

    business_name = models.CharField(
        max_length=150,
        blank=True,
        default="",
    )

    professional_title = models.CharField(
        max_length=150,
    )

    description = models.TextField()

    total_experience_years = models.PositiveIntegerField(
        default=0,
    )

    accepts_emergency_work = models.BooleanField(
        default=False,
    )

    minimum_booking_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
        ],
    )

    is_available = models.BooleanField(
        default=True,
    )

    is_profile_active = models.BooleanField(
        default=True,
    )

    completed_jobs = models.PositiveIntegerField(
        default=0,
    )

    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return (
            self.business_name
            or self.provider.get_full_name()
            or self.provider.email
        )


class ProviderService(models.Model):
    PRICING_TYPE_CHOICES = (
        ("fixed", "Fixed price"),
        ("hourly", "Hourly price"),
        ("daily", "Daily price"),
        ("starting_from", "Starting from"),
        ("quotation", "Quotation required"),
    )

    provider_profile = models.ForeignKey(
        ProviderProfile,
        on_delete=models.CASCADE,
        related_name="services",
    )

    category = models.ForeignKey(
        "services.ServiceCategory",
        on_delete=models.PROTECT,
        related_name="provider_services",
    )

    title = models.CharField(
        max_length=150,
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    pricing_type = models.CharField(
        max_length=30,
        choices=PRICING_TYPE_CHOICES,
        default="quotation",
    )

    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
        ],
    )

    estimated_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "provider_profile",
                    "category",
                ],
                name="unique_provider_service_category",
            ),
        ]

    def __str__(self):
        return (
            f"{self.provider_profile.provider.email} "
            f"- {self.category.name}"
        )

class ProviderAvailability(models.Model):
    DAY_CHOICES = (
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    )

    provider_profile = models.ForeignKey(
        ProviderProfile,
        on_delete=models.CASCADE,
        related_name="availability_slots",
    )

    day_of_week = models.PositiveSmallIntegerField(
        choices=DAY_CHOICES,
    )

    start_time = models.TimeField(
        null=True,
        blank=True,
    )

    end_time = models.TimeField(
        null=True,
        blank=True,
    )

    is_available = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "day_of_week",
            "start_time",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "provider_profile",
                    "day_of_week",
                    "start_time",
                    "end_time",
                ],
                name="unique_provider_availability_slot",
            ),
        ]

    def __str__(self):
        return (
            f"{self.provider_profile.provider.email} "
            f"- {self.get_day_of_week_display()}"
        )

class ProviderServiceArea(models.Model):
    provider_profile = models.ForeignKey(
        ProviderProfile,
        on_delete=models.CASCADE,
        related_name="service_areas",
    )

    label = models.CharField(
        max_length=100,
        default="Primary service area",
    )

    address = models.TextField(
        blank=True,
        default="",
    )

    city = models.CharField(
        max_length=100,
    )

    state = models.CharField(
        max_length=100,
    )

    postal_code = models.CharField(
        max_length=20,
        blank=True,
        default="",
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    service_radius_km = models.PositiveIntegerField(
        default=10,
        validators=[
            MinValueValidator(1),
        ],
    )

    is_primary = models.BooleanField(
        default=False,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return (
            f"{self.provider_profile.provider.email} "
            f"- {self.city}"
        )