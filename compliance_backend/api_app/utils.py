from django.core.mail import send_mail
from django.conf import settings
from twilio.rest import Client
import logging

logger = logging.getLogger(__name__)

def send_vet_approval_alert(treatment):
    """
    Sends an SMS and Email alert to the farmer when a Vet approves a treatment.
    """
    try:
        farmer_user = treatment.livestock.farmer
        if not farmer_user:
            logger.warning(f"No farmer linked to livestock {treatment.livestock.tag_id}. Cannot send alerts.")
            return

        # Fetch contact info
        email = farmer_user.email
        phone_number = farmer_user.userprofile.phone_number if hasattr(farmer_user, 'userprofile') else None

        # Format message
        authoritative_date = (
            treatment.final_safe_market_date 
            if treatment.vet_decision_status == 'Modified' 
            else treatment.safe_market_date
        )
        date_str = authoritative_date.strftime('%d %B %Y') if authoritative_date else "Unknown"
        message_body = f"Livestock Comply: Treatment for {treatment.livestock.tag_id} approved by Vet. Safe Market Date is {date_str}."

        # Send Email
        if email:
            try:
                send_mail(
                    subject="Livestock Comply: Vet Approval Notification",
                    message=message_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
                logger.info(f"Email alert sent to {email}")
            except Exception as e:
                logger.error(f"Failed to send email to {email}: {e}")

        # Send SMS
        if phone_number and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                message = client.messages.create(
                    body=message_body,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=phone_number
                )
                logger.info(f"SMS alert sent to {phone_number}, SID: {message.sid}")
            except Exception as e:
                logger.error(f"Failed to send SMS to {phone_number}: {e}")
        elif not phone_number:
            logger.warning(f"Farmer {farmer_user.username} has no phone number. SMS skipped.")
        else:
            logger.warning("Twilio credentials not configured. SMS skipped.")

    except Exception as e:
        logger.error(f"Error in send_vet_approval_alert: {e}")
