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

    phone = models.CharField(max_length=15)

    address = models.TextField(
        null=True,
        blank=True
    )