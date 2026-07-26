import secrets
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.utils import timezone

from .models import EmailVerificationOTP


OTP_EXPIRY_MINUTES = 10


def generate_six_digit_otp():

    return str(
        secrets.randbelow(900000) + 100000
    )


def create_or_replace_email_otp(user):

    otp = generate_six_digit_otp()

    expires_at = (
        timezone.now()
        + timedelta(minutes=OTP_EXPIRY_MINUTES)
    )

    otp_record, created = (
        EmailVerificationOTP.objects.get_or_create(
            user=user,
            defaults={
                "otp_hash": make_password(otp),
                "expires_at": expires_at,
                "attempts": 0,
                "resend_count": 0,
                "last_sent_at": timezone.now(),
            }
        )
    )

    if not created:

        otp_record.otp_hash = make_password(otp)
        otp_record.expires_at = expires_at
        otp_record.attempts = 0
        otp_record.last_sent_at = timezone.now()

        otp_record.save(
            update_fields=[
                "otp_hash",
                "expires_at",
                "attempts",
                "last_sent_at",
                "updated_at",
            ]
        )

    return otp, otp_record