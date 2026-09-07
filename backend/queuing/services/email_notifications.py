import threading
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

def dispatch_disposition_email_async(ticket_id, disposition, actor_id=None, notes=""):
    """
    Spawns a background thread to send a detailed disposition email (Resolved / Escalated)
    to the customer, serving operator, company admin, and socialbuzz31@gmail.com.
    """
    thread = threading.Thread(
        target=_send_disposition_email_worker,
        args=(ticket_id, disposition, actor_id, notes),
        daemon=True
    )
    thread.start()

def _send_disposition_email_worker(ticket_id, disposition, actor_id, notes):
    try:
        from queuing.models import Ticket
        from accounts.models import User

        ticket = Ticket.objects.filter(id=ticket_id).select_related("company", "branch", "service", "desk").first()
        if not ticket:
            logger.error(f"[EMAIL DISPATCH] Ticket #{ticket_id} not found.")
            return

        actor = None
        if actor_id:
            actor = User.objects.filter(id=actor_id).first()

        operator_name = actor.get_full_name() or actor.username if actor else "Counter Operator"
        operator_email = actor.email if actor and actor.email else ""

        customer_name = ticket.customer_name or "Valued Visitor"
        customer_phone = ticket.customer_phone or "N/A"
        customer_email = ticket.customer_email or ""
        token_number = ticket.token_number
        service_name = ticket.service.name if ticket.service else "General Service"
        branch_name = ticket.branch.name if ticket.branch else "Branch Office"
        company_name = ticket.company.name if ticket.company else "Quesoles"
        desk_name = ticket.desk.name if ticket.desk else "Counter Desk"
        purpose_note = ticket.message or "N/A"
        timestamp_str = timezone.now().strftime("%b %d, %Y, %I:%M %p")

        # Send email ONLY to the customer's email address
        target_email = customer_email.strip() if (customer_email and "@" in customer_email) else ""
        if not target_email:
            logger.warning(f"[EMAIL DISPATCH] Ticket #{ticket_id} has no valid customer email. Skipping dispatch.")
            return

        recipient_list = [target_email]

        feedback_link = f"https://localhost:8080/feedback/{ticket.tracking_code}"

        is_resolved = (disposition.lower() == "resolved" or disposition.lower() == "served" or disposition.lower() == "complete")

        if is_resolved:
            subject = f"✅ Ticket Resolved: Token {token_number} at {branch_name} ({company_name})"
            badge_color = "#059669"
            badge_bg = "#ecfdf5"
            badge_border = "#a7f3d0"
            status_title = "TICKET RESOLVED & COMPLETED"
            status_icon = "✓"
            
            user_msg = (
                f"Hello <strong>{customer_name}</strong>,<br><br>"
                f"Your service visit for <strong>{service_name}</strong> at <strong>{branch_name}</strong> "
                f"has been marked as <strong>Resolved</strong> and completed by operator <strong>{operator_name}</strong> at <strong>{desk_name}</strong>.<br><br>"
                f"Thank you for visiting <strong>{company_name}</strong>! We appreciate your visit and hope you had an efficient experience."
            )
        else:
            subject = f"⚠️ Ticket Escalated: Token {token_number} at {branch_name} ({company_name})"
            badge_color = "#d97706"
            badge_bg = "#fffbeb"
            badge_border = "#fde68a"
            status_title = "TICKET ESCALATED FOR SUPERVISOR REVIEW"
            status_icon = "⚠️"
            
            user_msg = (
                f"Hello <strong>{customer_name}</strong>,<br><br>"
                f"Your visit for <strong>{service_name}</strong> at <strong>{branch_name}</strong> "
                f"has been <strong>Escalated</strong> to senior management for priority handling by operator <strong>{operator_name}</strong> at <strong>{desk_name}</strong>.<br><br>"
                f"Our senior supervisor team has been alerted and is actively reviewing your request to ensure prompt resolution."
            )

        notes_row = ""
        if notes:
            notes_row = f"""
            <tr>
              <td style="padding: 10px 14px; font-weight: 600; color: #475569; width: 140px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Operator Notes:</td>
              <td style="padding: 10px 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{notes}</td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.025em; text-transform: uppercase; letter-spacing: 1px;">{company_name}</h1>
                <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500;">{branch_name}</p>
              </td>
            </tr>

            <!-- Status Hero Badge -->
            <tr>
              <td style="padding: 24px 24px 12px 24px; text-align: center;">
                <div style="display: inline-block; background-color: {badge_bg}; border: 1.5px solid {badge_border}; color: {badge_color}; padding: 10px 20px; border-radius: 9999px; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                  <span style="margin-right: 6px; font-size: 14px;">{status_icon}</span> {status_title}
                </div>
                
                <div style="margin-top: 20px;">
                  <span style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px;">TOKEN NUMBER</span>
                  <div style="font-size: 44px; font-weight: 900; color: #1e293b; margin-top: 4px; font-family: monospace;">{token_number}</div>
                </div>
              </td>
            </tr>

            <!-- User Message Box -->
            <tr>
              <td style="padding: 12px 24px;">
                <div style="background-color: #f8fafc; border-left: 4px solid {badge_color}; padding: 16px 20px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #334155;">
                  {user_msg}
                </div>
              </td>
            </tr>

            <!-- Comprehensive Details Table -->
            <tr>
              <td style="padding: 16px 24px 28px 24px;">
                <h3 style="font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Visit Summary Details</h3>
                <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; width: 140px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Customer Name:</td>
                    <td style="padding: 10px 14px; color: #1e293b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{customer_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Mobile Contact:</td>
                    <td style="padding: 10px 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{customer_phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Service Requested:</td>
                    <td style="padding: 10px 14px; color: #1e293b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{service_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Assigned Counter:</td>
                    <td style="padding: 10px 14px; color: #1e293b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">{desk_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Serving Operator:</td>
                    <td style="padding: 10px 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{operator_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Branch Location:</td>
                    <td style="padding: 10px 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{branch_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Action Timestamp:</td>
                    <td style="padding: 10px 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{timestamp_str}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">Visitor Note:</td>
                    <td style="padding: 10px 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">{purpose_note}</td>
                  </tr>
                  {notes_row}
                </table>
              </td>
            </tr>

            <!-- Rate Experience & Reply to Counter CTA -->
            <tr>
              <td style="padding: 0 24px 24px 24px; text-align: center;">
                <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 1.5px solid #e9d5ff; padding: 22px 20px; border-radius: 14px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #581c87;">⭐ Rate Experience &amp; Reply to Counter</h4>
                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #7e22ce; line-height: 1.5;">
                    Have feedback or a message for our counter staff? Click below to rate your service and send a reply directly to the operator and branch console.
                  </p>
                  <a href="{feedback_link}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 10px; font-weight: 800; font-size: 13px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                    Submit Feedback &amp; Reply to Counter →
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 6px 0; font-weight: 600;">Powered by <strong>Quesoles Queue Management System</strong></p>
                <p style="margin: 0;">Sent on behalf of {company_name} · {branch_name}</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        plain_text = (
            f"TICKET {status_title}\n"
            f"Token Number: {token_number}\n"
            f"Customer Name: {customer_name}\n"
            f"Contact: {customer_phone}\n"
            f"Service: {service_name}\n"
            f"Counter Desk: {desk_name}\n"
            f"Operator: {operator_name}\n"
            f"Branch: {branch_name} ({company_name})\n"
            f"Time: {timestamp_str}\n"
        )

        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipient_list
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        logger.info(f"[EMAIL DISPATCH SUCCESS] Sent disposition '{disposition}' email for Ticket #{token_number} to {recipient_list}")

    except Exception as e:
        logger.error(f"[EMAIL DISPATCH ERROR] Failed to send disposition email for ticket #{ticket_id}: {str(e)}", exc_info=True)
