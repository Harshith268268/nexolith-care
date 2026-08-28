import logging
import re
from datetime import datetime
from reports.models import Report
from family.models import FamilyMember
from services.local_medical_extractor import LocalMedicalExtractor

logger = logging.getLogger(__name__)

class AIHealthPredictionEngine:
    """
    AI Health Prediction Engine.
    Dynamically analyzes stored PostgreSQL report parameters for a family member
    to calculate disease projections, real historical parameter trends, model confidence,
    and overall health score.
    Guarantees 100% metadata term isolation (Age, Gender, UHID, Date are strictly ignored).
    """

    def analyze_predictions(self, member_id) -> dict:
        logger.info(f"AIHealthPredictionEngine analyzing member {member_id}...")
        extractor = LocalMedicalExtractor()

        # 1. Fetch member details
        try:
            member = FamilyMember.objects.get(id=member_id)
            member_name = member.name
        except FamilyMember.DoesNotExist:
            member_name = "Unknown Member"

        # 2. Query reports sorted by date ascending
        reports = list(Report.objects.filter(member_id=member_id).order_by('date'))
        
        # Rule 2: No Reports = No Predictions
        if not reports:
            return {
                "member": member_name,
                "overallRisk": "No data",
                "predictions": [],
                "healthScore": None,
                "summary": "No AI Predictions Yet. Upload a medical report to generate personalized health projections based on your actual medical data."
            }

        # 3. Compile parameter history from stored lab_values
        param_history = {} # normalized_name -> list of {"original_name": str, "date": date, "value": float, "unit": str, "status": str}
        
        for r in reports:
            lab_vals = r.lab_values or []
            for item in lab_vals:
                param = item.get('parameter', '').strip()
                val_str = str(item.get('value', ''))
                unit = item.get('unit', '')
                status = item.get('status', 'Normal')

                # Filter out metadata terms like 'Age', 'Gender', 'UHID', 'Date'
                if not param or extractor.is_metadata_term(param):
                    continue

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

        # Helper to analyze parameter trends and calculate dynamic risk
        def check_risk(disease_title, target_keywords, borderline_threshold, critical_threshold, is_lower_better=True, recommendation_text=""):
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
            
            severity = "Low"
            if is_lower_better:
                if latest_val >= critical_threshold:
                    severity = "High"
                elif latest_val >= borderline_threshold:
                    severity = "Moderate"
                else:
                    severity = "Low"
            else:
                if latest_val <= critical_threshold:
                    severity = "High"
                elif latest_val <= borderline_threshold:
                    severity = "Moderate"
                else:
                    severity = "Low"

            # Observed Trend calculation
            if len(history) >= 2:
                prev = history[-2]
                prev_val = prev["value"]
                
                try:
                    d1 = datetime.strptime(str(prev["date"]), "%Y-%m-%d")
                    d2 = datetime.strptime(str(latest["date"]), "%Y-%m-%d")
                    months = abs((d2.year - d1.year) * 12 + d2.month - d1.month)
                    time_frame = f"over {months} month{'s' if months > 1 else ''}" if months >= 1 else "recently"
                except Exception:
                    time_frame = "across stored measurements"

                if prev_val > 0:
                    pct_change = round(((latest_val - prev_val) / prev_val) * 100)
                else:
                    pct_change = 0
                
                if pct_change != 0:
                    direction = "increased" if pct_change > 0 else "decreased"
                    unit_str = f" {latest_unit}" if latest_unit else ""
                    trend_str = f"{original_param_name} has {direction} by {abs(pct_change)}% {time_frame} (from {prev_val} to {latest_val}{unit_str})."
                else:
                    unit_str = f" {latest_unit}" if latest_unit else ""
                    trend_str = f"{original_param_name} remained stable at {latest_val}{unit_str} across stored reports."
            else:
                unit_str = f" {latest_unit}" if latest_unit else ""
                trend_str = f"Only one measurement is currently available for this parameter (latest: {latest_val}{unit_str})."

            # Confidence Calculation
            base_confidence = 65
            if severity == "High":
                base_confidence += 10
            elif severity == "Moderate":
                base_confidence += 5
            
            if len(history) >= 2:
                base_confidence += 15
            
            confidence = min(92, max(60, base_confidence))

            unit_label = f" — {latest_val} {latest_unit}".strip() if latest_unit else f" — {latest_val}"

            return {
                "title": disease_title,
                "severity": severity,
                "confidence": confidence,
                "indicator": f"Primary metric: {original_param_name}{unit_label}",
                "trend": trend_str,
                "recommendation": recommendation_text
            }

        # Dynamic Disease Projection Evaluators
        p1 = check_risk("Type 2 Diabetes Projection", ["glucose", "hba1c"], 100.0, 126.0, True, "Limit simple sugars, incorporate 30-min daily walks, and track fasting blood glucose periodically.")
        if p1: predictions.append(p1)

        p2 = check_risk("Cardiovascular Risk Projection", ["cholesterol", "ldl"], 200.0, 240.0, True, "Adopt a Mediterranean diet rich in omega-3 fatty acids and soluble fiber. Limit saturated fats.")
        if p2: predictions.append(p2)

        p3 = check_risk("Hypertension & Vascular Health", ["bp", "systolic"], 120.0, 140.0, True, "Reduce dietary sodium intake to under 2,000mg/day and engage in regular aerobic exercise.")
        if p3: predictions.append(p3)

        p4 = check_risk("Iron Deficiency Anemia", ["hemoglobin", "rbc", "pcv", "mcv", "mch"], 12.0, 10.0, False, "Increase consumption of iron-rich foods such as spinach, legumes, and lean protein paired with Vitamin C.")
        if p4: predictions.append(p4)

        p5 = check_risk("Vitamin D & Bone Density", ["vitamind"], 30.0, 20.0, False, "Consider safe sun exposure (15 mins/day) and Vitamin D3 supplementation as recommended by your physician.")
        if p5: predictions.append(p5)

        p6 = check_risk("Renal Filtration & Kidney Health", ["creatinine"], 1.2, 1.5, True, "Ensure adequate daily hydration (2.5L water) and monitor protein intake balance.")
        if p6: predictions.append(p6)

        # Insufficient Data check
        if not predictions:
            return {
                "member": member_name,
                "overallRisk": "Normal",
                "predictions": [],
                "healthScore": None,
                "summary": "Insufficient Data. More medical measurements are needed to generate a reliable health projection."
            }

        # Dynamic Health Score calculation from actual predictions
        high_count = sum(1 for p in predictions if p["severity"] == "High")
        moderate_count = sum(1 for p in predictions if p["severity"] in ["Moderate", "Borderline"])

        if high_count > 0:
            overall_risk = "High"
            health_score = max(50, 100 - (high_count * 20 + moderate_count * 10))
        elif moderate_count > 0:
            overall_risk = "Moderate"
            health_score = max(70, 100 - (moderate_count * 10))
        else:
            overall_risk = "Low"
            health_score = 95

        summary = f"Based on {len(reports)} lab report{'s' if len(reports) != 1 else ''}, {len(predictions)} health indicator{'s were' if len(predictions) != 1 else ' was'} evaluated for {member_name}."
        if high_count > 0:
            summary += f" Attention recommended for {high_count} elevated metric(s)."

        return {
            "member": member_name,
            "overallRisk": overall_risk,
            "predictions": predictions,
            "healthScore": health_score,
            "summary": summary
        }
