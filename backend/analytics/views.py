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
    Dynamic, Question-Aware Local AI Health Assistant Endpoint.
    100% Offline with zero external APIs, zero LLMs, zero API keys.
    Routes queries dynamically based on question intent (Greetings, Family, Reports, Parameters, Trends, General Education).
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
                QuestionRouter, INTENT_GENERAL_GREETING, INTENT_FAMILY_MEMBERS,
                INTENT_REPORT_LIST, INTENT_REPORT_VALUES, INTENT_PARAMETER_VALUE, INTENT_PARAMETER_TREND,
                INTENT_ABNORMAL_RESULTS, INTENT_HEALTH_SUMMARY, INTENT_MEDICAL_GENERAL_QUESTION,
                INTENT_PATIENT_SPECIFIC_ADVICE, INTENT_UNKNOWN
            )
            from services.trend_engine import ReportTrendEngine
            from services.medical_knowledge import MedicalKnowledgeEngine, MEDICAL_KNOWLEDGE_CATALOG

            kb_engine = MedicalKnowledgeEngine()
            trend_engine = ReportTrendEngine()
            router = QuestionRouter()

            # 1. Fetch current user's family members
            family_members = list(FamilyMember.objects.filter(family__user=request.user))
            known_member_names = [m.name for m in family_members]

            # 2. Analyze question with QuestionRouter
            analysis = router.analyze_question(message, known_member_names)
            intent = analysis["intent"]
            target_member_name = analysis["target_member_name"]
            parameter_name = analysis["parameter_name"]

            # Match target member object if available
            target_member = None
            if target_member_name:
                for m in family_members:
                    if m.name.lower() == target_member_name.lower() or m.name.lower().startswith(target_member_name.lower()):
                        target_member = m
                        break

            # 3. Handle INTENT: GENERAL GREETING
            if intent == INTENT_GENERAL_GREETING:
                return Response({
                    "response": "Hello! I am your Local AI Health Assistant. I can help you understand your family's stored medical reports, health trends, abnormal results, and general health questions. How can I help you today?",
                    "data_source": "local_assistant",
                    "has_reports": True
                })

            # 4. Handle INTENT: FAMILY MEMBERS
            if intent == INTENT_FAMILY_MEMBERS:
                if not family_members:
                    return Response({
                        "response": "You currently have no family profiles created yet. Please add a family member in the Family Members section to start tracking health records.",
                        "data_source": "database",
                        "has_reports": False
                    })
                
                parts = ["### Your Registered Family Members\n"]
                for m in family_members:
                    metrics = [f"{m.relation}", f"Gender: {m.gender or 'Unspecified'}", f"Age: {m.age}"]
                    if m.height_cm:
                        metrics.append(f"Height: {m.height_cm} cm")
                    if m.weight_kg:
                        metrics.append(f"Weight: {m.weight_kg} kg")
                    if m.bmi:
                        metrics.append(f"BMI: {m.bmi} kg/m²")
                    parts.append(f"• **{m.name}** — {', '.join(metrics)}")
                
                return Response({
                    "response": "\n".join(parts),
                    "data_source": "database",
                    "has_reports": True
                })

            # 4.5. Handle INTENT: REPORT VALUES ("what are the values in Sarah's report?")
            if intent == INTENT_REPORT_VALUES:
                target_m = target_member or (family_members[0] if len(family_members) == 1 else None)
                if not target_m:
                    if not family_members:
                        return Response({
                            "response": "You currently have no family members or medical reports stored in Nexolith Care.",
                            "data_source": "database",
                            "has_reports": False
                        })
                    target_m = family_members[0]

                reps = list(Report.objects.filter(member=target_m).order_by('-date'))
                if not reps:
                    return Response({
                        "response": f"{target_m.name} currently has no medical reports stored in Nexolith Care.",
                        "data_source": "database",
                        "has_reports": False
                    })

                latest_r = reps[0]
                report_date_str = str(latest_r.date)
                report_title = latest_r.title or "Blood Test"

                parts = [
                    f"{target_m.name} — {report_title}",
                    f"Report Date: {report_date_str}\n"
                ]

                db_params = list(latest_r.parameters.all())
                if db_params:
                    for p in db_params:
                        unit_str = f" {p.unit}" if p.unit else ""
                        ref_range = p.range if p.range else "—"
                        parts.append(
                            f"• **{p.parameter}**: {p.value}{unit_str}\n"
                            f"  Reference Range: {ref_range}\n"
                            f"  Status: {p.status}\n"
                        )
                elif latest_r.lab_values:
                    for item in latest_r.lab_values:
                        if not isinstance(item, dict):
                            continue
                        param = item.get("parameter", "Unknown")
                        val = item.get("value", "—")
                        unit = item.get("unit", "")
                        ref_range = item.get("range", "—")
                        status = item.get("status", "Normal")
                        unit_str = f" {unit}" if unit else ""

                        parts.append(
                            f"• **{param}**: {val}{unit_str}\n"
                            f"  Reference Range: {ref_range}\n"
                            f"  Status: {status}\n"
                        )
                else:
                    parts.append("No medical lab parameters were found in this stored report.")

                return Response({
                    "response": "\n".join(parts).strip(),
                    "data_source": "database",
                    "has_reports": True
                })

            # 5. Handle INTENT: GENERAL MEDICAL QUESTION (Educational)
            if intent == INTENT_MEDICAL_GENERAL_QUESTION:
                edu_response = kb_engine.get_general_educational_response(message, parameter_name)
                return Response({
                    "response": edu_response,
                    "data_source": "local_knowledge_engine",
                    "has_reports": True
                })

            # 6. Handle INTENT: PATIENT SPECIFIC ADVICE ("How can Sarah decrease her glucose?")
            if intent == INTENT_PATIENT_SPECIFIC_ADVICE:
                edu_guidance = kb_engine.get_general_educational_response(message, parameter_name)
                
                if target_member:
                    reps = list(Report.objects.filter(member=target_member).order_by('-date'))
                    # Search for stored parameter value
                    found_val = None
                    if parameter_name:
                        for r in reps:
                            for item in (r.lab_values or []):
                                if isinstance(item, dict) and parameter_name.lower() in item.get('parameter', '').lower():
                                    found_val = item
                                    break
                            if found_val:
                                break

                    if found_val:
                        resp_str = (
                            f"### Guidance for {target_member.name}'s {parameter_name}\n\n"
                            f"{target_member.name}'s latest recorded {parameter_name} is **{found_val.get('value')} {found_val.get('unit', '')}** (Status: **{found_val.get('status')}**).\n\n"
                            f"{edu_guidance}"
                        )
                    else:
                        resp_str = (
                            f"I don't have a current {parameter_name or 'medical'} result for {target_member.name} in her stored reports. "
                            f"I can still provide general educational information about maintaining healthy levels:\n\n{edu_guidance}"
                        )
                else:
                    target_str = target_member_name or "the specified member"
                    resp_str = (
                        f"I don't have a current {parameter_name or 'medical'} result for {target_str} in the stored reports. "
                        f"Here is general educational guidance on maintaining healthy levels:\n\n{edu_guidance}"
                    )

                return Response({
                    "response": resp_str,
                    "data_source": "local_knowledge_engine",
                    "has_reports": True
                })

            # 7. Handle INTENT: REPORT LIST
            if intent == INTENT_REPORT_LIST:
                if target_member_name:
                    if target_member:
                        reps = list(Report.objects.filter(member=target_member).order_by('-date'))
                        if len(reps) == 0:
                            return Response({
                                "response": f"{target_member.name} currently has no medical reports stored in Nexolith Care.",
                                "data_source": "database",
                                "has_reports": False
                            })
                        parts = [f"### Medical Reports for {target_member.name} ({len(reps)} stored)\n"]
                        for r in reps:
                            parts.append(f"• **{r.title}** ({r.date}) — Type: {r.type}, Abnormality: **{r.abnormality}**")
                        return Response({
                            "response": "\n".join(parts),
                            "data_source": "database",
                            "has_reports": True
                        })
                    else:
                        return Response({
                            "response": f"{target_member_name} currently has no medical reports stored in Nexolith Care.",
                            "data_source": "database",
                            "has_reports": False
                        })
                else:
                    total_reps = sum(Report.objects.filter(member=m).count() for m in family_members)
                    if total_reps == 0:
                        return Response({
                            "response": "You currently have no medical reports stored in Nexolith Care.",
                            "data_source": "database",
                            "has_reports": False
                        })
                    parts = ["### Stored Family Medical Reports\n"]
                    for m in family_members:
                        reps = list(Report.objects.filter(member=m).order_by('-date'))
                        if reps:
                            parts.append(f"**{m.name}** ({len(reps)} reports):")
                            for r in reps:
                                parts.append(f"  • **{r.title}** ({r.date}) — Status: **{r.abnormality}**")
                        else:
                            parts.append(f"**{m.name}**: No reports stored.")
                    return Response({
                        "response": "\n".join(parts),
                        "data_source": "database",
                        "has_reports": True
                    })

            # 8. Handle INTENT: PARAMETER VALUE
            if intent == INTENT_PARAMETER_VALUE:
                target_m = target_member or (family_members[0] if len(family_members) == 1 else None)
                if target_m:
                    reps = list(Report.objects.filter(member=target_m).order_by('-date'))
                    if len(reps) == 0:
                        return Response({
                            "response": f"{target_m.name} currently has no medical reports stored in Nexolith Care.",
                            "data_source": "database",
                            "has_reports": False
                        })

                    # Search parameter in reports
                    found_item = None
                    found_rep = None
                    if parameter_name:
                        for r in reps:
                            for item in (r.lab_values or []):
                                if isinstance(item, dict):
                                    item_p = item.get('parameter', '').strip()
                                    p_lower = parameter_name.lower()
                                    ip_lower = item_p.lower()
                                    if item_p and (p_lower in ip_lower or ip_lower in p_lower or ('glucose' in p_lower and 'glucose' in ip_lower) or ('cholesterol' in p_lower and 'cholesterol' in ip_lower)):
                                        found_item = item
                                        found_rep = r
                                        break
                            if found_item:
                                break

                    if found_item and found_rep:
                        p_name = found_item.get('parameter', parameter_name)
                        p_val = found_item.get('value', 'N/A')
                        p_unit = found_item.get('unit', '')
                        p_range = found_item.get('range', 'N/A')
                        p_status = found_item.get('status', 'Normal')

                        parts = [
                            f"### {target_m.name}'s {p_name} Result",
                            f"• **Reported Value**: {p_val} {p_unit}",
                            f"• **Reference Range**: {p_range}",
                            f"• **Status**: **{p_status}**",
                            f"• **Source**: '{found_rep.title}' ({found_rep.date})"
                        ]

                        explanation = kb_engine.get_explanation(parameter_name or p_name, p_status)
                        recommendation = kb_engine.get_recommendation(parameter_name or p_name)
                        parts.append(f"\n**Clinical Explanation:**\n{explanation}")
                        parts.append(f"\n**Recommendation:**\n{recommendation}")
                        parts.append("\n\n*(Note: Powered 100% locally by offline medical ML models and local health knowledge engine. No external API used.)*")

                        return Response({
                            "response": "\n".join(parts),
                            "data_source": "database",
                            "has_reports": True
                        })
                    else:
                        param_label = parameter_name or "requested parameter"
                        return Response({
                            "response": f"I don't have a current {param_label} result for {target_m.name} in the stored reports.",
                            "data_source": "database",
                            "has_reports": True
                        })
                else:
                    if target_member_name:
                        return Response({
                            "response": f"{target_member_name} currently has no medical reports stored in Nexolith Care.",
                            "data_source": "database",
                            "has_reports": False
                        })
                    param_label = parameter_name or "requested parameter"
                    return Response({
                        "response": f"I don't have a current {param_label} result in your family's stored reports.",
                        "data_source": "database",
                        "has_reports": False
                    })

            # 9. Handle INTENT: PARAMETER TREND
            if intent == INTENT_PARAMETER_TREND:
                target_m = target_member or (family_members[0] if len(family_members) == 1 else None)
                if not target_m:
                    if target_member_name:
                        return Response({
                            "response": f"{target_member_name} currently has no medical reports stored in Nexolith Care.",
                            "data_source": "database",
                            "has_reports": False
                        })
                    return Response({
                        "response": "Please specify a family member name to analyze historical parameter trends (e.g. 'Analyze Sarah's glucose trend').",
                        "data_source": "local_assistant",
                        "has_reports": True
                    })

                reps = list(Report.objects.filter(member=target_m).order_by('date')) # Chronological
                if len(reps) == 0:
                    return Response({
                        "response": f"{target_m.name} currently has no medical reports stored in Nexolith Care.",
                        "data_source": "database",
                        "has_reports": False
                    })

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

                trend_result = trend_engine.analyze_parameter_trend(target_m.name, param_target, historical_items)
                return Response({
                    "response": trend_result["response"],
                    "data_source": "database",
                    "has_reports": True
                })

            # 10. Handle INTENT: ABNORMAL RESULTS
            if intent == INTENT_ABNORMAL_RESULTS:
                target_m = target_member or (family_members[0] if len(family_members) == 1 else None)
                if target_m:
                    reps = list(Report.objects.filter(member=target_m).order_by('-date'))
                    if len(reps) == 0:
                        return Response({
                            "response": f"{target_m.name} currently has no medical reports stored in Nexolith Care.",
                            "data_source": "database",
                            "has_reports": False
                        })

                    latest_r = reps[0]
                    abnormals = [item for item in (latest_r.lab_values or []) if isinstance(item, dict) and item.get('status') in ['Borderline', 'Critical']]

                    if abnormals:
                        parts = [f"### Abnormal Results for {target_m.name} (from '{latest_r.title}', {latest_r.date})\n"]
                        for item in abnormals:
                            parts.append(f"• **{item.get('parameter')}**: {item.get('value')} {item.get('unit')} — Status: **{item.get('status')}** (Ref: {item.get('range', 'N/A')})")
                        return Response({
                            "response": "\n".join(parts),
                            "data_source": "database",
                            "has_reports": True
                        })
                    else:
                        return Response({
                            "response": f"All stored lab parameters for {target_m.name} fall within normal reference ranges.",
                            "data_source": "database",
                            "has_reports": True
                        })
                else:
                    parts = ["### Active Abnormal Parameters Across Family\n"]
                    found_any = False
                    for m in family_members:
                        reps = list(Report.objects.filter(member=m).order_by('-date'))
                        if reps:
                            latest_r = reps[0]
                            abnormals = [item for item in (latest_r.lab_values or []) if isinstance(item, dict) and item.get('status') in ['Borderline', 'Critical']]
                            if abnormals:
                                found_any = True
                                parts.append(f"**{m.name}**:")
                                for item in abnormals:
                                    parts.append(f"  • **{item.get('parameter')}**: {item.get('value')} {item.get('unit')} [{item.get('status')}]")
                    if not found_any:
                        return Response({
                            "response": "All stored lab parameters across your family fall within normal reference ranges.",
                            "data_source": "database",
                            "has_reports": True
                        })
                    return Response({
                        "response": "\n".join(parts),
                        "data_source": "database",
                        "has_reports": True
                    })

            # 11. Handle INTENT: HEALTH SUMMARY
            if intent == INTENT_HEALTH_SUMMARY:
                target_m = target_member or (family_members[0] if len(family_members) == 1 else None)
                if target_m:
                    reps = list(Report.objects.filter(member=target_m).order_by('-date'))
                    if len(reps) == 0:
                        return Response({
                            "response": f"{target_m.name} currently has no medical reports stored, so I don't have patient-specific results to summarize.",
                            "data_source": "database",
                            "has_reports": False
                        })
                    latest_r = reps[0]
                    parts = [
                        f"### Health Summary for {target_m.name}",
                        f"• **Gender / Relation**: {target_m.gender or 'Unspecified'} ({target_m.relation})",
                        f"• **Age**: {target_m.age} years old",
                        f"• **Height / Weight / BMI**: Height: {target_m.height_cm or 'N/A'} cm | Weight: {target_m.weight_kg or 'N/A'} kg | Calculated BMI: {f'{target_m.bmi} kg/m²' if target_m.bmi else 'N/A'}",
                        f"• **Total Stored Reports**: {len(reps)}",
                        f"• **Latest Report**: '{latest_r.title}' ({latest_r.date})",
                        f"• **Latest Abnormality Status**: **{latest_r.abnormality}**"
                    ]
                    if latest_r.summary:
                        parts.append(f"• **Clinical Summary**: {latest_r.summary}")
                    return Response({
                        "response": "\n".join(parts),
                        "data_source": "database",
                        "has_reports": True
                    })

            # 12. Handle INTENT: UNKNOWN (Helpful Clarification)
            return Response({
                "response": "I'm not sure I understood that question. You can ask me about your family's reports, health trends, abnormal results, or general health topics such as glucose, cholesterol, blood pressure, and nutrition.",
                "data_source": "local_assistant",
                "has_reports": True
            })

        except Exception as e:
            logger.error(f"Chat assistant view failed: {e}", exc_info=True)
            return Response({"error": f"Assistant service failed: {str(e)}"}, status=500)


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
