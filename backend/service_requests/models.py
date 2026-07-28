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