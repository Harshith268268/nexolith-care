"""
Medical Knowledge Base & Explanation Engine
Provides patient-friendly explanations, clinical parameter descriptions,
status interpretations, lifestyle recommendations, and overall report summaries locally.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

MEDICAL_KNOWLEDGE_CATALOG = {
    "Fasting Glucose": {
        "description": "Fasting blood sugar measures glucose levels in your blood after an 8-hour fast.",
        "normal_explanation": "Your blood sugar is optimal, showing healthy carbohydrate metabolism.",
        "borderline_explanation": "Slightly elevated fasting blood sugar indicating impaired fasting glucose or pre-diabetes tendency.",
        "critical_explanation": "Significantly elevated blood sugar consistent with hyperglycemia or diabetic range. Physician evaluation recommended.",
        "recommendation": "Limit refined sugars and simple carbs, incorporate daily physical activity, and track fasting sugar."
    },
    "HbA1c": {
        "description": "HbA1c reflects your average blood sugar levels over the past 2 to 3 months.",
        "normal_explanation": "Average glucose control over the last 90 days is within the normal healthy range.",
        "borderline_explanation": "Pre-diabetic range (5.7% to 6.4%). Indicates increased risk of developing diabetes if unmanaged.",
        "critical_explanation": "Diabetic range (6.5%+). Indicates sustained high blood sugar needing clinical management.",
        "recommendation": "Adopt a low glycemic index diet, engage in regular cardio exercise, and schedule a diabetic screening."
    },
    "Total Cholesterol": {
        "description": "Total cholesterol measures the total amount of lipids in your blood.",
        "normal_explanation": "Healthy lipid balance supporting cardiovascular health.",
        "borderline_explanation": "Borderline high cholesterol level. Mild risk factor for arterial plaque buildup.",
        "critical_explanation": "High total cholesterol level requiring dietary intervention and lipid profile monitoring.",
        "recommendation": "Reduce saturated fats and trans-fats, increase soluble fiber (oats, beans), and exercise regularly."
    },
    "LDL Cholesterol": {
        "description": "LDL ('bad') cholesterol deposits cholesterol in artery walls.",
        "normal_explanation": "Optimal LDL level, maintaining clean arterial circulation.",
        "borderline_explanation": "Elevated LDL level. Early indicator of vascular plaque accumulation.",
        "critical_explanation": "High LDL cholesterol significantly increasing cardiovascular risk. Doctor consultation advised.",
        "recommendation": "Substitute animal fats with heart-healthy monounsaturated oils (olive oil, avocados, nuts)."
    },
    "HDL Cholesterol": {
        "description": "HDL ('good') cholesterol removes excess cholesterol from blood vessels.",
        "normal_explanation": "Protective HDL levels helping clear arterial cholesterol.",
        "borderline_explanation": "Mildly reduced HDL level, offering reduced vascular protection.",
        "critical_explanation": "Low HDL level increasing risk of cardiovascular disease. Aerobic exercise recommended.",
        "recommendation": "Engage in aerobic cardio, consume omega-3 fatty acids (salmon, flaxseed), and avoid smoking."
    },
    "Triglycerides": {
        "description": "Triglycerides are a type of fat stored in fat cells and used for energy.",
        "normal_explanation": "Triglyceride levels are optimal.",
        "borderline_explanation": "Mildly elevated triglycerides, often linked to high carbohydrate intake or inactivity.",
        "critical_explanation": "High triglyceride level associated with metabolic syndrome or liver strain.",
        "recommendation": "Limit fructose, alcohol, and simple carbohydrates. Increase physical activity."
    },
    "Hemoglobin": {
        "description": "Hemoglobin is an iron-rich protein in red blood cells carrying oxygen throughout the body.",
        "normal_explanation": "Adequate oxygen-carrying capacity in your bloodstream.",
        "borderline_explanation": "Mild deficiency or elevation in hemoglobin levels.",
        "critical_explanation": "Low hemoglobin indicating anemia or fatigue, or high levels indicating dehydration or erythrocytosis.",
        "recommendation": "Increase iron-rich foods (spinach, lean meats) and Vitamin C to boost oxygenation."
    },
    "WBC Count": {
        "description": "White Blood Cells defend the body against infections and pathogens.",
        "normal_explanation": "Immune system response markers are healthy and balanced.",
        "borderline_explanation": "Slight variation in immune cell count.",
        "critical_explanation": "Elevated WBC (possible active infection/inflammation) or low WBC (impaired immunity).",
        "recommendation": "Maintain rest, stay hydrated, and consult a doctor if experiencing fever or systemic symptoms."
    },
    "Platelets": {
        "description": "Platelets are blood cells responsible for normal blood clotting.",
        "normal_explanation": "Normal platelet count ensuring proper wound healing and clotting.",
        "borderline_explanation": "Minor elevation or reduction in platelet count.",
        "critical_explanation": "Abnormal platelet count affecting clotting risk or signaling immune response.",
        "recommendation": "Avoid unprescribed blood-thinning medications and consult a hematologist if persistent."
    },
    "RBC Count": {
        "description": "Red Blood Cells deliver oxygen from lungs to body tissues.",
        "normal_explanation": "Healthy red cell count supporting tissue oxygen supply.",
        "borderline_explanation": "Mildly decreased red cell count.",
        "critical_explanation": "Significantly abnormal red cell count indicating anemia or chronic illness.",
        "recommendation": "Ensure adequate dietary folate, Vitamin B12, and iron intake."
    },
    "Creatinine": {
        "description": "Creatinine is a waste product filtered out of the blood by healthy kidneys.",
        "normal_explanation": "Kidneys are filtering blood waste efficiently.",
        "borderline_explanation": "Slightly elevated creatinine suggesting mild renal stress or dehydration.",
        "critical_explanation": "High creatinine level indicating impaired renal filtration. Medical checkup essential.",
        "recommendation": "Stay well-hydrated, avoid excessive NSAID pain relievers, and monitor blood pressure."
    },
    "BUN": {
        "description": "Blood Urea Nitrogen measures nitrogen waste in blood from protein breakdown.",
        "normal_explanation": "Normal kidney and liver protein processing.",
        "borderline_explanation": "Slightly elevated BUN, often related to low hydration or high protein intake.",
        "critical_explanation": "Elevated BUN level indicating reduced renal clearance or dehydration.",
        "recommendation": "Increase daily fluid intake and review protein supplement dosages."
    },
    "ALT (SGPT)": {
        "description": "ALT is an enzyme found primarily in liver cells.",
        "normal_explanation": "Liver enzyme levels are normal, showing healthy liver function.",
        "borderline_explanation": "Mildly elevated ALT suggesting mild hepatic stress or fatty liver tendency.",
        "critical_explanation": "Elevated ALT enzyme level indicating liver tissue irritation. Medical evaluation advised.",
        "recommendation": "Minimize alcohol consumption, avoid processed food additives, and maintain a healthy weight."
    },
    "AST (SGOT)": {
        "description": "AST is a liver and tissue enzyme involved in amino acid metabolism.",
        "normal_explanation": "Normal enzyme levels in hepatic and muscle tissues.",
        "borderline_explanation": "Slightly elevated AST level.",
        "critical_explanation": "High AST level indicating cellular strain in liver or muscle tissues.",
        "recommendation": "Avoid alcohol, reduce dietary toxins, and consult a physician."
    },
    "TSH": {
        "description": "Thyroid Stimulating Hormone regulates your thyroid gland and metabolism.",
        "normal_explanation": "Optimal thyroid activity and metabolic control.",
        "borderline_explanation": "Mild TSH fluctuation indicating subclinical thyroid variance.",
        "critical_explanation": "Abnormal TSH level suggesting hypothyroidism (high TSH) or hyperthyroidism (low TSH).",
        "recommendation": "Consult an endocrinologist for full thyroid panel testing (Free T3/T4)."
    },
    "Vitamin D": {
        "description": "Vitamin D is essential for bone density, immune health, and mood regulation.",
        "normal_explanation": "Sufficient Vitamin D levels supporting strong bones and immunity.",
        "borderline_explanation": "Insufficient Vitamin D level. Early bone density loss risk.",
        "critical_explanation": "Deficient Vitamin D level. High risk for bone weakness and immune fatigue.",
        "recommendation": "Get safe daily sun exposure (15-20 mins) or consult for Vitamin D3 supplementation."
    },
    "Vitamin B12": {
        "description": "Vitamin B12 supports nerve function, brain health, and red blood cell creation.",
        "normal_explanation": "Healthy B12 levels supporting nervous system and cellular energy.",
        "borderline_explanation": "Low-normal B12 level. May cause mild fatigue.",
        "critical_explanation": "Vitamin B12 deficiency causing nerve tingling, cognitive fatigue, or macrocytic anemia.",
        "recommendation": "Incorporate B12-fortified foods, dairy, eggs, or sublingual B12 supplements."
    },
    "Systolic BP": {
        "description": "Systolic blood pressure measures arterial pressure during heart contraction.",
        "normal_explanation": "Healthy arterial pressure during heartbeats.",
        "borderline_explanation": "Pre-hypertension stage. Increased strain on arterial walls.",
        "critical_explanation": "Hypertension stage. Significant risk factor for cardiovascular complications.",
        "recommendation": "Adopt a low-sodium DASH diet, practice stress reduction, and monitor blood pressure."
    },
    "Diastolic BP": {
        "description": "Diastolic blood pressure measures arterial pressure when the heart rests between beats.",
        "normal_explanation": "Optimal resting vascular resistance.",
        "borderline_explanation": "Slightly elevated resting arterial pressure.",
        "critical_explanation": "High resting arterial pressure. Physician management recommended.",
        "recommendation": "Reduce dietary salt, limit caffeine, and participate in daily moderate exercise."
    }
}


class MedicalKnowledgeEngine:
    """
    Generates deterministic, patient-friendly explanations, recommendations,
    and summaries based on parameter statuses.
    """

    def get_explanation(self, param_name: str, status: str) -> str:
        kb = MEDICAL_KNOWLEDGE_CATALOG.get(param_name)
        if not kb:
            return f"Lab marker {param_name} measured at {status.lower()} level."

        if status == "Critical":
            return f"{kb['description']} {kb['critical_explanation']}"
        elif status == "Borderline":
            return f"{kb['description']} {kb['borderline_explanation']}"
        else:
            return f"{kb['description']} {kb['normal_explanation']}"

    def get_recommendation(self, param_name: str) -> str:
        kb = MEDICAL_KNOWLEDGE_CATALOG.get(param_name)
        if kb:
            return kb["recommendation"]
        return "Maintain a balanced lifestyle, eat nutrient-rich foods, and consult a physician for personalized guidance."

    def get_general_educational_response(self, query: str, param_name: str = None) -> str:
        """
        Generates structured, plain-English health education for general questions
        (e.g., "How can I decrease glucose?", "What is diabetes?", "What is Vitamin D?").
        Does NOT require the user to have stored medical reports.
        """
        q_lower = query.lower()

        if param_name == "Fasting Glucose" or "glucose" in q_lower or "blood sugar" in q_lower or "diabetes" in q_lower:
            return (
                "### Understanding Blood Glucose & Healthy Management\n\n"
                "**What is Blood Glucose?**\n"
                "Blood glucose (blood sugar) is the main sugar found in your blood and your body's primary energy source. "
                "Fasting blood glucose normal reference ranges are typically **70 to 99 mg/dL**. Values between **100–125 mg/dL** indicate pre-diabetes, and **126 mg/dL+** suggests diabetes.\n\n"
                "**How to Help Maintain Healthy Glucose Levels:**\n"
                "1. **Dietary Adjustments**: Prioritize complex carbohydrates, non-starchy vegetables, and high-fiber foods (oats, legumes). Limit refined sugars and processed carbs.\n"
                "2. **Physical Activity**: Engage in 150 minutes of moderate aerobic activity (e.g. brisk walking) per week. Muscle contraction increases insulin sensitivity.\n"
                "3. **Weight & Hydration**: Maintain a healthy body weight and drink adequate water daily.\n"
                "4. **Clinical Monitoring**: Schedule routine HbA1c screenings with your clinician.\n\n"
                "*(Note: Educational health information provided by offline Local Health Knowledge Engine. Discuss any elevated glucose trends or dietary changes with a healthcare professional.)*"
            )

        if param_name in ["Total Cholesterol", "LDL Cholesterol", "HDL Cholesterol", "Triglycerides"] or "cholesterol" in q_lower or "lipid" in q_lower:
            return (
                "### Understanding Lipid Health & Cholesterol Management\n\n"
                "**What is Cholesterol?**\n"
                "Cholesterol is a waxy lipid needed to build cells and hormones. LDL ('bad') cholesterol can deposit in artery walls, while HDL ('good') cholesterol carries excess cholesterol back to the liver.\n\n"
                "**How to Maintain Healthy Lipid Levels:**\n"
                "1. **Heart-Healthy Fats**: Replace saturated fats (fatty meats, butter) with monounsaturated oils (olive oil, avocados, nuts).\n"
                "2. **Soluble Fiber**: Increase intake of soluble fiber (oat bran, beans, lentils) which helps bind cholesterol in the digestive system.\n"
                "3. **Aerobic Exercise**: Regular exercise helps elevate protective HDL cholesterol and reduce triglycerides.\n\n"
                "*(Note: Educational health guidance. Consult a medical professional for personalized cardiovascular risk assessment.)*"
            )

        if param_name in ["Systolic BP", "Diastolic BP", "Blood Pressure"] or "blood pressure" in q_lower or "bp" in q_lower or "hypertension" in q_lower:
            return (
                "### Understanding Blood Pressure & Vascular Health\n\n"
                "**What is Blood Pressure?**\n"
                "Blood pressure measures the force of circulating blood against artery walls. Normal blood pressure is typically below **120/80 mmHg**.\n\n"
                "**Key Lifestyle Strategies for Blood Pressure Control:**\n"
                "1. **Sodium Reduction**: Limit dietary salt intake to under 2,000 mg/day.\n"
                "2. **DASH Diet**: Emphasize fruits, vegetables, whole grains, and low-fat dairy.\n"
                "3. **Stress Reduction & Exercise**: Regular physical activity and stress management help relax arterial walls.\n\n"
                "*(Note: Educational health information provided by offline Local Health Knowledge Engine.)*"
            )

        if param_name == "Hemoglobin" or "hemoglobin" in q_lower or "iron" in q_lower or "anemia" in q_lower:
            return (
                "### Understanding Hemoglobin & Iron Health\n\n"
                "**What is Hemoglobin?**\n"
                "Hemoglobin is an iron-rich protein inside red blood cells responsible for transporting oxygen throughout your tissues. Low hemoglobin levels indicate anemia.\n\n"
                "**Dietary & Health Recommendations:**\n"
                "1. **Iron-Rich Foods**: Consume dark leafy greens (spinach, kale), legumes, fortified cereals, and lean meats.\n"
                "2. **Vitamin C Synergy**: Pair iron-rich foods with Vitamin C (citrus fruits, bell peppers) to boost intestinal iron absorption.\n"
                "3. **Consultation**: Evaluate potential underlying causes with your physician before taking high-dose iron supplements.\n\n"
                "*(Note: Educational health information. Not a clinical diagnosis.)*"
            )

        if param_name == "Vitamin D" or "vitamin d" in q_lower:
            return (
                "### Understanding Vitamin D & Bone Health\n\n"
                "**What is Vitamin D?**\n"
                "Vitamin D is a crucial fat-soluble nutrient essential for calcium absorption, bone density, immune defense, and mood regulation. Normal levels range from **30 to 100 ng/mL**.\n\n"
                "**How to Improve Vitamin D Status:**\n"
                "1. **Sun Exposure**: 15–20 minutes of daily natural sunlight exposure on arms and face.\n"
                "2. **Dietary Sources**: Fatty fish (salmon, tuna), egg yolks, and fortified dairy or plant milk.\n"
                "3. **Supplements**: Consult a physician for Vitamin D3 supplementation if laboratory results indicate deficiency.\n\n"
                "*(Note: Educational health information provided by offline Local Health Knowledge Engine.)*"
            )

        if param_name in ["Creatinine", "BUN"] or "creatinine" in q_lower or "kidney" in q_lower:
            return (
                "### Understanding Creatinine & Kidney Function\n\n"
                "**What is Creatinine?**\n"
                "Creatinine is a waste product from muscle breakdown filtered out of the bloodstream by healthy kidneys. Normal levels are typically **0.6 to 1.2 mg/dL**.\n\n"
                "**Maintaining Healthy Kidney Filtration:**\n"
                "1. **Hydration**: Drink sufficient fluids throughout the day to support renal waste clearance.\n"
                "2. **Avoid Medication Overuse**: Limit frequent unprescribed use of NSAID pain relievers (e.g. ibuprofen).\n"
                "3. **Control Blood Pressure & Blood Sugar**: Unmanaged hypertension and high blood sugar are leading causes of kidney strain.\n\n"
                "*(Note: Educational health information provided by offline Local Health Knowledge Engine.)*"
            )

        # Default Educational Health Response
        return (
            "### General Health & Preventive Wellness Guidance\n\n"
            "Maintaining optimal long-term health involves regular physical activity, balanced nutrition rich in whole foods and fiber, adequate daily hydration (2–3 liters), consistent sleep schedules (7–8 hours), and annual clinical health screenings.\n\n"
            "*(Note: Educational information provided by offline Local Health Knowledge Engine. Discuss specific health queries with a qualified healthcare professional.)*"
        )

    def generate_overall_summary(self, lab_values: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates overall report summary, abnormality classification, and recommendations.
        """
        if not lab_values:
            return {
                "abnormality": "Normal",
                "summary": "No lab parameters could be extracted from this report. Please verify report image clarity."
            }

        criticals = [item for item in lab_values if item.get("status") == "Critical"]
        borderlines = [item for item in lab_values if item.get("status") == "Borderline"]

        if criticals:
            abnormality = "Critical"
            crit_names = ", ".join([c.get("parameter", "Unknown") for c in criticals[:3]])
            summary = f"Critical medical parameters detected ({crit_names}). Clinical evaluation and medical advice are strongly recommended."
        elif borderlines:
            abnormality = "Borderline"
            bord_names = ", ".join([b.get("parameter", "Unknown") for b in borderlines[:3]])
            summary = f"Borderline parameter levels detected ({bord_names}). Routine health monitoring and lifestyle adjustments are recommended."
        else:
            abnormality = "Normal"
            summary = "All extracted clinical parameters fall within healthy reference ranges. No active risk markers detected."

        # Append educational medical disclaimer
        summary += " (Note: AI-assisted interpretation powered by local ML models. Not a formal diagnosis.)"

        return {
            "abnormality": abnormality,
            "summary": summary
        }
