from django.conf import settings
from django.core.mail import send_mail


def send_verification_otp_email(user, otp):

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

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False
    )