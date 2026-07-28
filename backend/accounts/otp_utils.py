import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from .models import EmailVerificationOTP


OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_MAX_RESENDS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60


def generate_six_digit_otp():
    return str(secrets.randbelow(900000) + 100000)


def create_or_replace_email_otp(user):
    otp = generate_six_digit_otp()
    expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    otp_record, created = EmailVerificationOTP.objects.get_or_create(
        user=user,
        defaults={
            'otp_hash': make_password(otp),
            'expires_at': expires_at,
            'attempts': 0,
            'resend_count': 0,
            'last_sent_at': timezone.now(),
        },
    )

    if not created:
        otp_record.otp_hash = make_password(otp)
        otp_record.expires_at = expires_at
        otp_record.attempts = 0
        otp_record.resend_count = otp_record.resend_count + 1
        otp_record.last_sent_at = timezone.now()
        otp_record.save(
            update_fields=[
                'otp_hash',
                'expires_at',
                'attempts',
                'resend_count',
                'last_sent_at',
                'updated_at',
            ],
        )

    return otp, otp_record


def verify_email_otp(user, otp):
    try:
        otp_record = user.email_verification_otp
    except EmailVerificationOTP.DoesNotExist:
        return 'OTP_NOT_FOUND', None

    if otp_record.attempts >= OTP_MAX_ATTEMPTS:
        return 'OTP_ATTEMPTS_EXCEEDED', None

    if timezone.now() > otp_record.expires_at:
        return 'OTP_EXPIRED', None

    if not check_password(otp, otp_record.otp_hash):
        otp_record.attempts += 1
        otp_record.save(update_fields=['attempts', 'updated_at'])
        remaining = max(OTP_MAX_ATTEMPTS - otp_record.attempts, 0)
        return 'INVALID_OTP', remaining

    return 'OK', None


def can_resend_otp(user):
    try:
        otp_record = user.email_verification_otp
    except EmailVerificationOTP.DoesNotExist:
        return True, 0

    if otp_record.resend_count >= OTP_MAX_RESENDS:
        return False, 0

    elapsed = (timezone.now() - otp_record.last_sent_at).total_seconds()
    if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
        return False, int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)

    return True, 0
