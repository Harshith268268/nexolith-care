import logging
import os
import re
from datetime import datetime
from reports.models import Report
from services.medical_analyzer import MedicalAnalyzer

logger = logging.getLogger(__name__)

class AIInsightsEngine:
    """
    AI Health Insights Engine.
    Scans all reports for a specific member and dynamically generates:
    - Health summaries
    - Risk detection
    - Trend comparison
    - Personalized recommendations
    """

    def analyze_member_health(self, member_id) -> dict:
        logger.info(f"AIInsightsEngine analyzing member {member_id}...")
        
        # 1. Query reports sorted by date ascending
        reports = list(Report.objects.filter(member_id=member_id).order_by('date'))
        
        if not reports:
            return {
                "abnormal_parameter_count": 0,
                "risk_score": "Normal",
                "overall_status": "No reports uploaded yet.",
                "latest_warnings": [],
                "insights": [
                    "No medical reports uploaded yet. Upload a report in the Upload section to generate your first AI Health Insights!"
                ],
                "recommendations": [
                    "Upload blood reports or vital trends to start active AI monitoring."
                ]
            }

        # 2. Extract and organize lab values over time
        parameter_history = {} # parameter_name -> list of {"date": date, "value": float, "unit": str, "status": str}
        total_abnormal_count = 0
        latest_report = reports[-1]

        for r in reports:
            lab_vals = r.lab_values or []
            is_latest = (r.id == latest_report.id)
            
            for item in lab_vals:
                param = item.get('parameter', '').strip()
                val_str = str(item.get('value', ''))
                unit = item.get('unit', '')
                status = item.get('status', 'Normal')
                
                if is_latest and status in ['Borderline', 'Critical']:
                    total_abnormal_count += 1
                
                # Convert value to numeric float if possible
                try:
                    num_val = float(re.findall(r'[-+]?\d*\.\d+|\d+', val_str)[0])
                except (IndexError, ValueError):
                    continue

                if param not in parameter_history:
                    parameter_history[param] = []
                parameter_history[param].append({
                    "date": r.date,
                    "value": num_val,
                    "unit": unit,
                    "status": status
                })

        # 3. Dynamic Trend comparison (Latest vs Previous)
        insights = []
        warnings = []
        
        # Predefined focus parameters to monitor for high fidelity
        focus_params = ['Glucose', 'Fasting Glucose', 'HbA1c', 'Cholesterol', 'LDL', 'HDL', 'Hemoglobin', 'Blood Pressure', 'Systolic BP', 'Vitamin D', 'Vitamin B12']

        for param, history in parameter_history.items():
            # Check if parameter is a focus parameter (partial match)
            is_focus = any(f.lower() in param.lower() for f in focus_params)
            if not is_focus:
                continue

            if len(history) >= 2:
                latest = history[-1]
                prev = history[-2]
                
                # Calculate percentage change
                if prev['value'] > 0:
                    pct_change = round(((latest['value'] - prev['value']) / prev['value']) * 100)
                else:
                    pct_change = 0

                if pct_change != 0:
                    trend_type = "increased" if pct_change > 0 else "decreased"
                    abs_pct = abs(pct_change)
                    
                    # Highlight critical/borderline trends
                    if trend_type == "increased" and any(x in param.lower() for x in ['glucose', 'ldl', 'cholesterol', 'systolic', 'bp']):
                        insights.append(f"{param} {trend_type} by {abs_pct}% compared to previous report (currently {latest['value']} {latest['unit']}).")
                    elif trend_type == "decreased" and any(x in param.lower() for x in ['hemoglobin', 'vitamin', 'hdl']):
                        insights.append(f"{param} {trend_type} by {abs_pct}% compared to previous report (currently {latest['value']} {latest['unit']}).")
                    else:
                        insights.append(f"{param} has {trend_type} by {abs_pct}% (currently {latest['value']} {latest['unit']}).")

            # Check for consistency of abnormal levels
            abnormal_history = [h for h in history if h['status'] in ['Borderline', 'Critical']]
            if len(history) >= 2 and len(abnormal_history) == len(history):
                warnings.append(f"{param} levels remain consistently above normal range.")

        # 4. Generate Overall Status & Risk Score
        risk_score = latest_report.abnormality or "Normal"
        overall_status = latest_report.summary or "Summary not generated yet."

        # Make sure at least some insights are populated
        if not insights:
            insights.append("All key parameter trends are stable and within normal ranges.")

        # 5. Personalized Recommendations
        recommendations = []
        for param, history in parameter_history.items():
            latest = history[-1]
            if latest['status'] in ['Borderline', 'Critical']:
                if 'glucose' in param.lower():
                    recommendations.append("Limit simple carbohydrates, focus on low glycemic foods, and monitor daily glucose.")
                elif 'cholesterol' in param.lower() or 'ldl' in param.lower():
                    recommendations.append("Reduce saturated fats intake, increase soluble fiber, and incorporate daily cardio exercise.")
                elif 'hemoglobin' in param.lower():
                    recommendations.append("Ensure adequate dietary iron (lean meats, leafy greens) and Vitamin C to aid absorption.")
                elif 'bp' in param.lower() or 'systolic' in param.lower() or 'pressure' in param.lower():
                    recommendations.append("Reduce sodium intake, prioritize stress reduction techniques, and maintain moderate aerobic exercise.")
                elif 'vitamin d' in param.lower():
                    recommendations.append("Consider safe sunlight exposure or clinical Vitamin D supplementation.")

        # Fallback default recommendations
        if not recommendations:
            recommendations.append("Continue maintaining a healthy, balanced diet and consistent sleep schedule.")
            recommendations.append("Schedule periodic checkups to maintain active health screening.")

        return {
            "abnormal_parameter_count": total_abnormal_count,
            "risk_score": risk_score,
            "overall_status": overall_status,
            "latest_warnings": list(set(warnings + [f"Abnormal parameter detected: {k}" for k, v in parameter_history.items() if v[-1]['status'] in ['Borderline', 'Critical']]))[:5],
            "insights": insights[:5],
            "recommendations": recommendations[:5]
        }
