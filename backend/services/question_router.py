"""
Question Router & Intent Classifier with Concept Normalization & Context Resolution
Analyzes natural-language user queries, normalizes medical terms/synonyms (e.g., haemoglobin -> hemoglobin),
resolves multi-turn conversation history context, and determines exact query intent.
"""

import re
import logging
from typing import Dict, Any, List, Optional
from family.models import FamilyMember
from services.medical_knowledge_base import MedicalKnowledgeBase

logger = logging.getLogger(__name__)

# Intent Constants
INTENT_GREETING = "GREETING"
INTENT_GENERAL_CONVERSATION = "GENERAL_CONVERSATION"
INTENT_FAMILY_MEMBERS = "FAMILY_MEMBERS"
INTENT_REPORT_LIST = "REPORT_LIST"
INTENT_REPORT_VALUES = "REPORT_VALUES"
INTENT_PARAMETER_VALUE = "PARAMETER_VALUE"
INTENT_PARAMETER_TREND = "PARAMETER_TREND"
INTENT_ABNORMAL_RESULTS = "ABNORMAL_RESULTS"
INTENT_PATIENT_SPECIFIC_ADVICE = "PATIENT_SPECIFIC_ADVICE"
INTENT_GENERAL_MEDICAL = "GENERAL_MEDICAL"
INTENT_UNKNOWN = "UNKNOWN"

# Display Label Mapping for Parameters
PARAMETER_DISPLAY_LABELS = {
    "hemoglobin": "Hemoglobin",
    "glucose": "Fasting Glucose",
    "hba1c": "HbA1c",
    "cholesterol": "Total Cholesterol",
    "ldl": "LDL Cholesterol",
    "hdl": "HDL Cholesterol",
    "triglycerides": "Triglycerides",
    "platelets": "Platelets",
    "wbc": "WBC Count",
    "rbc": "RBC Count",
    "creatinine": "Creatinine",
    "bun": "Urea / BUN",
    "alt": "ALT (SGPT)",
    "ast": "AST (SGOT)",
    "tsh": "TSH",
    "vitamin_d": "Vitamin D",
    "vitamin_b12": "Vitamin B12",
    "iron": "Iron",
    "blood_pressure": "Blood Pressure",
    "bmi": "BMI"
}


