from rest_framework.permissions import BasePermission

from accounts.helpers import is_provider_role


class IsCustomerUser(BasePermission):
    message = "Only customers can access customer service requests."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return (
            user.is_active
            and user.is_email_verified
            and not user.is_superuser
            and not is_provider_role(user.role)
        )


class IsProviderUser(BasePermission):
    message = "Only approved and active providers can access this resource."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return (
            user.is_active
            and user.is_email_verified
            and user.is_approved
            and not user.is_superuser
            and is_provider_role(user.role)
        )


class IsBookingParticipant(BasePermission):
    """
    Allows access only when the authenticated user
    is the customer or provider of the booking.

    Object ownership is checked inside the booking views.
    """

    message = "You do not have permission to access this booking."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.is_active
        )