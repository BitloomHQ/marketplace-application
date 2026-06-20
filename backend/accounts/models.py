from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('gardener', 'Gardener'),
        ('electrician', 'Electrician'),
        ('plumber', 'Plumber'),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='customer'
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
    deactivate_reason = models.TextField(
    null=True,
    blank=True
)

    def __str__(self):
        return self.username


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