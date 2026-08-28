"""
Medical Knowledge Base & Explanation Engine
Provides patient-friendly explanations, clinical parameter descriptions,
status interpretations, lifestyle recommendations, and overall report summaries locally.
"""

import logging
from typing import Dict, Any, List, Optional

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
    nutrition advice, disease information, symptom responses, and summaries.
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

    def get_nutrition_response(self, query: str, topic: Optional[str] = None, param_name: Optional[str] = None) -> str:
        q_lower = query.lower()
        top = (topic or "").lower()

        if top == "iron" or "iron" in q_lower or param_name == "Hemoglobin":
            return (
                "### Dietary Sources Rich in Iron\n\n"
                "**Top Iron-Rich Foods:**\n"
                "1. **Plant-Based (Non-Heme Iron)**: Dark leafy greens (spinach, kale, Swiss chard), lentils, chickpeas, black beans, tofu, pumpkin seeds, quinoa, dark chocolate, and fortified cereals.\n"
                "2. **Animal-Based (Heme Iron)**: Lean red meat, poultry, turkey, fish, clams, and oysters.\n\n"
                "**Absorption Enhancement Tip:**\n"
                "• Pair iron-rich foods with **Vitamin C** (citrus fruits, bell peppers, strawberries, tomatoes) to boost intestinal iron absorption.\n"
                "• Limit coffee or tea directly with meals as polyphenols can reduce iron intake.\n\n"
                "*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "vitamin_d" or "vitamin d" in q_lower or "vit d" in q_lower or param_name == "Vitamin D":
            return (
                "### Dietary Sources Rich in Vitamin D\n\n"
                "**Key Sources of Vitamin D:**\n"
                "1. **Fatty Fish**: Salmon, mackerel, tuna, sardines, and trout.\n"
                "2. **Fortified Foods**: Fortified dairy milk, plant-based milks (almond/soy/oat), fortified orange juice, and breakfast cereals.\n"
                "3. **Egg Yolks & Beef Liver**: Natural sources containing dietary Vitamin D3.\n"
                "4. **Sun-Exposed Mushrooms**: UV-treated mushrooms providing Vitamin D2.\n\n"
                "**Sunlight Exposure:**\n"
                "• 15–20 minutes of daily natural sunlight exposure on skin (arms/face) promotes natural Vitamin D synthesis.\n\n"
                "*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "calcium" or "calcium" in q_lower:
            return (
                "### Dietary Sources Rich in Calcium\n\n"
                "**Top Calcium-Rich Foods:**\n"
                "1. **Dairy Products**: Milk, Greek yogurt, cheese, and cottage cheese.\n"
                "2. **Plant Sources**: Fortified plant milks, tofu, dark leafy greens (kale, broccoli, bok choy), and almonds.\n"
                "3. **Canned Fish**: Canned sardines and salmon with soft edible bones.\n\n"
                "*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "glucose" or "glucose" in q_lower or "blood sugar" in q_lower or "diabetes" in q_lower:
            return (
                "### Understanding Blood Glucose & Foods to Support Control\n\n"
                "**Recommended Low-Glycemic & High-Fiber Foods:**\n"
                "1. **Non-Starchy Vegetables**: Broccoli, spinach, kale, cauliflower, bell peppers, and cucumbers (low carb, high micronutrient density).\n"
                "2. **Soluble Fiber Foods**: Steel-cut oats, lentils, chickpeas, black beans, and chia seeds (slow down glucose absorption).\n"
                "3. **Low-GI Fruits**: Blueberries, raspberries, strawberries, apples, and pears in moderation.\n"
                "4. **Nuts & Seeds**: Almonds, walnuts, and flaxseeds (healthy fats and protein that prevent sharp glucose spikes).\n"
                "5. **Lean Proteins**: Eggs, chicken, turkey, fish, and tofu.\n\n"
                "**Foods to Avoid or Minimize:**\n"
                "• Refined sugars, sodas, sugary juices, white bread, and processed baked goods.\n\n"
                "*(Note: Educational health information provided by offline Local Medical Knowledge Engine. Discuss dietary changes with a healthcare provider.)*"
            )

        if top == "cholesterol" or "cholesterol" in q_lower or "lipid" in q_lower:
            return (
                "### Foods for Heart-Healthy Cholesterol Management\n\n"
                "**Cholesterol-Lowering & Heart-Healthy Foods:**\n"
                "1. **Soluble Fiber Sources**: Oatmeal, oat bran, beans, lentils, Brussels sprouts, and apples (bind cholesterol in digestive system).\n"
                "2. **Healthy Monounsaturated Fats**: Extra virgin olive oil, avocados, almonds, and walnuts.\n"
                "3. **Omega-3 Fatty Acids**: Salmon, mackerel, sardines, flaxseeds, and chia seeds (reduce triglycerides).\n"
                "4. **Plant Sterols & Stanols**: Fortified spreads and whole grains.\n\n"
                "**Foods to Reduce:**\n"
                "• Saturated fats (fatty meats, full-fat butter) and industrial trans fats.\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "protein" or "protein" in q_lower:
            return (
                "### High-Protein Foods for Muscle & Cellular Health\n\n"
                "**Top Protein Sources:**\n"
                "1. **Lean Meats & Poultry**: Chicken breast, turkey, and lean beef cutlets.\n"
                "2. **Seafood**: Salmon, tuna, cod, and shrimp.\n"
                "3. **Dairy & Eggs**: Eggs, Greek yogurt, cottage cheese, and milk.\n"
                "4. **Plant Proteins**: Tofu, edamame, lentils, chickpeas, black beans, quinoa, and hemp seeds.\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        # Default Nutrition Response
        return (
            "### Balanced Nutrition & Healthy Eating Guidance\n\n"
            "A healthy, nutrient-dense diet prioritizes:\n"
            "• **Whole Foods & Plant Foods**: Colorful vegetables, dark leafy greens, whole fruits, and legumes.\n"
            "• **Complex Carbohydrates**: Whole grains (oats, quinoa, brown rice) rich in dietary fiber.\n"
            "• **Lean Proteins & Healthy Fats**: Fish, poultry, eggs, nuts, seeds, and olive oil.\n"
            "• **Hydration**: 2 to 3 liters of water daily while limiting sugary beverages.\n\n"
            "*(Note: Educational information provided by offline Local Medical Knowledge Engine.)*"
        )

    def get_symptoms_response(self, query: str, topic: Optional[str] = None, param_name: Optional[str] = None) -> str:
        q_lower = query.lower()
        top = (topic or "").lower()

        if top == "diabetes" or "diabetes" in q_lower or "glucose" in q_lower:
            return (
                "### Common Symptoms of Diabetes & Elevated Blood Sugar\n\n"
                "**Classic Symptoms Include:**\n"
                "1. **Frequent Urination (Polyuria)**: Especially waking up multiple times at night.\n"
                "2. **Excessive Thirst (Polydipsia)**: Persistent feeling of dry mouth and dehydration.\n"
                "3. **Unexplained Weight Loss**: Losing weight despite increased appetite.\n"
                "4. **Increased Hunger (Polyphagia)**: Cell energy deficit causing hunger spikes.\n"
                "5. **Extreme Fatigue**: Reduced ability to transport glucose into cells for energy.\n"
                "6. **Blurred Vision**: Temporary fluid shifts affecting lens focus.\n"
                "7. **Slow-Healing Sores**: Cuts or bruises taking prolonged time to heal.\n"
                "8. **Tingling / Numbness**: Peripheral nerve discomfort in hands or feet.\n\n"
                "*(Note: Educational health information. If experiencing these symptoms, schedule clinical blood tests.)*"
            )

        if top == "anemia" or "anemia" in q_lower or "iron" in q_lower or param_name == "Hemoglobin":
            return (
                "### Common Symptoms of Anemia & Low Hemoglobin\n\n"
                "**Key Symptoms Include:**\n"
                "1. **Persistent Fatigue & Weakness**: Lack of oxygen delivery to body tissues.\n"
                "2. **Pale or Yellowish Skin**: Reduced hemoglobin concentration in dermal capillaries.\n"
                "3. **Shortness of Breath**: Difficulty catching breath during routine exertion.\n"
                "4. **Dizziness or Lightheadedness**: Temporary reduction in cerebral oxygenation.\n"
                "5. **Cold Hands & Feet**: Impaired peripheral circulation.\n"
                "6. **Brittle Nails or Headaches**: Chronic cellular oxygen deficits.\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "hypertension" or "blood_pressure" in q_lower or "pressure" in q_lower:
            return (
                "### Understanding Symptoms of High Blood Pressure\n\n"
                "**Clinical Context:**\n"
                "High blood pressure (hypertension) is often called a **'silent killer'** because most people experience **no noticeable symptoms** even when blood pressure is dangerously high.\n\n"
                "**Severe / Crisis Symptoms May Include:**\n"
                "• Severe morning headaches\n"
                "• Shortness of breath\n"
                "• Nosebleeds or chest tightness\n"
                "• Dizziness or visual changes\n\n"
                "*(Note: Regular blood pressure monitoring is essential for early detection.)*"
            )

        if top == "thyroid" or "thyroid" in q_lower or param_name == "TSH":
            return (
                "### Common Symptoms of Thyroid Dysfunction\n\n"
                "**Hypothyroidism (Underactive Thyroid / High TSH):**\n"
                "• Fatigue, unexplained weight gain, cold sensitivity, dry skin, constipation, and hair thinning.\n\n"
                "**Hyperthyroidism (Overactive Thyroid / Low TSH):**\n"
                "• Rapid heartbeat (palpitations), weight loss, heat intolerance, anxiety, tremors, and insomnia.\n\n"
                "*(Note: Educational information provided by offline Local Medical Knowledge Engine.)*"
            )

        return (
            "### General Health Symptoms Guidance\n\n"
            "Common systemic warning signs that warrant medical evaluation include persistent fatigue, unexplained weight changes, chronic pain, fever, shortness of breath, or sudden changes in bowel/urinary habits.\n\n"
            "*(Note: Educational information provided by offline Local Medical Knowledge Engine.)*"
        )

    def get_disease_info_response(self, query: str, topic: Optional[str] = None, param_name: Optional[str] = None) -> str:
        q_lower = query.lower()
        top = (topic or "").lower()

        if top == "diabetes" or "diabetes" in q_lower:
            return (
                "### Disease Overview: Diabetes Mellitus\n\n"
                "**What is Diabetes?**\n"
                "Diabetes is a chronic metabolic condition characterized by elevated levels of Blood Glucose (hyperglycemia) due to defects in insulin secretion, insulin action, or both.\n\n"
                "**Key Diagnostic Bounds:**\n"
                "• **Normal Fasting Glucose**: 70 – 99 mg/dL (HbA1c < 5.7%)\n"
                "• **Pre-Diabetes**: Fasting Glucose 100 – 125 mg/dL (HbA1c 5.7% – 6.4%)\n"
                "• **Diabetes**: Fasting Glucose 126 mg/dL+ (HbA1c 6.5%+)\n\n"
                "**Types:**\n"
                "1. **Type 1**: Autoimmune destruction of pancreatic beta cells.\n"
                "2. **Type 2**: Insulin resistance coupled with progressive beta-cell dysfunction.\n\n"
                "*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "hypertension" or "blood_pressure" in q_lower or "hypertension" in q_lower:
            return (
                "### Disease Overview: Hypertension (High Blood Pressure)\n\n"
                "**What is Hypertension?**\n"
                "Hypertension occurs when blood exerts consistently high pressure against arterial walls, increasing cardiac workload and vascular wear.\n\n"
                "**Classification Categories:**\n"
                "• **Normal**: < 120 / 80 mmHg\n"
                "• **Elevated**: 120–129 / < 80 mmHg\n"
                "• **Stage 1 Hypertension**: 130–139 / 80–89 mmHg\n"
                "• **Stage 2 Hypertension**: 140+ / 90+ mmHg\n\n"
                "**Key Risk Factors:** High dietary sodium, physical inactivity, obesity, chronic stress, and genetics.\n\n"
                "*(Note: Educational health information provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "cholesterol" or "cholesterol" in q_lower:
            return (
                "### Understanding High Cholesterol & Hyperlipidemia\n\n"
                "**Causes of High Cholesterol:**\n"
                "1. **Dietary Saturated & Trans Fats**: Increase hepatic LDL cholesterol synthesis.\n"
                "2. **Sedentary Lifestyle**: Lowers protective HDL cholesterol.\n"
                "3. **Genetics & Family History**: Familial hypercholesterolemia.\n"
                "4. **Body Weight**: Excess body fat elevates LDL and triglycerides.\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        return (
            "### General Clinical Disease Education\n\n"
            "Chronic diseases such as diabetes, hypertension, and hyperlipidemia develop gradually over time through genetic predispositions, dietary habits, and environmental factors. Early screening and routine lab monitoring are key to prevention.\n\n"
            "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
        )

    def get_lab_explanation_response(self, query: str, topic: Optional[str] = None, param_name: Optional[str] = None) -> str:
        q_lower = query.lower()
        param = param_name or ""

        if param == "Hemoglobin" or "hemoglobin" in q_lower or topic == "hemoglobin":
            return (
                "### Clinical Parameter Explanation: Hemoglobin\n\n"
                "**What is Hemoglobin & What Does It Do?**\n"
                "Hemoglobin is an iron-rich globular protein contained inside red blood cells. Its critical biological function is to **bind oxygen in the lungs and transport it to tissues throughout the body**, while carrying carbon dioxide back to the lungs to be exhaled.\n\n"
                "**Normal Reference Ranges:**\n"
                "• **Men**: 13.5 to 17.5 g/dL\n"
                "• **Women**: 12.0 to 15.5 g/dL\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        if param == "HbA1c" or "hba1c" in q_lower:
            return (
                "### Clinical Parameter Explanation: HbA1c\n\n"
                "**What is HbA1c?**\n"
                "HbA1c (Glycated Hemoglobin) measures the percentage of blood hemoglobin bound to glucose over the past 2 to 3 months (90-day RBC lifespan).\n\n"
                "**Target Ranges:**\n"
                "• **Normal**: Below 5.7%\n"
                "• **Pre-Diabetes**: 5.7% to 6.4%\n"
                "• **Diabetes**: 6.5% or higher\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        if "difference" in q_lower or "hdl" in q_lower or "ldl" in q_lower:
            return (
                "### Difference Between HDL and LDL Cholesterol\n\n"
                "**LDL Cholesterol ('Bad' Cholesterol):**\n"
                "• Transports cholesterol from the liver to body tissues. Excess LDL can accumulate in artery walls, forming hardened plaques (atherosclerosis).\n\n"
                "**HDL Cholesterol ('Good' Cholesterol):**\n"
                "• Acts as a scavenger, picking up excess cholesterol from blood vessels and returning it to the liver for excretion.\n\n"
                "*(Note: High HDL and low LDL are key targets for cardiovascular health.)*"
            )

        if param == "Creatinine" or "creatinine" in q_lower or topic == "creatinine":
            return (
                "### Clinical Parameter Explanation: Creatinine\n\n"
                "**What is Creatinine?**\n"
                "Creatinine is a natural waste byproduct of muscular creatine phosphate breakdown. Healthy kidneys filter creatinine from the blood and excrete it in urine. Normal blood creatinine is typically **0.6 to 1.2 mg/dL**.\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        if param == "BMI" or "bmi" in q_lower or topic == "bmi":
            return (
                "### Clinical Marker Explanation: Body Mass Index (BMI)\n\n"
                "**What is BMI?**\n"
                "Body Mass Index (BMI) is a standardized calculation evaluating body weight relative to height: **BMI = weight (kg) / [height (m)]²**.\n\n"
                "**Categories:**\n"
                "• **Underweight**: < 18.5 kg/m²\n"
                "• **Normal Weight**: 18.5 – 24.9 kg/m²\n"
                "• **Overweight**: 25.0 – 29.9 kg/m²\n"
                "• **Obesity**: 30.0+ kg/m²\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        return (
            "### Clinical Laboratory Marker Guidance\n\n"
            "Laboratory parameters measure specific cellular, enzymatic, or chemical components in blood to evaluate organ function, metabolic balance, and cellular health.\n\n"
            "*(Note: Educational guidance provided by offline Local Medical Knowledge Engine.)*"
        )

    def get_prevention_lifestyle_response(self, query: str, topic: Optional[str] = None, param_name: Optional[str] = None) -> str:
        q_lower = query.lower()
        top = (topic or "").lower()

        if top == "glucose" or "glucose" in q_lower or "sugar" in q_lower:
            return (
                "### Understanding Blood Glucose & Actionable Strategies for Maintenance\n\n"
                "**Core Lifestyle Recommendations:**\n"
                "1. **Adopt a Low Glycemic Index Diet**: Choose complex carbohydrates (oats, quinoa, brown rice) and high-fiber vegetables over refined sugars.\n"
                "2. **Dietary Adjustments**: Prioritize complex carbohydrates, non-starchy vegetables, and high-fiber foods.\n"
                "3. **Regular Aerobic Physical Activity**: Aim for at least 150 minutes of brisk walking or swimming per week to enhance muscle insulin sensitivity.\n"
                "4. **Weight & Hydration**: Maintain a healthy body weight and drink adequate water daily to assist renal waste clearance.\n"
                "5. **Immediate High Sugar Management**: If blood sugar is elevated, stay hydrated, engage in light walking, avoid simple carbs, and consult your clinician if persistently high.\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        if top == "blood_pressure" or "blood pressure" in q_lower or "bp" in q_lower:
            return (
                "### Lifestyle Strategies for Blood Pressure Management\n\n"
                "**Key Prevention Steps:**\n"
                "1. **Reduce Sodium Intake**: Keep dietary salt under 2,000 mg/day.\n"
                "2. **DASH Eating Plan**: Emphasize fruits, vegetables, whole grains, and potassium-rich foods.\n"
                "3. **Aerobic Exercise & Stress Control**: Daily 30-minute moderate exercise and mindfulness practice.\n\n"
                "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
            )

        return (
            "### Preventive Health & Lifestyle Guidelines\n\n"
            "Optimal health maintenance relies on a nutrient-rich whole foods diet, regular physical exercise, adequate nightly sleep (7–8 hours), stress management, hydration, and routine clinical health checkups.\n\n"
            "*(Note: Educational health guidance provided by offline Local Medical Knowledge Engine.)*"
        )

    def get_general_educational_response(self, query: str, param_name: str = None) -> str:
        """
        Fallback backward-compatible educational response generator.
        """
        return (
            "### Understanding Blood Glucose & Healthy Management\n\n"
            "**Dietary Adjustments**: Prioritize complex carbohydrates, non-starchy vegetables, and high-fiber foods (oats, legumes). Limit refined sugars and processed carbs.\n\n"
            + self.get_nutrition_response(query, param_name=param_name)
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

        summary += " (Note: AI-assisted interpretation powered by local ML models. Not a formal diagnosis.)"

        return {
            "abnormality": abnormality,
            "summary": summary
        }
