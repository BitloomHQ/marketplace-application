from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Send a test email through the configured backend (Resend in production).'

    def add_arguments(self, parser):
        parser.add_argument('recipient', help='Email address to send the test message to')

    def handle(self, *args, **options):
        recipient = options['recipient'].strip()
        if not recipient:
            raise CommandError('Recipient email is required.')

        if not getattr(settings, 'RESEND_API_KEY', ''):
            self.stdout.write(
                self.style.WARNING(
                    'RESEND_API_KEY is not set — using console email backend.',
                ),
            )

        self.stdout.write(f'EMAIL_BACKEND: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}')

        try:
            send_mail(
                subject='Marketplace test email',
                message='If you received this, email delivery is working.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception as exc:
            raise CommandError(f'Email send failed: {exc}') from exc

        self.stdout.write(self.style.SUCCESS(f'Test email sent to {recipient}'))
