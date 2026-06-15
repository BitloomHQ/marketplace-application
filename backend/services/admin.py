from django.contrib import admin
from .models import ServiceRequest, Quote, Booking, Review, Notification, ProviderPortfolio


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "service_type", "status", "is_booked", "created_at")
    list_filter = ("service_type", "status", "is_booked")
    search_fields = ("customer__username", "address")


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ("id", "service_request", "provider", "price", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("provider__username",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "provider", "final_price", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("customer__username", "provider__username")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "customer", "provider", "rating", "created_at")
    search_fields = ("provider__username",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "is_read", "created_at")
    list_filter = ("is_read",)
    search_fields = ("user__username", "title")

@admin.register(ProviderPortfolio)
class ProviderPortfolioAdmin(admin.ModelAdmin):
    list_display = ("id", "provider", "caption", "created_at")
    search_fields = ("provider__username", "caption")    