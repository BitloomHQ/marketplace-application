from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    ROLE_CHOICES = (
        ('customer', 'Customer'),
    )

    role = models.CharField(
        max_length=50,
        default='customer',
    )

    phone = models.CharField(
        max_length=15,
        null=True,
        blank=True,
    )

    address = models.TextField(
        blank=True,
        default='',
    )

    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True,
    )

    bio = models.TextField(
        blank=True,
        default='',
    )

    experience_years = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    is_verified = models.BooleanField(
        default=False,
    )

    is_email_verified = models.BooleanField(
        default=False,
    )

    is_approved = models.BooleanField(
        default=False,
    )

    status_note = models.TextField(
        blank=True,
        default='',
    )

    deactivate_reason = models.TextField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.username

    class Meta:
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["role", "is_approved"]),
            models.Index(fields=["-date_joined"]),
        ]

    @property
    def is_provider(self):
        from accounts.helpers import is_provider_role
        return is_provider_role(self.role)


class ProviderPortfolioImage(models.Model):

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='portfolio_images',
    )

    image = models.ImageField(
        upload_to='provider_portfolio/',
    )

    caption = models.CharField(
        max_length=255,
        blank=True,
        default='',
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f"{self.provider.username} portfolio"


class CustomerAddress(models.Model):

    # ============================================================
    # ADDRESS TYPE
    # ============================================================

    ADDRESS_TYPE_HOME = "home"
    ADDRESS_TYPE_WORK = "work"
    ADDRESS_TYPE_OTHER = "other"

    ADDRESS_TYPE_CHOICES = (
        (ADDRESS_TYPE_HOME, "Home"),
        (ADDRESS_TYPE_WORK, "Work"),
        (ADDRESS_TYPE_OTHER, "Other"),
    )

    # ============================================================
    # LOCATION SOURCE
    # ============================================================

    LOCATION_SOURCE_LIVE = "live"
    LOCATION_SOURCE_MANUAL = "manual"

    LOCATION_SOURCE_CHOICES = (
        (LOCATION_SOURCE_LIVE, "Current Location"),
        (LOCATION_SOURCE_MANUAL, "Manual Location"),
    )

    # ============================================================
    # CUSTOMER
    # ============================================================

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="addresses",
    )

    # ============================================================
    # ADDRESS INFORMATION
    # ============================================================

    title = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text=(
            "Custom address label such as "
            "Home, Office, Parents' Home, etc."
        ),
    )

    address_type = models.CharField(
        max_length=20,
        choices=ADDRESS_TYPE_CHOICES,
        default=ADDRESS_TYPE_HOME,
    )

    address = models.TextField()

    city = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    state = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )

    postal_code = models.CharField(
        max_length=20,
        blank=True,
        default="",
    )

    # ============================================================
    # COORDINATES
    # ============================================================

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

    location_source = models.CharField(
        max_length=20,
        choices=LOCATION_SOURCE_CHOICES,
        default=LOCATION_SOURCE_MANUAL,
    )

    # ============================================================
    # DEFAULT ADDRESS
    # ============================================================

    is_default = models.BooleanField(
        default=False,
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # ============================================================
    # META
    # ============================================================

    class Meta:
        ordering = [
            "-is_default",
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "customer",
                    "is_default",
                ]
            ),
        ]

    # ============================================================
    # STRING REPRESENTATION
    # ============================================================

    def __str__(self):
        label = (
            self.title
            or self.get_address_type_display()
        )

        return (
            f"{self.customer.username} - "
            f"{label} - "
            f"{self.address}"
        )

class EmailVerificationOTP(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='email_verification_otp',
    )
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    resend_count = models.PositiveIntegerField(default=0)
    last_sent_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"OTP for {self.user.email}"


class FavoriteProvider(models.Model):
    """
    A provider saved/favorited by a customer.

    A customer can save the same provider only once.
    """

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorite_providers",
    )

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorited_by_customers",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "customer",
                    "provider",
                ],
                name="unique_customer_favorite_provider",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "customer",
                    "-created_at",
                ]
            ),
        ]

    def __str__(self):
        return (
            f"{self.customer.username} -> "
            f"{self.provider.username}"
        )
