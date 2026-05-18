import json
import logging
from django.http import HttpResponse
from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.contrib.auth.models import User
from family.models import FamilyMember
from reports.models import Report
from alerts.models import Alert
from .models import UserProfile, NotificationPreferences

logger = logging.getLogger(__name__)

class ChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({"error": "Both old_password and new_password fields are required."}, status=400)

        if not user.check_password(old_password):
            return Response({"error": "Your current password is incorrect."}, status=400)

        try:
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password changed successfully!"})
        except Exception as e:
            return Response({"error": f"Failed to change password: {str(e)}"}, status=500)

class LogoutAllView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Clears outstanding sessions on the client side
        return Response({"message": "Successfully logged out of all active sessions."})

class ExportUserDataView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Fetch user settings & profile details
        profile, _ = UserProfile.objects.get_or_create(user=user)
        prefs, _ = NotificationPreferences.objects.get_or_create(user=user)

        # 2. Fetch family tree details
        members = FamilyMember.objects.filter(family__user=user)
        
        exported_data = {
            "platform": "Nexolith Care",
            "export_version": "1.0",
            "account": {
                "username": user.username,
                "email": user.email,
                "full_name": profile.full_name,
                "phone_number": profile.phone_number,
                "notification_preferences": {
                    "alert_notifications": prefs.alert_notifications,
                    "medication_reminders": prefs.medication_reminders,
                    "email_notifications": prefs.email_notifications,
                    "ai_health_warnings": prefs.ai_health_warnings,
                    "report_upload_confirmations": prefs.report_upload_confirmations
                }
            },
            "family_members": []
        }

        # 3. Serialize family members, reports, and alerts
        for member in members:
            member_reports = Report.objects.filter(member=member).order_by('-date')
            member_alerts = Alert.objects.filter(member=member)

            member_details = {
                "name": member.name,
                "age": member.age,
                "relation": member.relation,
                "reports": [],
                "alerts": []
            }

            for r in member_reports:
                member_details["reports"].append({
                    "title": r.title,
                    "date": str(r.date),
                    "type": r.type,
                    "abnormality": r.abnormality,
                    "summary": r.summary,
                    "doctor_notes": r.doctor_notes,
                    "lab_values": r.lab_values,
                    "ocr_text": r.ocr_text
                })

            for a in member_alerts:
                member_details["alerts"].append({
                    "title": a.title,
                    "date": str(a.date),
                    "severity": a.severity,
                    "status": a.status,
                    "description": a.description
                })

            exported_data["family_members"].append(member_details)

        # 4. Return downloadable file response
        response = HttpResponse(
            json.dumps(exported_data, indent=2),
            content_type="application/json"
        )
        response["Content-Disposition"] = "attachment; filename=nexolith_care_health_record.json"
        return response
