import logging
from typing import List
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import Alert

logger = logging.getLogger(__name__)

class EmailAlertNotifier:
    """
    Automatic Email Alert Notification Service for Nexolith Care.
    Generates professional, dynamic HTML alert emails grounded in PostgreSQL report data,
    incorporates duplicate protection, user account isolation, and fail-safe exception handling.
    """

    def send_alert_email_for_report(self, report) -> bool:
        if not report or not report.member or not report.member.family or not report.member.family.user:
            logger.warning("Cannot send alert email: Report is missing member or user relationship.")
            return False

        user = report.member.family.user
        recipient_email = getattr(user, 'email', '').strip()

        if not recipient_email or '@' not in recipient_email:
            logger.warning(f"User '{user.username}' has no valid registered email address. Skipping email alert.")
            return False

        # 1. Fetch un-sent abnormal/critical alerts for this report
        pending_alerts = list(Alert.objects.filter(
            report=report,
            severity__in=['Borderline', 'Critical'],
            email_sent=False
        ))

        if not pending_alerts:
            logger.info(f"No unsent abnormal alerts found for report '{report.title}' (id={report.id}). Skipping email.")
            return False

        member_name = report.member.name
        report_title = report.title or "Medical Lab Report"
        report_date = str(report.date or timezone.now().date())

        has_critical = any(a.severity == 'Critical' for a in pending_alerts)

        # 2. Build Plain-Text Email Body
        text_lines = [
            f"NEXOLITH CARE HEALTH ALERT NOTIFICATION",
            f"=" * 40,
            f"Patient Name: {member_name}",
            f"Report Title: {report_title}",
            f"Report Date:  {report_date}",
            f"",
            f"HEALTH ALERTS DETECTED:",
        ]

        for a in pending_alerts:
            text_lines.append(f"• [{a.severity.upper()}] {a.title}: {a.description}")

        text_lines.extend([
            "",
            "ADVISORY & RECOMMENDED NEXT STEPS:",
            "If any parameter is classified as Critical, please consult a qualified healthcare provider promptly.",
            "Always review abnormal lab values with your primary care physician.",
            "",
            "— Nexolith Care Health Intelligence Team"
        ])
        plain_message = "\n".join(text_lines)

        # 3. Build Professional HTML Email Body
        alerts_html_rows = ""
        for a in pending_alerts:
            status_color = "#C25252" if a.severity == "Critical" else "#D4A050"
            bg_color = "#FDF2F2" if a.severity == "Critical" else "#FDF8ED"
            alerts_html_rows += f"""
            <tr style="border-bottom: 1px solid #E3EEEE;">
              <td style="padding: 12px; font-weight: bold; color: #18313A;">{a.title}</td>
              <td style="padding: 12px;">
                <span style="background-color: {bg_color}; color: {status_color}; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                  {a.severity}
                </span>
              </td>
              <td style="padding: 12px; color: #64777C; font-size: 13px; leading-height: 1.5;">{a.description}</td>
            </tr>
            """

        advisory_box_html = ""
        if has_critical:
            advisory_box_html = """
            <div style="background-color: #FDF2F2; border: 1px solid #FCE4E4; border-radius: 16px; padding: 16px; margin-top: 24px; color: #C25252; font-size: 13px; line-height: 1.5;">
              <strong style="font-size: 14px; display: block; margin-bottom: 4px;">⚠️ CRITICAL HEALTH ADVISORY</strong>
              One or more of the measured parameters above are classified as <strong>Critical</strong>. We strongly recommend seeking prompt medical evaluation from a qualified healthcare provider or emergency medical service. Do not rely solely on automated application notifications.
            </div>
            """
        else:
            advisory_box_html = """
            <div style="background-color: #FDF8ED; border: 1px solid #FBF0D8; border-radius: 16px; padding: 16px; margin-top: 24px; color: #D4A050; font-size: 13px; line-height: 1.5;">
              <strong style="font-size: 14px; display: block; margin-bottom: 4px;">📋 BORDERLINE HEALTH NOTICE</strong>
              Borderline or abnormal health parameters were detected in your latest checkup. We recommend scheduling a routine consultation with your physician to review these trends.
            </div>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F8F8; margin: 0; padding: 20px; color: #18313A; }}
            .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #E3EEEE; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }}
            .header {{ background-color: #1C696D; padding: 24px; text-align: center; color: #ffffff; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; }}
            .header p {{ margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; }}
            .content {{ padding: 28px; }}
            .meta-grid {{ background: #F5F8F8; border-radius: 16px; padding: 16px; margin-bottom: 24px; border: 1px solid #E3EEEE; display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; }}
            .meta-item {{ flex: 1; min-width: 130px; }}
            .meta-label {{ color: #64777C; font-weight: 600; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 2px; }}
            .meta-val {{ color: #18313A; font-weight: bold; font-size: 13px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
            th {{ text-align: left; padding: 10px 12px; background: #F5F8F8; color: #64777C; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #E3EEEE; }}
            .footer {{ background: #F5F8F8; padding: 20px; text-align: center; font-size: 11px; color: #64777C; border-t: 1px solid #E3EEEE; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Nexolith Care</h1>
              <p>Family Health Intelligence Platform</p>
            </div>
            <div class="content">
              <h2 style="font-size: 16px; margin-top: 0; color: #18313A;">Health Alert Notification</h2>
              <p style="font-size: 13px; color: #64777C; margin-bottom: 20px;">
                An automated scan of your newly uploaded medical report detected vital parameters requiring your review.
              </p>
              
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Patient / Member</span>
                  <span class="meta-val">{member_name}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Report Title</span>
                  <span class="meta-val">{report_title}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Report Date</span>
                  <span class="meta-val">{report_date}</span>
                </div>
              </div>

              <h3 style="font-size: 14px; margin-bottom: 8px; color: #18313A;">Detected Health Parameters</h3>
              <table>
                <thead>
                  <tr>
                    <th>Alert / Parameter</th>
                    <th>Status</th>
                    <th>Details & Description</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts_html_rows}
                </tbody>
              </table>

              {advisory_box_html}
            </div>

            <div class="footer">
              This email was automatically generated by Nexolith Care for <strong>{user.email}</strong>.<br>
              © 2026 Nexolith Care. Confidential family health record notification.
            </div>
          </div>
        </body>
        </html>
        """

        subject = f"Nexolith Care Health Alert: Abnormal Medical Result for {member_name}"

        # 4. Dispatch Email with Fail-Safe Protection (Rule 8)
        try:
            logger.info(f"Dispatching health alert email for member '{member_name}' to recipient '{recipient_email}'...")
            sent_count = send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'Nexolith Care <noreply@nexolithcare.com>'),
                recipient_list=[recipient_email],
                html_message=html_content,
                fail_silently=False
            )

            # Update alert model records (Duplicate Protection & UI tracking)
            now = timezone.now()
            for a in pending_alerts:
                a.email_sent = True
                a.email_sent_at = now
                a.save()

            logger.info(f"Successfully sent alert notification email to {recipient_email} for {len(pending_alerts)} alert(s).")
            return True

        except Exception as e:
            logger.error(f"Failed to send email alert to {recipient_email}: {e}", exc_info=True)
            # Ensure report upload and alert records remain saved in PostgreSQL even if email fails!
            return False
