from rest_framework.permissions import BasePermission

from accounts.helpers import is_provider_role


class IsApprovedProvider(BasePermission):
    message = "Only approved providers can access this feature."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return False

        return (
            user.is_active
            and user.is_email_verified
            and user.is_approved
            and is_provider_role(user.role)
        )