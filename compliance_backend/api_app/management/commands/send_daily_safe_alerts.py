import datetime
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from twilio.rest import Client
from api_app.models import TreatmentPrescription
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sends daily SMS and Email alerts to farmers for livestock whose withdrawal period ends today.'

    def handle(self, *args, **options):
        today = datetime.date.today()
        
        # We need to find records where the authoritative safe market date is today.
        # Authoritative date is `final_safe_market_date` if modified, else `safe_market_date`.
        treatments_to_alert = TreatmentPrescription.objects.filter(
            Q(vet_decision_status=TreatmentPrescription.VetDecision.MODIFIED, final_safe_market_date=today) |
            Q(vet_decision_status=TreatmentPrescription.VetDecision.APPROVED, safe_market_date=today)
        )

        if not treatments_to_alert.exists():
            self.stdout.write(self.style.SUCCESS('No treatments are reaching their safe market date today.'))
            return

        for treatment in treatments_to_alert:
            self.send_alert(treatment)
            
        self.stdout.write(self.style.SUCCESS(f'Successfully processed alerts for {treatments_to_alert.count()} treatments.'))

    def send_alert(self, treatment):
        farmer_user = treatment.livestock.farmer
        if not farmer_user:
            self.stdout.write(self.style.WARNING(f"No farmer linked to livestock {treatment.livestock.tag_id}."))
            return

        email = farmer_user.email
        phone_number = farmer_user.userprofile.phone_number if hasattr(farmer_user, 'userprofile') else None

        message_body = f"Alert: Withdrawal period for Livestock {treatment.livestock.tag_id} is officially over. Safe for market today."

        # Email
        if email:
            try:
                send_mail(
                    subject="Livestock Comply: Safe for Market Alert",
                    message=message_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
                self.stdout.write(self.style.SUCCESS(f"Email sent to {email}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send email to {email}: {e}"))
        
        # SMS
        if phone_number and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                message = client.messages.create(
                    body=message_body,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=phone_number
                )
                self.stdout.write(self.style.SUCCESS(f"SMS sent to {phone_number}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send SMS to {phone_number}: {e}"))
        
        """
        To schedule this command using a standard server cron job, add the following to crontab:
        # Run daily at 8:00 AM
        0 8 * * * /path/to/venv/bin/python /path/to/project/manage.py send_daily_safe_alerts >> /var/log/livestock_comply_alerts.log 2>&1
        """
