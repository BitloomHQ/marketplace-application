from django.db import models

# Create your models here.
from django.db import models


class ServiceCategory(models.Model):

    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("coming_soon", "Coming Soon"),
    )

    name = models.CharField(max_length=100)

    key = models.SlugField(max_length=100, unique=True)

    description = models.TextField()

    icon = models.CharField(
        max_length=20,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="coming_soon"
    )

    start_date = models.CharField(
        max_length=100,
        default="Yet to start"
    )

    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name