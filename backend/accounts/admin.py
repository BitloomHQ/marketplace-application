from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


class CustomUserAdmin(UserAdmin):

    model = User

    list_display = (
        'username',
        'email',
        'role',
        'phone',
        'is_staff',
    )

    list_filter = (
        'role',
        'is_staff',
    )

    fieldsets = (

        (
            'Login Credentials',
            {
                'fields': (
                    'username',
                    'password',
                )
            }
        ),

        (
            'Personal Information',
            {
                'fields': (
                    'first_name',
                    'last_name',
                    'email',
                    'phone',
                    'address',
                )
            }
        ),

        (
            'Role Information',
            {
                'fields': (
                    'role',
                )
            }
        ),

        (
            'Permissions',
            {
                'fields': (
                    'is_active',
                    'is_staff',
                    'is_superuser',
                )
            }
        ),

        (
            'Important Dates',
            {
                'fields': (
                    'last_login',
                    'date_joined',
                )
            }
        ),
    )

    add_fieldsets = (

        (
            None,
            {
                'classes': ('wide',),

                'fields': (
                    'username',
                    'email',
                    'phone',
                    'role',
                    'address',
                    'password1',
                    'password2',
                ),
            },
        ),
    )

    search_fields = (
        'username',
        'email',
        'role',
    )

    ordering = (
        'username',
    )


admin.site.register(
    User,
    CustomUserAdmin
)