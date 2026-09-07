import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class EmailNotConfiguredError(Exception):
    """Raised when the email service is not configured."""
    pass


def is_email_configured() -> bool:
    """
    Check whether SMTP email configuration is available.
    """

    return bool(
        getattr(settings, "EMAIL_HOST", "")
        and getattr(settings, "EMAIL_HOST_USER", "")
        and getattr(settings, "EMAIL_HOST_PASSWORD", "")
        and getattr(settings, "DEFAULT_FROM_EMAIL", "")
    )


def send_verification_otp_email(user, otp) -> None:
    """
    Send email verification OTP to a customer/provider.

    Uses Django's configured EMAIL_BACKEND.
    For local development this is Gmail SMTP.
    """

    if not is_email_configured():

        logger.error(
            "OTP email not sent: SMTP email service "
            "is not configured."
        )

        raise EmailNotConfiguredError(
            "Email service is not configured."
        )

    display_name = (
        user.get_full_name()
        or getattr(user, "name", "")
        or user.username
        or "User"
    )

    subject = "Verify your Marketplace email"

    message = (
        f"Hello {display_name},\n\n"
        f"Your email verification OTP is: {otp}\n\n"
        "This OTP is valid for 10 minutes.\n"
        "Do not share this OTP with anyone.\n\n"
        "If you did not register on Marketplace, "
        "you can ignore this email.\n\n"
        "Regards,\n"
        "Marketplace Team"
    )

    try:

        sent_count = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        if sent_count != 1:
            raise RuntimeError(
                "Email backend did not confirm "
                "that the OTP email was sent."
            )

        logger.info(
            "OTP email sent successfully to %s",
            user.email,
        )

    except Exception as exc:

        logger.exception(
            "Failed to send OTP email to %s: %s",
            user.email,
            exc,
        )

        raise