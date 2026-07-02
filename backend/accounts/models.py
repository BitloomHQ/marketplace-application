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
        blank=True
    )
    profile_picture = models.ImageField(
    upload_to="profile_pictures/",
    null=True,
    blank=True
    )
    bio = models.TextField(
    null=True,
    blank=True
    )

    experience_years = models.PositiveIntegerField(
    null=True,
    blank=True
    )
    is_verified = models.BooleanField(
    default=False
    )
    is_approved = models.BooleanField(
    default=False
    )

    address = models.TextField(
    null=True,
    blank=True
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

    is_approved = models.BooleanField(
        default=True,
    )

    status_note = models.TextField(
        blank=True,
        default='',
    )

    def __str__(self):
        return self.username

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
