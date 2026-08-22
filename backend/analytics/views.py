import re
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from reports.models import Report
from .insights_engine import AIInsightsEngine

logger = logging.getLogger(__name__)

class InsightsView(APIView):
    """
    Exposes live Calculated AI Health Insights, percentage changes,
    and personalized health recommendations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response({"error": "member_id parameter is required"}, status=400)
        
        try:
            engine = AIInsightsEngine()
            insights_data = engine.analyze_member_health(member_id)
            return Response(insights_data)
        except Exception as e:
            logger.error(f"Failed to calculate insights: {e}")
            return Response({"error": str(e)}, status=500)


class RiskSummaryView(APIView):
    """
    Exposes a summary of overall risks, active warning statuses,
    and abnormal parameter tallies.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response({"error": "member_id parameter is required"}, status=400)
        
        try:
            engine = AIInsightsEngine()
            insights_data = engine.analyze_member_health(member_id)
            return Response({
                "abnormal_parameter_count": insights_data["abnormal_parameter_count"],
                "risk_score": insights_data["risk_score"],
                "overall_status": insights_data["overall_status"],
                "latest_warnings": insights_data["latest_warnings"]
            })
        except Exception as e:
            logger.error(f"Failed to calculate risk summary: {e}")
            return Response({"error": str(e)}, status=500)


class MemberTrendsView(APIView):
    """
    Retrieves live historical value mappings for a specific parameter
    to feed responsive frontend charts.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        member_id = request.query_params.get('member_id')
        parameter = request.query_params.get('parameter')
        if not member_id or not parameter:
            return Response({"error": "member_id and parameter are required"}, status=400)
        
        try:
            reports = list(Report.objects.filter(member_id=member_id).order_by('date'))
            trends = []
            for r in reports:
                for item in (r.lab_values or []):
                    if parameter.lower() in item.get('parameter', '').lower():
                        val_str = str(item.get('value', ''))
                        try:
                            # Extract numeric components safely
                            num_val = float(re.findall(r'[-+]?\d*\.\d+|\d+', val_str)[0])
                            trends.append({
                                "date": r.date,
                                "value": num_val,
                                "unit": item.get('unit', '')
                            })
                        except (IndexError, ValueError):
                            continue
            return Response(trends)
        except Exception as e:
            logger.error(f"Failed to calculate member trends: {e}")
            return Response({"error": str(e)}, status=500)


class ChatAssistantView(APIView):
    """
    Intelligent Conversational Local Health Assistant endpoint.
    Answers health queries locally using family medical profile, stored lab reports,
    active alerts, and MedicalKnowledgeEngine without calling any external API.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])

        if not message:
            return Response({"error": "message is a required field"}, status=400)

        try:
            from family.models import FamilyMember
            from alerts.models import Alert
            from services.medical_knowledge import MedicalKnowledgeEngine, MEDICAL_KNOWLEDGE_CATALOG

            kb_engine = MedicalKnowledgeEngine()

            # 1. Fetch current user's family members
            family_members = list(FamilyMember.objects.filter(family__user=request.user))
            if not family_members:
                return Response({
                    "response": "Hello! I am your Local AI Health Assistant. I don't see any family profiles created yet. Please add a family member and upload reports to view personalized health insights."
                })

            # 2. Build local health context
            member_context = []
            abnormal_items = []

            for member in family_members:
                member_reports = list(Report.objects.filter(member=member).order_by('-date'))
                member_alerts = list(Alert.objects.filter(member=member, status='Active'))

                m_summary = f"**Member**: {member.name} ({member.relation}, Age: {member.age})\n"

                if member_alerts:
                    m_summary += "  * Active Alerts:\n"
                    for a in member_alerts:
                        m_summary += f"    - **{a.title}** ({a.severity}): {a.description}\n"

                if member_reports:
                    latest = member_reports[0]
                    m_summary += f"  * Latest Report: '{latest.title}' ({latest.date}) - Abnormality Status: **{latest.abnormality}**\n"
                    if latest.summary:
                        m_summary += f"    Summary: {latest.summary}\n"

                    lab_vals = latest.lab_values or []
                    if lab_vals:
                        m_summary += "    Extracted Lab Parameters:\n"
                        for item in lab_vals:
                            if isinstance(item, dict):
                                status = item.get('status', 'Normal')
                                param = item.get('parameter', 'Unknown')
                                val = item.get('value', 'N/A')
                                unit = item.get('unit', '')
                                range_str = item.get('range', 'N/A')

                                if status in ['Borderline', 'Critical']:
                                    abnormal_items.append(f"**{param}** ({member.name}): {val} {unit} [{status}] (Ref Range: {range_str})")

                                m_summary += f"      - {param}: {val} {unit} [{status}] (Ref Range: {range_str})\n"

                member_context.append(m_summary)

            full_context_str = "\n".join(member_context)

            # 3. Match specific queries locally
            msg_lower = message.lower()
            response_parts = []

            # Check if user asks about a specific lab parameter
            matched_param = None
            for p_name in MEDICAL_KNOWLEDGE_CATALOG.keys():
                if p_name.lower() in msg_lower or any(part.lower() in msg_lower for part in p_name.split()):
                    matched_param = p_name
                    break

            if matched_param:
                kb_info = MEDICAL_KNOWLEDGE_CATALOG[matched_param]
                response_parts.append(f"### {matched_param} Overview\n{kb_info['description']}\n")
                response_parts.append(f"**Recommendation:** {kb_info['recommendation']}\n")

            if "summary" in msg_lower or "overall" in msg_lower or "health" in msg_lower:
                response_parts.append("### Family Health Profile Summary\n")
                response_parts.append(full_context_str)

            if abnormal_items and ("alert" in msg_lower or "warning" in msg_lower or "abnormal" in msg_lower or "high" in msg_lower or "low" in msg_lower):
                response_parts.append("\n### Active Abnormal Parameters Requiring Attention:\n")
                for ab in abnormal_items:
                    response_parts.append(f"- {ab}")

            if not response_parts:
                response_parts.append(f"Hello! I am your **Local AI Health Assistant** (Offline Mode). Here is the current clinical overview for your registered family members:\n\n{full_context_str}\n")
                if abnormal_items:
                    response_parts.append("\n**Key Health Attention Items:**\n")
                    for ab in abnormal_items:
                        response_parts.append(f"- {ab}\n")
                response_parts.append("\n*How else can I assist you with your family's health reports today?*")

            response_parts.append("\n\n*(Note: Powered 100% locally by offline medical ML models and local health knowledge engine. No external API used.)*")

            return Response({"response": "\n".join(response_parts)})

        except Exception as ex:
            logger.error(f"Local Chat assistant failed: {ex}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({"error": str(ex)}, status=500)


from .prediction_engine import AIHealthPredictionEngine

class PredictionsView(APIView):
    """
    Exposes live dynamic, person-specific AI health predictions
    and risk scores based on uploaded reports.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response({"error": "member_id parameter is required"}, status=400)
        
        try:
            engine = AIHealthPredictionEngine()
            predictions_data = engine.analyze_predictions(member_id)
            return Response(predictions_data)
        except Exception as e:
            logger.error(f"Failed to calculate predictions: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=500)
