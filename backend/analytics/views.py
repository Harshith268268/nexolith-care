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
    Intelligent Conversational AI Health Assistant endpoint.
    Retrieves full logged-in user's family context dynamically and passes it to Gemini.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])

        if not message:
            return Response({"error": "message is a required field"}, status=400)

        try:
            # 1. Fetch current user's family members
            from family.models import FamilyMember
            from alerts.models import Alert

            family_members = list(FamilyMember.objects.filter(family__user=request.user))
            if not family_members:
                family_profile = "Family Profile: Awaiting member creation."
            else:
                profile_items = []
                for member in family_members:
                    # Query reports
                    member_reports = list(Report.objects.filter(member=member).order_by('-date'))
                    # Query active alerts
                    member_alerts = list(Alert.objects.filter(member=member, status='Active'))

                    member_profile = f"Member: {member.name} (Relation: {member.relation}, Age: {member.age})\n"
                    
                    if member_alerts:
                        member_profile += "  Active Alerts/Warnings:\n"
                        for a in member_alerts:
                            member_profile += f"    - Alert: {a.title} (Severity: {a.severity}) - {a.description}\n"
                    else:
                        member_profile += "  Active Alerts/Warnings: None\n"

                    if member_reports:
                        member_profile += "  Clinical Reports History:\n"
                        for r in member_reports[:3]:  # Top 3 latest reports for brevity and token efficiency
                            member_profile += f"    - Report Title: '{r.title}' (Type: {r.type}, Date: {r.date}, Abnormality Status: {r.abnormality})\n"
                            if r.summary:
                                member_profile += f"      Plain English Summary: {r.summary}\n"
                            
                            # Add extracted parameters
                            lab_vals = r.lab_values
                            if isinstance(lab_vals, str):
                                import json
                                try:
                                    lab_vals = json.loads(lab_vals)
                                except Exception:
                                    lab_vals = []
                            if not isinstance(lab_vals, list):
                                lab_vals = []

                            if lab_vals:
                                member_profile += "      Extracted Lab Values:\n"
                                for item in lab_vals:
                                    if isinstance(item, dict):
                                        member_profile += f"        * {item.get('parameter', 'Unknown')}: {item.get('value', 'N/A')} {item.get('unit', '')} [Status: {item.get('status', 'Normal')}] - {item.get('explanation', '')}\n"
                    else:
                        member_profile += "  Clinical Reports History: No reports uploaded yet.\n"
                    
                    profile_items.append(member_profile)

                family_profile = "\n".join(profile_items)

            # 2. Construct dynamic context-rich system instructions
            system_instruction = f"""
You are Nexolith Care's Premium Conversational AI Health Assistant. Below is the clinical profile of the user's family members:

{family_profile}

---

INSTRUCTIONS:
1. Personalized Query Resolution: You must answer questions using these stored reports, alerts, and analytics. If the user asks about trends (e.g. glucose, cholesterol, BP), look at the history provided above, compare values across dates, and compute changes.
2. Wellness Guidance: Combine personalized medical data with general health recommendations. If someone has elevated parameters, give reassuring advice, dietary recommendations, and exercise regimes tailored to their status.
3. Clarity and Visual Highlighting:
   - Always highlight abnormal parameters (Borderline or Critical) using bold markdown (e.g. **Glucose: 128 mg/dL [Borderline]**).
   - Use simple plain English terms to explain parameters.
   - Advise scheduling a checkup or consulting a physician whenever critical values are present.
4. Security & Privacy: Do not expose records belonging to other users. Protect the bounds of this clinical profile. If the user asks about a family member not listed above, politely clarify you don't have records for them.
"""

            # 3. Initialize Gemini Modern SDK Client
            import os
            from django.conf import settings
            from dotenv import load_dotenv

            dotenv_path = os.path.join(settings.BASE_DIR, '.env')
            load_dotenv(dotenv_path, override=True)
            api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')

            if not api_key:
                return Response({
                    "response": "Hello! I am your AI Health Assistant. Currently, my API key is inactive, but I can see your profile details. Please configure a valid API key to enable conversational chats."
                })

            # Check SDK type and trigger generation
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=api_key)
                contents = []

                # Append conversation history
                for h in history:
                    role = 'user' if h.get('role') == 'user' else 'model'
                    contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=h.get('content', ''))]
                        )
                    )

                # Append latest user query
                contents.append(
                    types.Content(
                        role='user',
                        parts=[types.Part.from_text(text=message)]
                    )
                )

                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7
                    )
                )
                ai_text = response.text
            except Exception as e:
                logger.warning(f"Modern google-genai SDK call failed. Trying legacy SDK fallback: {e}")
                # Fallback to legacy SDK
                import google.generativeai as legacy_genai
                legacy_genai.configure(api_key=api_key)
                model = legacy_genai.GenerativeModel(
                    model_name='gemini-1.5-flash',
                    system_instruction=system_instruction
                )
                # Parse history for legacy
                legacy_history = []
                for h in history:
                    role = 'user' if h.get('role') == 'user' else 'model'
                    legacy_history.append({"role": role, "parts": [h.get('content', '')]})

                chat = model.start_chat(history=legacy_history)
                response = chat.send_message(message)
                ai_text = response.text

            return Response({"response": ai_text})

        except Exception as ex:
            logger.error(f"Chat assistant failed to run query: {ex}")
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
