from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from accounts.models import User


# =========================================
# SERVICE CATEGORIES
# =========================================
class ServiceCategory(models.Model):

    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("coming_soon", "Coming Soon"),
    )

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
    max_length=120,
    null=True,
    blank=True,
)

    key = models.CharField(
        max_length=50,
        unique=True,
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    icon = models.ImageField(
        upload_to="service_categories/icons/",
        null=True,
        blank=True,
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="subcategories",
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
    )

    start_date = models.DateField(
        null=True,
        blank=True,
    )

    display_order = models.PositiveIntegerField(
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "display_order",
            "name",
        ]
        verbose_name_plural = "Service categories"

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} → {self.name}"

        return self.name


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
        "service_requests.CustomerServiceRequest",
        on_delete=models.CASCADE,
        related_name="quotes",
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="provider_quotes",
    )

    price = models.DecimalField(
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
                    "provider",
                ],
                name="unique_provider_quote_per_service_request",
            ),
        ]

    def __str__(self):
        return f"{self.provider.username} - ₹{self.price}"


# =========================================
# FINAL BOOKING
# =========================================
class Booking(models.Model):

    STATUS_CHOICES = (
        ("assigned", "Assigned"),
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    service_request = models.OneToOneField(
        "service_requests.CustomerServiceRequest",
        on_delete=models.CASCADE,
        related_name="booking",
    )

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="customer_bookings",
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="provider_bookings",
    )

    quote = models.OneToOneField(
        Quote,
        on_delete=models.SET_NULL,
        related_name="booking",
        null=True,
        blank=True,
    )

    final_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0),
        ],
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="assigned",
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
            f"{self.customer.username} booked "
            f"{self.provider.username}"
        )


# =========================================
# CUSTOMER REVIEW
# =========================================
class Review(models.Model):

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="review",
    )

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="customer_reviews",
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="provider_reviews",
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

    def __str__(self):
        return f"{self.provider.username} - {self.rating} stars"


# =========================================
# NOTIFICATIONS
# =========================================
class Notification(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    title = models.CharField(
        max_length=255,
        default="Update",
    )

    message = models.TextField()

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
        return f"{self.user.username} - {self.title}"


# =========================================
# PROVIDER PORTFOLIO
# =========================================
class ProviderPortfolio(models.Model):

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="legacy_portfolio_images",
    )

    image = models.ImageField(
        upload_to="provider_portfolio/",
    )

    caption = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

    def __str__(self):
        return f"{self.provider.username} portfolio"