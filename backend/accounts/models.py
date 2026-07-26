from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    ROLE_CHOICES = (
        ("customer", "Customer"),
    )

    role = models.CharField(
        max_length=50,
        default="customer",
    )

    phone = models.CharField(
        max_length=15,
        null=True,
        blank=True,
    )

    address = models.TextField(
        blank=True,
        default="",
    )

    profile_picture = models.ImageField(
        upload_to="profile_pictures/",
        null=True,
        blank=True,
    )

    bio = models.TextField(
        blank=True,
        default="",
    )

    experience_years = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    # Provider identity/document verification
    is_verified = models.BooleanField(
        default=False,
    )

    # Provider approval by platform owner/admin
    is_approved = models.BooleanField(
        default=False,
    )

    # Email OTP verification
    is_email_verified = models.BooleanField(
        default=False,
    )

    status_note = models.TextField(
        blank=True,
        default="",
    )

    deactivate_reason = models.TextField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.username

    @property
    def is_provider(self):
        from accounts.helpers import is_provider_role

        return is_provider_role(self.role)

from django.conf import settings
from django.db import models
from django.utils import timezone


class EmailVerificationOTP(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification_otp"
    )

    otp_hash = models.CharField(
        max_length=128
    )

    expires_at = models.DateTimeField()

    attempts = models.PositiveIntegerField(
        default=0
    )

    resend_count = models.PositiveIntegerField(
        default=0
    )

    last_sent_at = models.DateTimeField(
        auto_now_add=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Email verification for {self.user.email}"


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

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="addresses"
    )

    title = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    address = models.TextField()

    latitude = models.FloatField(
        null=True,
        blank=True
    )

    longitude = models.FloatField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.customer.username} - {self.address}"
