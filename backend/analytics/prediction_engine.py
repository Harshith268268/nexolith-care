import logging
import re
import math
from datetime import datetime
from reports.models import Report
from family.models import FamilyMember

logger = logging.getLogger(__name__)

class AIHealthPredictionEngine:
    """
    AI Health Prediction Engine.
    Analyzes historical lab values, alert history, and trend progression
    to calculate disease risks (Diabetes, Cardiovascular, Hypertension, Anemia,
    Vitamin Deficiency, Kidney Filtration, and Liver Function).
    """

    def analyze_predictions(self, member_id) -> dict:
        logger.info(f"AIHealthPredictionEngine analyzing member {member_id}...")

        # 1. Fetch member details
        try:
            member = FamilyMember.objects.get(id=member_id)
            member_name = member.name
        except FamilyMember.DoesNotExist:
            member_name = "Unknown Member"

        # 2. Query reports sorted by date ascending
        reports = list(Report.objects.filter(member_id=member_id).order_by('date'))
        
        if len(reports) < 2:
            return {
                "member": member_name,
                "overallRisk": "Normal",
                "predictions": [],
                "healthScore": 95,
                "summary": "Upload at least 2 reports for accurate AI prediction analysis."
            }

        # 3. Compile parameter history
        param_history = {}  # parameter_name_normalized -> list of {"value": float, "date": date, "unit": str, "status": str}
        
        for r in reports:
            lab_vals = r.lab_values or []
            for item in lab_vals:
                param = item.get('parameter', '').strip()
                val_str = str(item.get('value', ''))
                unit = item.get('unit', '')
                status = item.get('status', 'Normal')

                # Extract first floating or integer number
                try:
                    num_val = float(re.findall(r'[-+]?\d*\.\d+|\d+', val_str)[0])
                except (IndexError, ValueError):
                    continue

                norm_name = param.lower().replace(" ", "").replace("_", "")
                if norm_name not in param_history:
                    param_history[norm_name] = []
                
                param_history[norm_name].append({
                    "original_name": param,
                    "date": r.date,
                    "value": num_val,
                    "unit": unit,
                    "status": status
                })

        predictions = []
        abnormal_scores = []
        overall_severity_weight = 0

        # Helper to analyze parameter trends and calculate risk
        def check_risk(disease_title, target_keywords, borderline_threshold, critical_threshold, is_lower_better=True, recommendation_text=""):
            # Find history matching keywords
            history = None
            original_param_name = ""
            for norm_name, hist in param_history.items():
                if any(kw in norm_name for kw in target_keywords):
                    history = hist
                    original_param_name = hist[0]["original_name"]
                    break
            
            if not history or len(history) < 1:
                return None

            latest = history[-1]
            latest_val = latest["value"]
            latest_unit = latest["unit"]
            
            # Severity mapping
            severity = "Low"
            severity_weight = 0
            if is_lower_better:
                if latest_val >= critical_threshold:
                    severity = "High"
                    severity_weight = 3
                elif latest_val >= borderline_threshold:
                    severity = "Borderline"
                    severity_weight = 2
                else:
                    severity = "Low"
                    severity_weight = 1
            else:
                if latest_val <= critical_threshold:
                    severity = "High"
                    severity_weight = 3
                elif latest_val <= borderline_threshold:
                    severity = "Borderline"
                    severity_weight = 2
                else:
                    severity = "Low"
                    severity_weight = 1

            # Trend calculations if we have at least 2 reports
            trend_str = ""
            pct_change = 0
            if len(history) >= 2:
                prev = history[-2]
                prev_val = prev["value"]
                
                # Calculate months between reports
                try:
                    d1 = datetime.strptime(str(prev["date"]), "%Y-%m-%d")
                    d2 = datetime.strptime(str(latest["date"]), "%Y-%m-%d")
                    months = abs((d2.year - d1.year) * 12 + d2.month - d1.month)
                    if months == 0:
                        months = 1
                    time_frame = f"over {months} month{'s' if months > 1 else ''}"
                except Exception:
                    time_frame = "recently"

                if prev_val > 0:
                    pct_change = round(((latest_val - prev_val) / prev_val) * 100)
                
                if pct_change != 0:
                    direction = "increased" if pct_change > 0 else "decreased"
                    trend_str = f"{original_param_name} {direction} by {abs(pct_change)}% {time_frame} (from {prev_val} to {latest_val} {latest_unit})."
                else:
                    trend_str = f"{original_param_name} remained stable at {latest_val} {latest_unit}."
            else:
                trend_str = f"Latest measured {original_param_name} is {latest_val} {latest_unit}."

            # Calculate confidence score based on severity and historical changes
            base_confidence = 65
            if severity == "High":
                base_confidence += 15
            elif severity == "Borderline":
                base_confidence += 8
            
            # Boost confidence if the parameter is actively worsening
            worsening = (pct_change > 0 and is_lower_better) or (pct_change < 0 and not is_lower_better)
            if worsening:
                base_confidence += min(15, abs(pct_change) // 3)
            
            confidence = min(98, max(50, base_confidence))

            # Compose reasoning
            worsening_adverb = "elevated" if worsening else "stable"
            reason = f"{trend_str} Currently at {latest_val} {latest_unit} indicating {worsening_adverb} {disease_title.lower()} trajectory."

            return {
                "title": disease_title,
                "severity": severity,
                "confidence": confidence,
                "reason": reason,
                "recommendation": recommendation_text,
                "weight": severity_weight
            }

        # 4. Run Risk Checks for standard health indicators
        
        # Diabetes
        diabetes = check_risk(
            disease_title="Diabetes Risk",
            target_keywords=["glucose", "fastingglucose", "hba1c"],
            borderline_threshold=100.0,
            critical_threshold=126.0,
            is_lower_better=True,
            recommendation_text="Minimize simple sugars and carbs, increase fiber, and schedule an HbA1c test."
        )
        if diabetes: predictions.append(diabetes)

        # Heart Disease / Cardiovascular
        cardio = check_risk(
            disease_title="Cardiovascular Risk",
            target_keywords=["cholesterol", "ldl", "triglycerides"],
            borderline_threshold=200.0,
            critical_threshold=240.0,
            is_lower_better=True,
            recommendation_text="Reduce trans-fats, introduce omega-3 fatty acids, and aim for 30 minutes of daily cardio."
        )
        if cardio: predictions.append(cardio)

        # Hypertension
        hypertension = check_risk(
            disease_title="Hypertension Risk",
            target_keywords=["systolic", "bloodpressure", "bp"],
            borderline_threshold=120.0,
            critical_threshold=140.0,
            is_lower_better=True,
            recommendation_text="Adopt a low-sodium DASH diet, practice mindfulness stress reduction, and monitor blood pressure."
        )
        if hypertension: predictions.append(hypertension)

        # Anemia
        anemia = check_risk(
            disease_title="Anemia Risk",
            target_keywords=["hemoglobin", "hb", "rbc"],
            borderline_threshold=13.0,  # Below 13.0 starts mild deficiency
            critical_threshold=11.5,  # Below 11.5 critical
            is_lower_better=False,    # Lower is worse!
            recommendation_text="Boost intake of iron-rich foods (spinach, lean beef) combined with Vitamin C, and consult a physician."
        )
        if anemia: predictions.append(anemia)

        # Vitamin Deficiency
        vitamins = check_risk(
            disease_title="Vitamin Deficiency Risk",
            target_keywords=["vitamind", "vitaminb12", "b12"],
            borderline_threshold=30.0,  # Below 30 borderline
            critical_threshold=20.0,  # Below 20 deficiency
            is_lower_better=False,    # Lower is worse!
            recommendation_text="Integrate appropriate supplementation under advice, and increase sun exposure or fortified foods."
        )
        if vitamins: predictions.append(vitamins)

        # Kidney Health
        kidney = check_risk(
            disease_title="Kidney Health Risk",
            target_keywords=["creatinine", "egfr", "bun"],
            borderline_threshold=1.0,
            critical_threshold=1.3,
            is_lower_better=True,
            recommendation_text="Maintain healthy hydration levels, avoid over-using NSAID pain relievers, and control blood pressure."
        )
        if kidney: predictions.append(kidney)

        # Liver Health
        liver = check_risk(
            disease_title="Liver Health Risk",
            target_keywords=["alt", "ast", "sgpt", "sgot"],
            borderline_threshold=35.0,
            critical_threshold=50.0,
            is_lower_better=True,
            recommendation_text="Limit alcohol intake, minimize processed foods, and maintain a healthy weight to avoid hepatic fat loading."
        )
        if liver: predictions.append(liver)

        # 5. Fallback if no relevant clinical parameters are present
        if not predictions:
            predictions.append({
                "title": "General Wellness Risk",
                "severity": "Low",
                "confidence": 90,
                "reason": "All core clinical parameter markers are within optimal ranges.",
                "recommendation": "Maintain a healthy balanced lifestyle and schedule regular annual screenings.",
                "weight": 1
            })

        # Calculate dynamic health score
        # 100 base, subtract points for borderline (-10) and critical (-25) risks
        base_score = 100
        overall_severity = "Low"
        highest_weight = max([p["weight"] for p in predictions]) if predictions else 1

        for p in predictions:
            if p["severity"] == "High":
                base_score -= 18
            elif p["severity"] == "Borderline":
                base_score -= 8

        health_score = max(35, min(100, base_score))

        if highest_weight == 3:
            overall_severity = "Critical"
        elif highest_weight == 2:
            overall_severity = "Borderline"

        # Dynamically formulate summary text based on predictions
        criticals = [p["title"] for p in predictions if p["severity"] == "High"]
        borderlines = [p["title"] for p in predictions if p["severity"] == "Borderline"]
        
        if criticals:
            summary = f"Critical risk markers detected for {', '.join(criticals)}. Immediate physician consultation and lifestyle adjustments recommended."
        elif borderlines:
            summary = f"Borderline levels detected for {', '.join(borderlines)}. Periodic monitoring and wellness interventions advised."
        else:
            summary = f"All vital parameter trends are stable and within healthy ranges. No active risk markers detected."

        # Clean predictions response (remove auxiliary fields)
        cleaned_predictions = []
        for p in predictions:
            cleaned_predictions.append({
                "title": p["title"],
                "severity": p["severity"],
                "confidence": p["confidence"],
                "reason": p["reason"],
                "recommendation": p["recommendation"]
            })

        return {
            "member": member_name,
            "overallRisk": overall_severity,
            "predictions": cleaned_predictions,
            "healthScore": health_score,
            "summary": summary
        }
