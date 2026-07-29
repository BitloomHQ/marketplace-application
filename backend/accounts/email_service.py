import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class EmailNotConfiguredError(Exception):
    pass


def is_email_configured() -> bool:
    return bool(getattr(settings, 'RESEND_API_KEY', ''))


def send_verification_otp_email(user, otp) -> None:
    if not is_email_configured():
        logger.error('OTP email not sent: RESEND_API_KEY is not configured.')
        raise EmailNotConfiguredError(
            'Email service is not configured. Set RESEND_API_KEY on the server.',
        )

    display_name = (
        user.get_full_name()
        or getattr(user, 'name', '')
        or user.username
        or 'User'
    )

    subject = 'Verify your Marketplace email'
    message = (
        f'Hello {display_name},\n\n'
        f'Your email verification OTP is: {otp}\n\n'
        'This OTP is valid for 10 minutes.\n'
        'Do not share this OTP with anyone.\n\n'
        'If you did not register on Marketplace, '
        'you can ignore this email.\n\n'
        'Regards,\n'
        'Marketplace Team'
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info('OTP email sent to %s', user.email)
    except Exception as exc:
        logger.exception('Failed to send OTP email to %s: %s', user.email, exc)
        raise
