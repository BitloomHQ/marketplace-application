import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class CustomerServiceRequest(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("open", "Open"),
        ("matched", "Providers matched"),
        ("quoted", "Quotation received"),
        ("accepted", "Quotation accepted"),
        ("in_progress", "Work in progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
    )

    URGENCY_CHOICES = (
        ("normal", "Normal"),
        ("urgent", "Urgent"),
        ("emergency", "Emergency"),
    )

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_service_requests",
    )

    category = models.ForeignKey(
        "services.ServiceCategory",
        on_delete=models.PROTECT,
        related_name="customer_requests",
    )

    title = models.CharField(max_length=180)

    description = models.TextField()

    urgency = models.CharField(
        max_length=20,
        choices=URGENCY_CHOICES,
        default="normal",
    )

    preferred_date = models.DateField(
        null=True,
        blank=True,
    )

    preferred_start_time = models.TimeField(
        null=True,
        blank=True,
    )

    preferred_end_time = models.TimeField(
        null=True,
        blank=True,
    )

    budget_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    budget_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )

    service_address = models.TextField()

    city = models.CharField(max_length=100)

    state = models.CharField(max_length=100)

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

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="open",
    )

    cancellation_reason = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.customer.email}"


class ServiceRequestImage(models.Model):
    service_request = models.ForeignKey(
        CustomerServiceRequest,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="service_requests/images/",
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return str(self.service_request_id)

class ProviderQuotation(models.Model):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    )

    service_request = models.ForeignKey(
        CustomerServiceRequest,
        on_delete=models.CASCADE,
        related_name="quotations",
    )

    provider_profile = models.ForeignKey(
        "providers.ProviderProfile",
        on_delete=models.CASCADE,
        related_name="quotations",
    )

    quoted_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0),
        ],
    )

    message = models.TextField(
        blank=True,
        default="",
    )

    estimated_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "service_request",
                    "provider_profile",
                ],
                name="unique_provider_quotation_per_request",
            ),
        ]

    def __str__(self):
        return (
            f"{self.provider_profile.provider.email} "
            f"- {self.service_request.title} "
            f"- ₹{self.quoted_price}"
        )

class ServiceBooking(models.Model):

    STATUS_CHOICES = (
        ("accepted", "Accepted"),
        ("scheduled", "Scheduled"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    service_request = models.OneToOneField(
        CustomerServiceRequest,
        on_delete=models.CASCADE,
        related_name="booking",
    )

    quotation = models.OneToOneField(
        ProviderQuotation,
        on_delete=models.PROTECT,
        related_name="booking",
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="new_service_bookings",
    )

    provider_profile = models.ForeignKey(
        "providers.ProviderProfile",
        on_delete=models.PROTECT,
        related_name="service_bookings",
    )

    final_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0),
        ],
    )

    scheduled_date = models.DateField(
        null=True,
        blank=True,
    )

    scheduled_start_time = models.TimeField(
        null=True,
        blank=True,
    )

    scheduled_end_time = models.TimeField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="accepted",
    )

    cancellation_reason = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return (
            f"{self.customer.email} - "
            f"{self.provider_profile.provider.email} - "
            f"{self.final_price}"
        )

from django.core.validators import MinValueValidator, MaxValueValidator


class ServiceReview(models.Model):
    """
    Review submitted by a customer after a completed booking.

    One booking can have only one review.
    """

    booking = models.OneToOneField(
        "ServiceBooking",
        on_delete=models.CASCADE,
        related_name="review",
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="service_reviews_given",
    )

    provider_profile = models.ForeignKey(
        "providers.ProviderProfile",
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    rating = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
    )

    review = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

    def __str__(self):
        return (
            f"{self.customer.email} -> "
            f"{self.provider_profile.provider.email} "
            f"({self.rating}/5)"
        )

class ServiceNotification(models.Model):

    TYPE_CHOICES = (
    ("new_request", "New Service Request"),
    ("quotation_received", "Quotation Received"),
    ("quotation_accepted", "Quotation Accepted"),
    ("booking_created", "Booking Created"),

    ("work_started", "Work Started"),
    ("work_completed", "Work Completed"),
    ("booking_cancelled", "Booking Cancelled"),

    ("booking_status", "Booking Status Updated"),
    ("review_received", "Review Received"),
    ("general", "General"),
)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="service_notifications",
    )

    notification_type = models.CharField(
        max_length=40,
        choices=TYPE_CHOICES,
        default="general",
    )

    title = models.CharField(
        max_length=255,
    )

    message = models.TextField()

    service_request = models.ForeignKey(
        CustomerServiceRequest,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )

    booking = models.ForeignKey(
        "ServiceBooking",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )

    is_read = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

    def __str__(self):
        return (
            f"{self.user.email} - "
            f"{self.notification_type}"
        )