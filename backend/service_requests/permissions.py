from rest_framework.permissions import BasePermission

from accounts.helpers import is_provider_role


class IsCustomerUser(BasePermission):
    message = "Only customers can create service requests."

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