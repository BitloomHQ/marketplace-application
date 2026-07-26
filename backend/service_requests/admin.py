from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import CustomerServiceRequest


@admin.register(CustomerServiceRequest)
class CustomerServiceRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "title",
        "status",
        "created_at",
    )