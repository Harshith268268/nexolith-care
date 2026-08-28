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
    Dynamic, Question-Aware Local AI Health Assistant Endpoint.
    Uses local Ollama (llama3.1:latest) as the primary conversational LLM.
    Grounds LLM generations in live PostgreSQL family data and local RAG medical knowledge.
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
            from reports.models import Report
            from services.question_router import (
                QuestionRouter, INTENT_GREETING, INTENT_GENERAL_CONVERSATION,
                INTENT_FAMILY_MEMBERS, INTENT_REPORT_LIST, INTENT_REPORT_VALUES,
                INTENT_PARAMETER_VALUE, INTENT_PARAMETER_TREND, INTENT_ABNORMAL_RESULTS,
                INTENT_PATIENT_SPECIFIC_ADVICE, INTENT_GENERAL_MEDICAL, INTENT_UNKNOWN
            )
            from services.trend_engine import ReportTrendEngine
            from services.medical_knowledge import MedicalKnowledgeEngine
            from services.medical_knowledge_base import MedicalKnowledgeBase
            from services.ollama_service import OllamaService

            kb_legacy = MedicalKnowledgeEngine()
            kb = MedicalKnowledgeBase()
            trend_engine = ReportTrendEngine()
            router = QuestionRouter()
            ollama = OllamaService()

            # 1. Fetch current user's family members from PostgreSQL (User Isolation)
            family_members = list(FamilyMember.objects.filter(family__user=request.user))

            # 2. Analyze question with QuestionRouter including history context
            analysis = router.analyze_question(message, history=history, user_family_members=family_members)
            intent = analysis["intent"]
            target_member_name = analysis["target_member_name"]
            canonical_entity = analysis["canonical_entity"]
            parameter_name = analysis["parameter_name"]
            aspect = analysis["aspect"]
            raw_message = analysis["raw_message"]

            # Match target member object if available
            target_member = None
            if target_member_name:
                for m in family_members:
                    if m.name.lower() == target_member_name.lower() or m.name.lower().startswith(target_member_name.lower()):
                        target_member = m
                        break

            ground_truth_context = ""
            fallback_response = ""
            data_source = "database"
            has_reports = True

            # 3. Handle INTENT: GREETING
            if intent == INTENT_GREETING:
                ground_truth_context = "The user is greeting you. Respond warmly as the Nexolith Care Local AI Assistant."
                fallback_response = "Hello! I am your Local AI Health Assistant. How can I help you today?"
                data_source = "local_assistant"

            # 4. Handle INTENT: GENERAL CONVERSATION
            elif intent == INTENT_GENERAL_CONVERSATION:
                ground_truth_context = "The user is engaging in general polite conversation with the assistant."
                fallback_response = "You're welcome! I am here to assist you with your family's medical records, health trends, and general medical queries offline."
                data_source = "local_assistant"

            # 5. Handle INTENT: FAMILY MEMBERS
            elif intent == INTENT_FAMILY_MEMBERS:
                if target_member:
                    reps_count = Report.objects.filter(member=target_member).count()
                    metrics = [
                        f"Relationship: {target_member.relation}",
                        f"Age: {target_member.age} years old",
                        f"Gender: {target_member.gender or 'Unspecified'}",
                        f"Stored Reports: {reps_count}"
                    ]
                    if target_member.height_cm:
                        metrics.append(f"Height: {target_member.height_cm} cm")
                    if target_member.weight_kg:
                        metrics.append(f"Weight: {target_member.weight_kg} kg")
                    if target_member.bmi:
                        metrics.append(f"BMI: {target_member.bmi} kg/m²")
                    
                    ground_truth_context = f"PostgreSQL Profile Details for {target_member.name}:\n" + "\n".join([f"• {m}" for m in metrics])
                    if reps_count == 0:
                        ground_truth_context += f"\nNote: {target_member.name} currently has 0 medical reports stored."
                    fallback_response = f"### Profile Details for {target_member.name}\n" + "\n".join([f"• **{m.split(':')[0]}**: {m.split(':')[1].strip()}" for m in metrics])
                elif not family_members:
                    ground_truth_context = "User currently has 0 family members added to their profile in PostgreSQL."
                    fallback_response = "There are currently no family members added to your profile."
                    has_reports = False
                else:
                    parts = ["Registered Family Members in PostgreSQL:"]
                    for m in family_members:
                        m_reps = Report.objects.filter(member=m).count()
                        m_metrics = [f"{m.relation}", f"Gender: {m.gender or 'Unspecified'}", f"Age: {m.age}", f"Reports: {m_reps}"]
                        if m.height_cm: m_metrics.append(f"Height: {m.height_cm} cm")
                        if m.weight_kg: m_metrics.append(f"Weight: {m.weight_kg} kg")
                        if m.bmi: m_metrics.append(f"BMI: {m.bmi} kg/m²")
                        parts.append(f"• {m.name} — {', '.join(m_metrics)}")
                    ground_truth_context = "\n".join(parts)
                    fallback_response = "### Your Registered Family Members\n" + "\n".join(parts[1:])

            # 6. Handle INTENT: REPORT VALUES ("what are the values in Sarah's report?")
            elif intent == INTENT_REPORT_VALUES:
                target_m = target_member
                if not target_m:
                    members_with_reps = [m for m in family_members if Report.objects.filter(member=m).exists()]
                    if len(members_with_reps) == 1:
                        target_m = members_with_reps[0]
                    elif len(family_members) == 1:
                        target_m = family_members[0]

                if not target_m:
                    m_label = target_member_name or "The specified member"
                    ground_truth_context = f"{m_label} currently has 0 medical reports stored in PostgreSQL."
                    fallback_response = f"{m_label} currently has no stored medical reports."
                    has_reports = False
                else:
                    reps = list(Report.objects.filter(member=target_m).order_by('-date'))
                    if not reps:
                        ground_truth_context = f"{target_m.name} currently has 0 medical reports stored in PostgreSQL."
                        fallback_response = f"{target_m.name} currently has no stored medical reports."
                        has_reports = False
                    else:
                        latest_r = reps[0]
                        parts = [
                            f"Report Title: '{latest_r.title or 'Blood Test'}'",
                            f"Report Date: {latest_r.date}",
                            f"Patient: {target_m.name}\nLab Values:"
                        ]
                        db_params = list(latest_r.parameters.all())
                        if db_params:
                            for p in db_params:
                                unit_str = f" {p.unit}" if p.unit else ""
                                ref_range = p.range if p.range else "N/A"
                                parts.append(f"• {p.parameter}: {p.value}{unit_str} (Reference Range: {ref_range}, Status: {p.status})")
                        elif latest_r.lab_values:
                            for item in latest_r.lab_values:
                                if isinstance(item, dict):
                                    param = item.get("parameter", "Unknown")
                                    val = item.get("value", "—")
                                    unit = item.get("unit", "")
                                    ref_range = item.get("range", "N/A")
                                    status = item.get("status", "Normal")
                                    unit_str = f" {unit}" if unit else ""
                                    parts.append(f"• {param}: {val}{unit_str} (Reference Range: {ref_range}, Status: {status})")
                        else:
                            parts.append("No lab parameters found in this report.")

                        ground_truth_context = f"PostgreSQL Stored Report Values for {target_m.name}:\n" + "\n".join(parts)
                        fallback_response = f"### {target_m.name} — {latest_r.title or 'Blood Test'}\nReport Date: {latest_r.date}\n" + "\n".join(parts[3:])

            # 7. Handle INTENT: PATIENT SPECIFIC ADVICE
            elif intent == INTENT_PATIENT_SPECIFIC_ADVICE:
                p_label = parameter_name or "Fasting Glucose"
                edu_guidance = kb.retrieve_knowledge(canonical_entity or "glucose", aspect or "prevention", raw_message)
                target_str = target_member.name if target_member else (target_member_name or "the specified member")
                
                if target_member:
                    reps = list(Report.objects.filter(member=target_member).order_by('-date'))
                    found_val = None
                    if parameter_name or canonical_entity:
                        target_p_lower = (parameter_name or canonical_entity).lower()
                        for r in reps:
                            for item in (r.lab_values or []):
                                if isinstance(item, dict) and (target_p_lower in item.get('parameter', '').lower() or item.get('parameter', '').lower() in target_p_lower):
                                    found_val = item
                                    break
                            if found_val:
                                break

                    if found_val:
                        ground_truth_context = (
                            f"PostgreSQL Patient Data for {target_member.name}:\n"
                            f"Latest recorded {p_label}: {found_val.get('value')} {found_val.get('unit', '')} (Status: {found_val.get('status')})\n\n"
                            f"Medical Guidance from Knowledge Base:\n{edu_guidance}"
                        )
                        fallback_response = (
                            f"### Guidance for {target_member.name}'s {p_label}\n\n"
                            f"{target_member.name}'s latest recorded {p_label} is **{found_val.get('value')} {found_val.get('unit', '')}** (Status: **{found_val.get('status')}**).\n\n"
                            f"{edu_guidance}"
                        )
                    else:
                        ground_truth_context = (
                            f"PostgreSQL Status: No current {p_label} result found for {target_str} in stored reports.\n\n"
                            f"Medical Guidance from Knowledge Base:\n{edu_guidance}"
                        )
                        fallback_response = (
                            f"I don't have a current {p_label} result for {target_str} in the stored reports.\n\n"
                            f"{edu_guidance}"
                        )
                else:
                    ground_truth_context = (
                        f"PostgreSQL Status: No current {p_label} result found for {target_str}.\n\n"
                        f"Medical Guidance from Knowledge Base:\n{edu_guidance}"
                    )
                    fallback_response = (
                        f"I don't have a current {p_label} result for {target_str} in the stored reports.\n\n"
                        f"{edu_guidance}"
                    )
                data_source = "local_knowledge_engine"

            # 8. Handle INTENT: REPORT LIST ("how many reports does Sarah have?")
            elif intent == INTENT_REPORT_LIST:
                if target_member_name:
                    if target_member:
                        reps = list(Report.objects.filter(member=target_member).order_by('-date'))
                        if len(reps) == 0:
                            ground_truth_context = f"PostgreSQL Record: {target_member.name} currently has 0 medical reports stored."
                            fallback_response = f"{target_member.name} currently has 0 stored medical reports."
                            has_reports = False
                        else:
                            parts = [f"PostgreSQL Stored Reports for {target_member.name} ({len(reps)} stored):"]
                            for r in reps:
                                parts.append(f"• '{r.title}' ({r.date}) — Type: {r.type}, Abnormality: {r.abnormality}")
                            ground_truth_context = "\n".join(parts)
                            fallback_response = f"{target_member.name} has {len(reps)} stored medical report{'s' if len(reps) != 1 else ''}:\n" + "\n".join([f"• **{r.title}** ({r.date}) — Type: {r.type}, Abnormality: **{r.abnormality}**" for r in reps])
                    else:
                        ground_truth_context = f"PostgreSQL Record: {target_member_name} currently has 0 medical reports stored."
                        fallback_response = f"{target_member_name} currently has 0 stored medical reports."
                        has_reports = False
                else:
                    total_reps = sum(Report.objects.filter(member=m).count() for m in family_members)
                    if total_reps == 0:
                        ground_truth_context = "PostgreSQL Record: User currently has 0 family medical reports stored."
                        fallback_response = "You currently have 0 medical reports stored in Nexolith Care."
                        has_reports = False
                    else:
                        parts = ["PostgreSQL Stored Family Medical Reports:"]
                        for m in family_members:
                            reps = list(Report.objects.filter(member=m).order_by('-date'))
                            if reps:
                                parts.append(f"{m.name} ({len(reps)} reports):")
                                for r in reps:
                                    parts.append(f"  • '{r.title}' ({r.date}) — Status: {r.abnormality}")
                            else:
                                parts.append(f"{m.name}: 0 reports stored.")
                        ground_truth_context = "\n".join(parts)
                        fallback_response = f"Your family currently has {total_reps} stored medical report{'s' if total_reps != 1 else ''}:\n" + "\n".join(parts[1:])

            # 9. Handle INTENT: PARAMETER VALUE ("what was Sarah's glucose?")
            elif intent == INTENT_PARAMETER_VALUE:
                target_m = target_member if target_member_name else (family_members[0] if len(family_members) == 1 else None)
                if target_m:
                    reps = list(Report.objects.filter(member=target_m).order_by('-date'))
                    if len(reps) == 0:
                        ground_truth_context = f"PostgreSQL Record: {target_m.name} currently has 0 medical reports stored."
                        fallback_response = f"I don't have any stored glucose or parameter values for {target_m.name}."
                        has_reports = False
                    else:
                        rep_idx = 1 if ("previous" in raw_message.lower() or "earlier" in raw_message.lower()) and len(reps) > 1 else 0
                        r_target = reps[rep_idx]

                        found_item = None
                        if parameter_name or canonical_entity:
                            target_p_lower = (parameter_name or canonical_entity).lower()
                            for item in (r_target.lab_values or []):
                                if isinstance(item, dict):
                                    item_p = item.get('parameter', '').strip()
                                    ip_lower = item_p.lower()
                                    if item_p and (target_p_lower in ip_lower or ip_lower in target_p_lower or ('glucose' in target_p_lower and 'glucose' in ip_lower) or ('cholesterol' in target_p_lower and 'cholesterol' in ip_lower)):
                                        found_item = item
                                        break

                        if found_item:
                            p_name = found_item.get('parameter', parameter_name or canonical_entity.title())
                            p_val = found_item.get('value', 'N/A')
                            p_unit = found_item.get('unit', '')
                            p_range = found_item.get('range', 'N/A')
                            p_status = found_item.get('status', 'Normal')

                            explanation = kb_legacy.get_explanation(p_name, p_status)
                            recommendation = kb_legacy.get_recommendation(p_name)

                            ground_truth_context = (
                                f"PostgreSQL Parameter Record for {target_m.name}:\n"
                                f"Parameter: {p_name}\n"
                                f"Reported Value: {p_val} {p_unit}\n"
                                f"Reference Range: {p_range}\n"
                                f"Status: {p_status}\n"
                                f"Source Report: '{r_target.title}' ({r_target.date})\n"
                                f"Clinical Explanation: {explanation}\n"
                                f"Recommendation: {recommendation}"
                            )

                            prefix = f"### {target_m.name}'s Previous {p_name} Result" if rep_idx == 1 else f"### {target_m.name}'s {p_name} Result"
                            fallback_response = (
                                f"{prefix}\n"
                                f"• **Reported Value**: {p_val} {p_unit}\n"
                                f"• **Reference Range**: {p_range}\n"
                                f"• **Status**: **{p_status}**\n"
                                f"• **Source**: '{r_target.title}' ({r_target.date})\n\n"
                                f"**Clinical Explanation:**\n{explanation}\n\n"
                                f"**Recommendation:**\n{recommendation}"
                            )
                        else:
                            param_label = parameter_name or canonical_entity or "requested parameter"
                            ground_truth_context = f"PostgreSQL Record: No current {param_label} result found for {target_m.name} in stored reports."
                            fallback_response = f"I don't have any stored {param_label} values for {target_m.name}."
                else:
                    if target_member_name:
                        ground_truth_context = f"PostgreSQL Record: {target_member_name} currently has 0 medical reports stored."
                        fallback_response = f"I don't have any stored medical values for {target_member_name}."
                        has_reports = False
                    else:
                        param_label = parameter_name or canonical_entity or "requested parameter"
                        ground_truth_context = f"PostgreSQL Record: No current {param_label} result found in stored family reports."
                        fallback_response = f"I don't have any stored {param_label} values in your family's reports."
                        has_reports = False

            # 10. Handle INTENT: PARAMETER TREND ("how is Sarah's glucose changing?")
            elif intent == INTENT_PARAMETER_TREND:
                target_m = target_member or (family_members[0] if len(family_members) == 1 else None)
                if not target_m:
                    if target_member_name:
                        ground_truth_context = f"PostgreSQL Record: {target_member_name} currently has 0 medical reports stored."
                        fallback_response = f"{target_member_name} currently has no medical reports stored."
                        has_reports = False
                    else:
                        ground_truth_context = "User query requires specifying a family member to analyze parameter trends."
                        fallback_response = "Please specify a family member name to analyze historical parameter trends (e.g. 'Analyze Sarah's glucose trend')."
                        data_source = "local_assistant"
                else:
                    reps = list(Report.objects.filter(member=target_m).order_by('date'))
                    if len(reps) == 0:
                        ground_truth_context = f"PostgreSQL Record: {target_m.name} currently has 0 medical reports stored."
                        fallback_response = f"{target_m.name} currently has no medical reports stored, so there isn't enough report data to assess trends yet."
                        has_reports = False
                    else:
                        historical_items = []
                        param_target = parameter_name or "Fasting Glucose"
                        for r in reps:
                            for item in (r.lab_values or []):
                                if isinstance(item, dict) and param_target.lower() in item.get('parameter', '').lower():
                                    historical_items.append({
                                        "date": str(r.date),
                                        "value": item.get('value'),
                                        "unit": item.get('unit', ''),
                                        "title": r.title,
                                        "status": item.get('status', 'Normal')
                                    })
                        if not historical_items:
                            ground_truth_context = f"PostgreSQL Record: {target_m.name} has reports, but no historical {param_target} measurements were found."
                            fallback_response = f"There are no recorded {param_target} measurements stored for {target_m.name} to analyze trends."
                        else:
                            trend_result = trend_engine.analyze_parameter_trend(target_m.name, param_target, historical_items)
                            ground_truth_context = f"PostgreSQL Historical Parameter Trend for {target_m.name} ({param_target}):\n{trend_result['response']}"
                            fallback_response = trend_result["response"]

            # 11. Handle INTENT: ABNORMAL RESULTS / ACTIVE WARNINGS / HEALTH RISKS
            elif intent == INTENT_ABNORMAL_RESULTS:
                active_alerts = list(Alert.objects.filter(member__family__user=request.user, status__in=['Active', 'Upcoming']))
                if target_member:
                    active_alerts = [a for a in active_alerts if a.member_id == target_member.id]

                abnormal_labs = []
                for m in family_members:
                    if target_member and m.id != target_member.id:
                        continue
                    reps = list(Report.objects.filter(member=m).order_by('-date'))
                    if reps:
                        latest_r = reps[0]
                        for item in (latest_r.lab_values or []):
                            if isinstance(item, dict) and item.get('status') in ['Borderline', 'Critical']:
                                abnormal_labs.append({
                                    "member": m.name,
                                    "parameter": item.get('parameter'),
                                    "value": item.get('value'),
                                    "unit": item.get('unit', ''),
                                    "status": item.get('status'),
                                    "range": item.get('range', 'N/A'),
                                    "report": latest_r.title,
                                    "date": str(latest_r.date)
                                })

                if not active_alerts and not abnormal_labs:
                    ground_truth_context = "PostgreSQL Record: There are currently no active health warnings or abnormal report results stored for your family."
                    fallback_response = "There are currently no active health warnings or abnormal report results stored for your family."
                else:
                    parts = ["PostgreSQL Active Health Warnings & Abnormal Parameters:"]
                    if active_alerts:
                        parts.append("Active Reminders / Alerts:")
                        for a in active_alerts:
                            m_name = a.member.name if a.member else "Family"
                            parts.append(f"• [{a.severity}] {a.title} ({m_name}): {a.description} (Date: {a.date})")
                    if abnormal_labs:
                        parts.append("Abnormal Lab Results:")
                        for item in abnormal_labs:
                            parts.append(f"• {item['member']} — {item['parameter']}: {item['value']} {item['unit']} [{item['status']}] (Report: '{item['report']}', {item['date']})")
                    
                    ground_truth_context = "\n".join(parts)
                    fallback_response = "### Active Health Warnings & Abnormal Results\n" + "\n".join(parts[1:])

            # 12. Handle INTENT: GENERAL MEDICAL QUESTION (e.g. "what is haemoglobin", "what is glucose")
            else:
                medical_ans = kb.retrieve_knowledge(canonical_entity or "general", aspect=aspect, raw_query=raw_message)
                ground_truth_context = f"General Medical Knowledge Context:\nQuestion: '{raw_message}'\nReference Medical Knowledge:\n{medical_ans}"
                fallback_response = medical_ans
                data_source = "local_knowledge_engine"

            # 13. Pass Ground-Truth Context & Query to Ollama (llama3.1:latest)
            ollama_result = ollama.generate_response(
                user_query=raw_message,
                system_context=ground_truth_context,
                history=history
            )

            if ollama_result.get("success") and ollama_result.get("response"):
                return Response({
                    "response": ollama_result["response"],
                    "data_source": "ollama_local",
                    "has_reports": has_reports
                })

            return Response({
                "response": fallback_response,
                "data_source": data_source,
                "has_reports": has_reports
            })

        except Exception as e:
            logger.error(f"Chat assistant view failed: {e}", exc_info=True)
            return Response({"error": f"Assistant service failed: {str(e)}"}, status=500)


from .prediction_engine import AIHealthPredictionEngine

class PredictionsView(APIView):
    """
    Exposes live dynamic, person-specific AI health predictions
    and risk scores based on uploaded reports.
    Strictly isolated to authenticated user's family members.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response({"error": "member_id parameter is required"}, status=400)
        
        try:
            from family.models import FamilyMember
            # Account Data Isolation (Rule 10): Ensure member belongs to request.user
            try:
                member = FamilyMember.objects.get(id=member_id, family__user=request.user)
            except FamilyMember.DoesNotExist:
                return Response({"error": "Family member not found or access denied."}, status=404)

            engine = AIHealthPredictionEngine()
            predictions_data = engine.analyze_predictions(member.id)
            return Response(predictions_data)
        except Exception as e:
            logger.error(f"Failed to calculate predictions: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=500)
