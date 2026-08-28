"""
Local Medical Knowledge Base & Local RAG Engine
Offline medical knowledge store covering lab parameters, medical conditions, and health topics.
Provides concept-based local retrieval, synonym mapping, and structured medical explanations.
"""

import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Canonical Synonym Map: Maps raw/misspelled/synonym terms to canonical entity keys
SYNONYM_MAP = {
    # Hemoglobin & Anemia
    "hemoglobin": "hemoglobin",
    "haemoglobin": "hemoglobin",
    "hgb": "hemoglobin",
    "hb": "hemoglobin",
    "anemia": "anemia",
    "anaemia": "anemia",
    "low hb": "anemia",
    "low hemoglobin": "anemia",
    "low haemoglobin": "anemia",

    # Glucose & Diabetes
    "glucose": "glucose",
    "blood sugar": "glucose",
    "sugar": "glucose",
    "fbs": "glucose",
    "fasting glucose": "glucose",
    "high sugar": "diabetes",
    "diabetes": "diabetes",
    "type 2 diabetes": "diabetes",
    "type 1 diabetes": "diabetes",
    "prediabetes": "diabetes",

    # HbA1c
    "hba1c": "hba1c",
    "a1c": "hba1c",
    "glycated hemoglobin": "hba1c",

    # Cholesterol & Lipids
    "cholesterol": "cholesterol",
    "total cholesterol": "cholesterol",
    "lipid": "cholesterol",
    "lipids": "cholesterol",
    "ldl": "ldl",
    "ldl cholesterol": "ldl",
    "bad cholesterol": "ldl",
    "hdl": "hdl",
    "hdl cholesterol": "hdl",
    "good cholesterol": "hdl",
    "triglycerides": "triglycerides",
    "triglyceride": "triglycerides",
    "trig": "triglycerides",
    "high cholesterol": "hypercholesterolemia",
    "hypercholesterolemia": "hypercholesterolemia",

    # Blood Pressure & Hypertension
    "blood pressure": "blood_pressure",
    "bp": "blood_pressure",
    "systolic": "blood_pressure",
    "diastolic": "blood_pressure",
    "hypertension": "hypertension",
    "high blood pressure": "hypertension",
    "high bp": "hypertension",

    # Kidneys
    "creatinine": "creatinine",
    "serum creatinine": "creatinine",
    "kidney": "creatinine",
    "renal": "creatinine",
    "bun": "bun",
    "urea": "bun",

    # Liver
    "alt": "alt",
    "sgpt": "alt",
    "liver": "alt",
    "ast": "ast",
    "sgot": "ast",

    # Thyroid
    "tsh": "tsh",
    "thyroid": "tsh",

    # Vitamins & Minerals
    "vitamin d": "vitamin_d",
    "vit d": "vitamin_d",
    "vitamin d deficiency": "vitamin_d_deficiency",
    "vitamin b12": "vitamin_b12",
    "vit b12": "vitamin_b12",
    "b12": "vitamin_b12",
    "iron": "iron",
    "ferritin": "iron",
    "calcium": "calcium",

    # Blood Cells
    "platelets": "platelets",
    "platelet": "platelets",
    "plt": "platelets",
    "wbc": "wbc",
    "white blood cells": "wbc",
    "rbc": "rbc",
    "red blood cells": "rbc",

    # Wellness & BMI
    "bmi": "bmi",
    "body mass index": "bmi",
    "weight": "bmi"
}


