from django.db import models
from accounts.models import User, CustomerAddress


# =========================================
# SERVICE REQUEST MODEL
# =========================================
class ServiceRequest(models.Model):

    SERVICE_TYPES = (
        ("gardener", "Gardener"),
        ("electrician", "Electrician"),
        ("plumber", "Plumber"),
    )

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("area_selected", "Area Selected"),
        ("quotation_received", "Quotation Received"),
        ("assigned", "Assigned"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="service_requests"
    )

    service_type = models.CharField(
        max_length=20,
        choices=SERVICE_TYPES
    )

    # OLD ADDRESS FIELD
    # KEEP THIS TO AVOID MIGRATION ERROR
    address = models.TextField(
        null=True,
        blank=True
    )

    # NEW MULTIPLE ADDRESS SUPPORT
    customer_address = models.ForeignKey(
        CustomerAddress,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_requests"
    )

    # AUTO FROM SELECTED ADDRESS
    lat = models.FloatField(
        null=True,
        blank=True
    )

    lon = models.FloatField(
        null=True,
        blank=True
    )

    # GARDENER FEATURES
    lawn_area = models.FloatField(
        null=True,
        blank=True
    )

    polygon_points = models.JSONField(
        null=True,
        blank=True
    )

    estimated_price = models.FloatField(
        null=True,
        blank=True
    )

    description = models.TextField(
        null=True,
        blank=True
    )

    image = models.ImageField(
        upload_to="service_requests/",
        null=True,
        blank=True
    )

    is_booked = models.BooleanField(
        default=False
    )

    selected_provider = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_jobs"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.customer.username} - {self.service_type}"


# =========================================
# PROVIDER QUOTES
# =========================================
class Quote(models.Model):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    )

    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="quotes"
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="provider_quotes"
    )

    price = models.FloatField()

    message = models.TextField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ("service_request", "provider")

    def __str__(self):
        return f"{self.provider.username} - ₹{self.price}"


# =========================================
# FINAL BOOKING
# =========================================
class Booking(models.Model):

    STATUS_CHOICES = (
        ("assigned", "Assigned"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    service_request = models.OneToOneField(
        ServiceRequest,
        on_delete=models.CASCADE
    )

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="customer_bookings"
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="provider_bookings"
    )

    quote = models.OneToOneField(
        Quote,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    final_price = models.FloatField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="assigned"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.customer.username} booked {self.provider.username}"


# =========================================
# CUSTOMER REVIEW
# =========================================
class Review(models.Model):

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE
    )

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="customer_reviews"
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="provider_reviews"
    )

    rating = models.IntegerField()

    review = models.TextField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.provider.username} - {self.rating} Stars"


# =========================================
# NOTIFICATIONS
# =========================================
class Notification(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    title = models.CharField(
        max_length=255,
        default="Update"
    )

    message = models.TextField()

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.title}"