class QuestionRouter:
    """
    Analyzes queries, normalizes medical terminology, resolves follow-up context,
    and maps questions to specific intent handlers.
    """

    def __init__(self):
        self.kb = MedicalKnowledgeBase()

    def analyze_question(self, message: str, history: List[Dict[str, Any]] = None, user_family_members: List[FamilyMember] = None) -> Dict[str, Any]:
        raw_msg = (message or "").strip()
        msg_lower = raw_msg.lower()

        # Step 1: Detect explicit target family member from query
        target_member_name = self._extract_target_member(msg_lower, user_family_members)

        # Step 2: Extract medical concept / entity (e.g., haemoglobin -> hemoglobin)
        canonical_entity = self.kb.normalize_term(msg_lower)

        # Step 3: Determine Query Aspect
        aspect = self._extract_aspect(msg_lower)

        # Step 4: Resolve History Context for follow-up turns
        context = self._resolve_history_context(msg_lower, history, target_member_name, canonical_entity, aspect)
        target_member_name = context.get("target_member_name")
        canonical_entity = context.get("canonical_entity")
        aspect = context.get("aspect") or aspect

        # Step 5: Classify Intent
        intent = self._classify_intent(msg_lower, target_member_name, canonical_entity, aspect)

        display_param_name = PARAMETER_DISPLAY_LABELS.get(canonical_entity) if canonical_entity else None

        return {
            "intent": intent,
            "target_member_name": target_member_name,
            "canonical_entity": canonical_entity,
            "parameter_name": display_param_name,
            "aspect": aspect,
            "raw_message": raw_msg
        }

    def _extract_target_member(self, msg_lower: str, user_family_members: List[FamilyMember] = None) -> Optional[str]:
        if user_family_members:
            for member in user_family_members:
                m_name = member.name.strip()
                first_name = m_name.split()[0].lower()
                if re.search(r'\b' + re.escape(first_name) + r"('s|\b)", msg_lower):
                    return m_name

        names = ["sarah", "david", "john", "jane", "alex", "mary", "emily", "michael", "tom"]
        for name in names:
            if re.search(r'\b' + name + r"('s|\b)", msg_lower):
                return name.capitalize()

        return None

    def _extract_aspect(self, msg_lower: str) -> str:
        if any(w in msg_lower for w in ["symptom", "symptoms", "signs"]):
            return "symptoms"
        if any(w in msg_lower for w in ["food", "foods", "eat", "eating", "diet", "nutrition", "rich in", "source"]):
            return "nutrition"
        if any(w in msg_lower for w in ["happen if", "low", "deficiency", "decreased"]):
            return "low"
        if any(w in msg_lower for w in ["cause", "causes", "why is", "reason"]):
            return "causes"
        if any(w in msg_lower for w in ["maintain", "lower", "reduce", "decrease", "improve", "control", "manage", "what should i do", "should i do", "what to do"]):
            return "prevention"
        if any(w in msg_lower for w in ["do", "function", "role", "important"]):
            return "function"
        return "general"

    def _resolve_history_context(self, msg_lower: str, history: List[Dict[str, Any]], target_member_name: Optional[str], canonical_entity: Optional[str], aspect: str) -> Dict[str, Any]:
        res_member = target_member_name
        res_entity = canonical_entity
        res_aspect = aspect

        has_pronoun = any(re.search(pat, msg_lower) for pat in [
            r"\bit\b", r"\bshe\b", r"\bhe\b", r"\bher\b", r"\bhis\b", r"\bthis\b", r"\bthat\b",
            r"\bthe values\b", r"\bvalues\b", r"\bthe report\b", r"\bthe results\b", r"\bwhat foods\b",
            r"\bwhat happens\b", r"\bhow to help\b"
        ])

        if has_pronoun and history and len(history) > 0:
            for turn in reversed(history):
                content = turn.get("content", "").lower()
                if not res_member:
                    res_member = self._extract_target_member(content)
                if not res_entity:
                    res_entity = self.kb.normalize_term(content)
                if res_member or res_entity:
                    break

        return {
            "target_member_name": res_member,
            "canonical_entity": res_entity,
            "aspect": res_aspect
        }

    def _classify_intent(self, msg_lower: str, target_member_name: Optional[str], canonical_entity: Optional[str], aspect: str) -> str:
        # 1. Greetings
        if msg_lower in ["hi", "hello", "hey", "greetings", "good morning", "good evening", "good afternoon"]:
            return INTENT_GREETING

        # 2. General Conversation / Capabilities
        if any(re.search(pat, msg_lower) for pat in [
            r"\bwho\s+are\s+you\b", r"\bwho\s+built\s+you\b", r"\bthank\s+you\b", r"\bthanks\b",
            r"\bwhat\s+can\s+you\s+do\b", r"\bwhat\s+questions\s+can\s+you\s+answer\b"
        ]):
            return INTENT_GENERAL_CONVERSATION

        # 3. Active Health Warnings / Alerts / Risks / Abnormal Results Queries
        alert_risk_pats = [
            r"\bactive\s+warnings\b", r"\bhealth\s+risks\b", r"\brisk\s+warnings\b",
            r"\bactive\s+alerts\b", r"\bany\s+warnings\b", r"\bany\s+alerts\b",
            r"\babnormal\b", r"\bcritical\b", r"\bflagged\b", r"\bwarning\b", r"\bwarnings\b",
            r"\balert\b", r"\balerts\b", r"\brisk\b", r"\brisks\b", r"\bneeds?\s+attention\b",
            r"\bconcerns?\b", r"\bhealth\s+warnings\b"
        ]
        if any(re.search(pat, msg_lower) for pat in alert_risk_pats):
            return INTENT_ABNORMAL_RESULTS

        # 4. Family Members / Profiles Queries
        family_pats = [
            r"\bwho\s+are\s+my\s+family\b", r"\bfamily\s+members\b", r"\blist\s+family\b",
            r"\bhow\s+many\s+family\s+members\b", r"\bwho\s+is\s+.*\b",
            r"\bwho\s+are\s+.*members\b", r"\bmembers\s+in\s+.*family\b", r"\bwho\s+are\s+the\s+family\b",
            r"\bwhat\s+is\s+.*\s+age\b", r"\bis\s+.*\s+male\s+or\s+female\b", r"\bwhat\s+is\s+.*\s+bmi\b",
            r"\bhow\s+is\s+.*\s+health\b"
        ]
        if (any(re.search(pat, msg_lower) for pat in family_pats) or 
            (target_member_name and any(w in msg_lower for w in ["age", "height", "weight", "bmi", "gender", "relation", "who is", "health status", "how is"]) and not canonical_entity and not any(w in msg_lower for w in ["report", "reports", "test", "glucose", "cholesterol", "hemoglobin"]))):
            return INTENT_FAMILY_MEMBERS

        # 5. Report Values Queries ("values in Sarah's latest report", "what are the values")
        report_values_pats = [
            r"\bvalues\s+in\b", r"\bparameters\s+in\b", r"\bresults\s+in\b",
            r"\bwhat\s+are\s+the\s+values\b", r"\blist\s+all\s+parameters\b",
            r"\bblood\s+test\s+results\b"
        ]
        if any(re.search(pat, msg_lower) for pat in report_values_pats) or (target_member_name and any(w in msg_lower for w in ["value", "values", "result", "results", "parameters"]) and not canonical_entity):
            return INTENT_REPORT_VALUES

        # 6. Report List Queries ("how many reports does Sarah have?", "show Sarah's reports", "reports in Sarah profile")
        report_list_pats = [
            r"\bhow\s+many\s+reports\b", r"\bhow\s+many\s+medical\s+reports\b",
            r"\bdo\s+i\s+have\s+any\s+reports\b", r"\bdo\s+we\s+have\s+any\s+reports\b",
            r"\bdoes\s+.*\s+have\s+any\s+reports\b", r"\bwhat\s+reports\s+do\s+i\s+have\b",
            r"\bshow\s+.*reports\b", r"\blatest\s+report\b", r"\blist\s+reports\b",
            r"\bany\s+reports\b", r"\breports?\s+in\s+.*\s+profile\b", r"\breports?\s+does\s+.*\s+have\b",
            r"\bcount\s+reports\b"
        ]
        if any(re.search(pat, msg_lower) for pat in report_list_pats) or (target_member_name and any(w in msg_lower for w in ["report", "reports", "document", "documents"]) and not any(w in msg_lower for w in ["value", "values"])):
            return INTENT_REPORT_LIST

        # 7. Parameter Trend Queries ("how is Sarah's glucose changing?", "has her cholesterol increased?")
        if any(re.search(pat, msg_lower) for pat in [
            r"\btrend\b", r"\bhow\s+is\s+.*\s+changing\b", r"\bhow\s+has\s+.*\s+changed\b",
            r"\bhas\s+.*\s+increased\b", r"\bhas\s+.*\s+decreased\b", r"\bcompare\s+.*across\b"
        ]):
            return INTENT_PARAMETER_TREND

        # 8. Patient-Specific Parameter Value query ("what is Sarah's glucose?")
        if target_member_name and canonical_entity and aspect not in ["prevention", "nutrition"]:
            return INTENT_PARAMETER_VALUE

        # 9. Patient-Specific Advice query ("how can Sarah decrease her glucose?")
        if target_member_name and (aspect in ["prevention", "nutrition"] or "how to" in msg_lower or "how can" in msg_lower):
            return INTENT_PATIENT_SPECIFIC_ADVICE

        # 10. General Medical Question (e.g. "what is haemoglobin", "what is glucose", "how to decrease glucose")
        if not target_member_name and (canonical_entity or aspect in ["symptoms", "nutrition", "low", "causes", "prevention", "function"] or any(w in msg_lower for w in [
            "what", "how", "why", "food", "diet", "symptom", "cause", "reduce", "maintain", "increase", "meaning"
        ])):
            return INTENT_GENERAL_MEDICAL

        return INTENT_UNKNOWN