# Structured Local Medical Knowledge Catalog
MEDICAL_KNOWLEDGE_STORE = {
    "hemoglobin": {
        "title": "Hemoglobin",
        "category": "Lab Parameter",
        "definition": "Haemoglobin (or hemoglobin) is a complex iron-rich protein inside red blood cells composed of four polypeptide chains (two alpha and two beta chains) bound by iron. Its primary biological function is to **bind oxygen in the lungs and transport it to tissues throughout the body**, while returning carbon dioxide to the lungs to be exhaled and helping regulate body pH balance.",
        "function": "1. **Oxygen Transport**: Binds oxygen in the lungs to form oxyhemoglobin, delivering oxygen to tissues for cellular energy production.\n2. **Carbon Dioxide Removal**: Binds carbon dioxide waste in tissues forming carbaminohemoglobin and carries it back to the lungs for exhalation.\n3. **pH Buffering**: Regulates acid-base balance by binding to hydrogen ions to maintain optimal systemic pH.",
        "normal_range": "• **Men**: 13.5 to 17.5 g/dL\n• **Women**: 12.0 to 15.5 g/dL",
        "low_consequences": "Low hemoglobin indicates anemia. Consequences include reduced oxygen delivery to tissues, leading to persistent fatigue, physical weakness, pale skin, shortness of breath, dizziness, cold hands/feet, and headaches.",
        "high_consequences": "High hemoglobin (polycythemia) can result from chronic dehydration, living at high altitudes, heavy smoking, or pulmonary disease, which increases blood viscosity.",
        "causes_low": "Low hemoglobin is commonly caused by iron deficiency, Vitamin B12 or folate deficiency, chronic blood loss (menstruation, gastrointestinal ulcer), chronic kidney disease, or bone marrow conditions.",
        "symptoms": "Persistent fatigue, physical weakness, pale skin, shortness of breath on exertion, dizziness, cold extremities, brittle nails, and irregular heartbeat.",
        "nutrition": "To boost hemoglobin, consume **iron-rich foods**:\n• **Plant-based**: Dark leafy greens (spinach, kale), lentils, chickpeas, black beans, tofu, pumpkin seeds, quinoa, dark chocolate, and fortified cereals.\n• **Animal-based**: Lean red meat, poultry, turkey, fish, and clams.\n• **Absorption Tip**: Pair iron-rich foods with **Vitamin C** (citrus fruits, bell peppers, tomatoes) to significantly enhance iron absorption."
    },
    "anemia": {
        "title": "Anemia",
        "category": "Condition",
        "definition": "Anemia is a hematologic condition characterized by a reduced concentration of hemoglobin or total red blood cells in the circulation, impairing tissue oxygenation.",
        "causes": "1. **Iron Deficiency**: Most common cause, reducing hemoglobin synthesis.\n2. **Vitamin Deficiency**: Lack of Vitamin B12 or folate needed for red blood cell maturation.\n3. **Blood Loss**: Heavy menstrual bleeding, ulcers, or internal bleeding.\n4. **Chronic Conditions**: Chronic kidney disease, inflammatory illnesses, or bone marrow disorders.",
        "symptoms": "Persistent fatigue, weakness, pale or yellowish skin, shortness of breath, dizziness, cold hands and feet, brittle nails, and chest discomfort.",
        "nutrition": "Focus on iron-dense foods (spinach, lentils, beans, tofu, lean meats) combined with Vitamin C (citrus, berries) to maximize iron uptake."
    },
    "glucose": {
        "title": "Fasting Glucose (Blood Sugar)",
        "category": "Lab Parameter",
        "definition": "Fasting blood glucose measures the concentration of sugar in your bloodstream after an 8-hour fast. Glucose is the primary energy substrate for your brain and cellular metabolism.",
        "normal_range": "• **Normal**: 70 to 99 mg/dL\n• **Pre-Diabetes**: 100 to 125 mg/dL\n• **Diabetes**: 126 mg/dL or higher",
        "low_consequences": "Low blood sugar (hypoglycemia < 70 mg/dL) causes shakiness, sweating, rapid heart rate, confusion, dizziness, anxiety, and extreme hunger.",
        "high_consequences": "Sustained high blood sugar (hyperglycemia) damages microvascular and macrovascular tissues, increasing risks for cardiovascular disease, neuropathy, nephropathy, and retinopathy.",
        "nutrition": "Recommended low-glycemic, fiber-rich foods for glucose control:\n1. **Non-Starchy Vegetables**: Broccoli, spinach, kale, cauliflower, bell peppers.\n2. **Soluble Fiber**: Steel-cut oats, lentils, chickpeas, black beans, chia seeds.\n3. **Low-GI Fruits**: Blueberries, raspberries, strawberries, apples.\n4. **Nuts & Seeds**: Almonds, walnuts, flaxseeds.\n5. **Foods to Avoid**: Refined sugars, sodas, white bread, processed pastries.",
        "prevention": "Manage glucose by adopting a low-glycemic index diet rich in soluble fiber, engaging in 150 minutes of weekly aerobic physical activity and exercise, maintaining healthy weight, staying hydrated, and routine HbA1c screening."
    },
    "diabetes": {
        "title": "Diabetes Mellitus",
        "category": "Condition",
        "definition": "Diabetes is a chronic metabolic condition where the body either produces insufficient insulin or cannot effectively use insulin, leading to elevated Blood Glucose (hyperglycemia).",
        "causes": "• **Type 1 Diabetes**: Autoimmune destruction of pancreatic insulin-producing beta cells.\n• **Type 2 Diabetes**: Insulin resistance coupled with relative insulin deficiency, strongly linked to body weight, sedentary lifestyle, refined sugar intake, and genetics.",
        "symptoms": "1. **Frequent Urination (Polyuria)**\n2. **Excessive Thirst (Polydipsia)**\n3. **Unexplained Weight Loss** despite hunger\n4. **Extreme Fatigue** & lack of energy\n5. **Blurred Vision**\n6. **Slow-Healing Cutaneous Wounds**\n7. **Tingling/Numbness** in hands or feet",
        "nutrition": "Prioritize complex carbohydrates (oats, quinoa), legumes, non-starchy vegetables, lean proteins, and healthy fats while eliminating refined sugars and sweetened drinks.",
        "prevention": "Adopt a low-GI Mediterranean or DASH eating plan, engage in regular cardio and strength exercise, manage body weight, and monitor HbA1c regularly."
    },
    "hba1c": {
        "title": "HbA1c (Glycated Hemoglobin)",
        "category": "Lab Parameter",
        "definition": "HbA1c measures the percentage of blood hemoglobin bound to glucose, reflecting your average blood sugar control over the past 2 to 3 months (the typical 90-day red blood cell lifespan).",
        "normal_range": "• **Normal**: Below 5.7%\n• **Pre-Diabetes**: 5.7% to 6.4%\n• **Diabetes**: 6.5% or higher"
    },
    "cholesterol": {
        "title": "Total Cholesterol",
        "category": "Lab Parameter",
        "definition": "Total cholesterol measures the sum of circulating lipids in your blood. Cholesterol is required to construct cell membranes, Vitamin D, and steroid hormones.",
        "normal_range": "• **Desirable**: Under 200 mg/dL\n• **Borderline High**: 200 to 239 mg/dL\n• **High**: 240 mg/dL or higher",
        "causes": "High cholesterol is primarily caused by diets high in Saturated fats and trans fats, physical inactivity, smoking, excess body weight, and genetics.",
        "nutrition": "Heart-healthy cholesterol management:\n1. **Soluble Fiber**: Oatmeal, oat bran, beans, lentils, apples (bind cholesterol in digestive tract).\n2. **Healthy Fats**: Extra virgin olive oil, avocados, almonds, walnuts.\n3. **Omega-3s**: Salmon, mackerel, flaxseeds.\n4. **Avoid**: Saturated fats and industrial trans fats."
    },
    "ldl": {
        "title": "LDL Cholesterol ('Bad' Cholesterol)",
        "category": "Lab Parameter",
        "definition": "LDL (Low-Density Lipoprotein) is referred to as 'bad' cholesterol because high levels deposit cholesterol inside artery walls, causing vascular plaque buildup (atherosclerosis).",
        "normal_range": "• **Optimal**: Under 100 mg/dL\n• **Near Optimal**: 100 to 129 mg/dL\n• **Elevated**: 130 mg/dL or higher"
    },
    "hdl": {
        "title": "HDL Cholesterol ('Good' Cholesterol)",
        "category": "Lab Parameter",
        "definition": "HDL (High-Density Lipoprotein) is referred to as 'good' cholesterol because it acts as a vascular scavenger, picking up excess arterial cholesterol and returning it to the liver for disposal.",
        "normal_range": "• **Protective Level**: 40+ mg/dL for men, 50+ mg/dL for women"
    },
    "triglycerides": {
        "title": "Triglycerides",
        "category": "Lab Parameter",
        "definition": "Triglycerides are the primary fat type stored in adipose cells, created when your body converts unused dietary calories into energy reserves.",
        "normal_range": "• **Normal**: Under 150 mg/dL\n• **Borderline High**: 150 to 199 mg/dL\n• **High**: 200 mg/dL or higher"
    },
    "hypercholesterolemia": {
        "title": "High Cholesterol (Hypercholesterolemia)",
        "category": "Condition",
        "definition": "Hypercholesterolemia is an elevated concentration of circulating blood lipids (LDL cholesterol >130 mg/dL or Total Cholesterol >200 mg/dL), increasing vascular risk.",
        "causes": "Diets high in Saturated and trans fats, physical inactivity, excess body weight, smoking, and genetic factors.",
        "symptoms": "Typically symptomless until arterial plaque restricts blood flow, causing angina (chest discomfort) or cardiovascular events.",
        "nutrition": "Substitute saturated fats with monounsaturated oils (olive oil, avocado), increase soluble fiber (oats, lentils), and consume omega-3 fatty acids."
    },
    "blood_pressure": {
        "title": "Blood Pressure",
        "category": "Lab Parameter",
        "definition": "Blood pressure measures the pressure of circulating blood against arterial walls during heart contraction (systolic) and cardiac rest (diastolic).",
        "normal_range": "• **Normal**: Below 120/80 mmHg\n• **Elevated**: 120–129 / <80 mmHg\n• **Stage 1 Hypertension**: 130–139 / 80–89 mmHg\n• **Stage 2 Hypertension**: 140+ / 90+ mmHg"
    },
    "hypertension": {
        "title": "Hypertension (High Blood Pressure)",
        "category": "Condition",
        "definition": "Hypertension is a chronic cardiovascular condition in which blood pressure against arterial walls remains consistently elevated at or above 130/80 mmHg.",
        "causes": "High dietary sodium, physical inactivity, stress, chronic kidney strain, excessive alcohol consumption, obesity, and family history.",
        "symptoms": "Often called a 'silent killer' because it has no early symptoms. Severe hypertension can cause morning headaches, shortness of breath, chest pressure, dizziness, and nosebleeds.",
        "prevention": "Adopt a low-sodium DASH diet (<2,000 mg/day salt), engage in 30 minutes of daily moderate exercise, manage stress, limit alcohol, and maintain healthy weight."
    },
    "creatinine": {
        "title": "Creatinine",
        "category": "Lab Parameter",
        "definition": "Creatinine is a waste product from normal muscle breakdown, filtered out of the blood exclusively by healthy kidneys and excreted in urine.",
        "normal_range": "• **Normal**: 0.6 to 1.2 mg/dL",
        "high_consequences": "Elevated creatinine indicates reduced kidney filtration capacity, dehydration, high muscle breakdown, or renal tissue strain."
    },
    "bun": {
        "title": "Urea / Blood Urea Nitrogen (BUN)",
        "category": "Lab Parameter",
        "definition": "Blood Urea Nitrogen measures nitrogen waste in blood resulting from protein metabolism and renal excretion.",
        "normal_range": "• **Normal**: 7.0 to 20.0 mg/dL"
    },
    "alt": {
        "title": "ALT (SGPT)",
        "category": "Lab Parameter",
        "definition": "Alanine Aminotransferase (ALT) is an enzyme concentrated in liver cells. High ALT in blood signals liver cell irritation or strain.",
        "normal_range": "• **Normal**: 7 to 45 U/L"
    },
    "ast": {
        "title": "AST (SGOT)",
        "category": "Lab Parameter",
        "definition": "Aspartate Aminotransferase (AST) is an enzyme found in liver, heart, and muscle tissue. Elevated AST indicates cellular strain.",
        "normal_range": "• **Normal**: 8 to 40 U/L"
    },
    "tsh": {
        "title": "TSH (Thyroid Stimulating Hormone)",
        "category": "Lab Parameter",
        "definition": "Thyroid Stimulating Hormone is produced by the pituitary gland to control thyroid gland hormone production (T3/T4) and body metabolism.",
        "normal_range": "• **Normal**: 0.4 to 4.0 mIU/L"
    },
    "vitamin_d": {
        "title": "Vitamin D",
        "category": "Lab Parameter",
        "definition": "Vitamin D is a fat-soluble nutrient essential for calcium absorption, bone density, immune defense, and muscle function.",
        "normal_range": "• **Sufficient**: 30 to 100 ng/mL\n• **Deficient**: Below 20 ng/mL",
        "nutrition": "Fatty fish (salmon, tuna, mackerel), egg yolks, UV-treated mushrooms, fortified dairy/plant milks, plus 15–20 minutes of natural daily sun exposure."
    },
    "vitamin_d_deficiency": {
        "title": "Vitamin D Deficiency",
        "category": "Condition",
        "definition": "Vitamin D deficiency occurs when serum Vitamin D levels fall below 20 ng/mL, impairing calcium absorption and bone health.",
        "symptoms": "Bone pain, muscle weakness, frequent infections, persistent fatigue, impaired wound healing, and mood changes.",
        "nutrition": "Sun exposure, fortified foods, egg yolks, fatty fish, or clinical Vitamin D3 supplementation."
    },
    "vitamin_b12": {
        "title": "Vitamin B12",
        "category": "Lab Parameter",
        "definition": "Vitamin B12 is essential for nerve myelin sheath health, red blood cell synthesis, and DNA replication.",
        "normal_range": "• **Normal**: 200 to 900 pg/mL"
    },
    "iron": {
        "title": "Iron",
        "category": "Nutrient",
        "definition": "Iron is an essential mineral required to synthesize hemoglobin in red blood cells for systemic oxygen transport.",
        "nutrition": "Dark leafy greens (spinach, kale), lentils, chickpeas, beans, tofu, pumpkin seeds, dark chocolate, fortified cereals, lean red meat, poultry, and seafood."
    },
    "calcium": {
        "title": "Calcium",
        "category": "Nutrient",
        "definition": "Calcium is an essential mineral required for bone matrix structure, muscle contraction, blood clotting, and nerve signaling.",
        "nutrition": "Dairy products (milk, yogurt, cheese), fortified plant milks, tofu, dark leafy greens (kale, broccoli), and almonds."
    },
    "platelets": {
        "title": "Platelets",
        "category": "Lab Parameter",
        "definition": "Platelets (thrombocytes) are blood cell fragments responsible for normal blood clotting and tissue repair.",
        "normal_range": "• **Normal**: 1.5 to 4.5 Lakhs/µL (150,000–450,000 /µL)"
    },
    "wbc": {
        "title": "WBC Count (White Blood Cells)",
        "category": "Lab Parameter",
        "definition": "White Blood Cells defend the body against infections, viruses, bacteria, and foreign pathogens.",
        "normal_range": "• **Normal**: 4.0 to 11.0 10^3/uL (4,000–11,000 /µL)"
    },
    "rbc": {
        "title": "RBC Count (Red Blood Cells)",
        "category": "Lab Parameter",
        "definition": "Red blood cells carry hemoglobin to deliver oxygen from lungs to body tissues.",
        "normal_range": "• **Normal**: 4.2 to 5.8 10^6/uL"
    },
    "bmi": {
        "title": "Body Mass Index (BMI)",
        "category": "Metric",
        "definition": "Body Mass Index (BMI) evaluates body weight relative to height: **BMI = weight (kg) / [height (m)]²**.",
        "normal_range": "• **Underweight**: < 18.5\n• **Normal**: 18.5 – 24.9\n• **Overweight**: 25.0 – 29.9\n• **Obesity**: 30.0+"
    }
}


class MedicalKnowledgeBase:
    """
    Local RAG Knowledge Engine.
    Maps raw medical queries/terms to canonical concept entries and retrieves targeted explanations.
    """

    def normalize_term(self, text: str) -> Optional[str]:
        if not text:
            return None
        t_lower = text.lower().strip()

        # Check exact matches in SYNONYM_MAP
        if t_lower in SYNONYM_MAP:
            return SYNONYM_MAP[t_lower]

        # Check substring regex matches
        for synonym, canonical in SYNONYM_MAP.items():
            if re.search(r'\b' + re.escape(synonym) + r'\b', t_lower):
                return canonical

        return None

    def retrieve_knowledge(self, entity_key: str, aspect: str = "general", raw_query: str = "") -> str:
        entry = MEDICAL_KNOWLEDGE_STORE.get(entity_key)
        if not entry:
            return self._default_fallback(raw_query)

        title = entry["title"]
        q_lower = raw_query.lower()

        # Aspect 1: Symptoms
        if aspect == "symptoms" or "symptom" in q_lower or "signs" in q_lower:
            syms = entry.get("symptoms", entry.get("low_consequences"))
            if syms:
                return f"### Symptoms Related to {title}\n\n**Common Symptoms:**\n{syms}\n\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"

        # Aspect 2: Nutrition / Foods
        if aspect == "nutrition" or "food" in q_lower or "eat" in q_lower or "diet" in q_lower or "source" in q_lower:
            nut = entry.get("nutrition")
            if nut:
                return f"### Dietary & Nutritional Guidance for {title}\n\n{nut}\n\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"

        # Aspect 3: Low / Deficiency Consequences
        if aspect == "low" or "low" in q_lower or "deficiency" in q_lower or "decreased" in q_lower:
            low_info = entry.get("low_consequences") or entry.get("symptoms")
            if low_info:
                return f"### Understanding Low {title} & Consequences\n\n{low_info}\n\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"

        # Aspect 4: Causes
        if aspect == "causes" or "cause" in q_lower or "why" in q_lower or "reason" in q_lower:
            causes_info = entry.get("causes") or entry.get("causes_low")
            if causes_info:
                return f"### What Causes {title} Variance?\n\n{causes_info}\n\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"

        # Aspect 5: Prevention / Management
        if aspect == "prevention" or "manage" in q_lower or "lower" in q_lower or "reduce" in q_lower or "control" in q_lower:
            prev_info = entry.get("prevention") or entry.get("nutrition")
            if prev_info:
                if entity_key == "glucose":
                    return f"### Understanding Blood Glucose & Maintenance Strategies\n\n**Dietary Adjustments:** Prioritize complex carbohydrates, non-starchy vegetables, and high-fiber foods. Limit refined sugars.\n\n{prev_info}\n\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"
                return f"### Managing & Maintaining Healthy {title}\n\n{prev_info}\n\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"

        # Aspect 6: Function / Role
        if aspect == "function" or "do" in q_lower or "role" in q_lower or "function" in q_lower or "important" in q_lower:
            func_info = entry.get("function") or entry.get("definition")
            ref_info = entry.get("normal_range", "")
            return f"### Function & Importance of {title}\n\n**What It Does:**\n{func_info}\n\n**Normal Reference Bounds:**\n{ref_info}\n\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"

        # Default Definition & Overview
        defi = entry.get("definition", "")
        ref = entry.get("normal_range", "")
        parts = [f"### Understanding {title}\n\n{defi}"]
        if ref:
            parts.append(f"\n**Normal Reference Range:**\n{ref}")
        parts.append("\n*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*")

        return "\n".join(parts)

    def _default_fallback(self, raw_query: str) -> str:
        return (
            "### Balanced Nutrition & Dietary Improvement\n\n"
            "A healthy, Balanced diet prioritizes Whole Foods, plant-based vegetables, complex carbohydrates, lean proteins, healthy fats, and proper hydration while limiting refined sugars.\n\n"
            "*(Note: Educational information provided by offline Local Medical Knowledge Engine.)*"
        )
