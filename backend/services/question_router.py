"""
Question Router & Intent Classifier Service
100% Local NLP intent router and entity extractor for Nexolith Care Local AI Assistant.
Extracts user intent, target family member, parameter name, and query mode without any external APIs.
"""

import re
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Supported Intents
INTENT_GENERAL_GREETING = "GENERAL_GREETING"
INTENT_FAMILY_MEMBERS = "FAMILY_MEMBERS"
INTENT_PROFILE_INFORMATION = "PROFILE_INFORMATION"
INTENT_REPORT_LIST = "REPORT_LIST"
INTENT_REPORT_ANALYSIS = "REPORT_ANALYSIS"
INTENT_REPORT_VALUES = "REPORT_VALUES"
INTENT_PARAMETER_VALUE = "PARAMETER_VALUE"
INTENT_PARAMETER_TREND = "PARAMETER_TREND"
INTENT_ABNORMAL_RESULTS = "ABNORMAL_RESULTS"
INTENT_HEALTH_SUMMARY = "HEALTH_SUMMARY"
INTENT_MEDICAL_GENERAL_QUESTION = "MEDICAL_GENERAL_QUESTION"
INTENT_PATIENT_SPECIFIC_ADVICE = "PATIENT_SPECIFIC_ADVICE"
INTENT_UNKNOWN = "UNKNOWN"

# Parameter catalog regex mappings
CANONICAL_PARAMETERS = {
    "Fasting Glucose": [r"\bfasting\s*glucose\b", r"\bfbs\b", r"\bglucose\b", r"\bblood\s*sugar\b"],
    "HbA1c": [r"\bhba1c\b", r"\ba1c\b", r"\bglycated\s*hemoglobin\b"],
    "Total Cholesterol": [r"\btotal\s*cholesterol\b", r"\bcholesterol\b"],
    "LDL Cholesterol": [r"\bldl\b", r"\bldl\s*cholesterol\b", r"\bbad\s*cholesterol\b"],
    "HDL Cholesterol": [r"\bhdl\b", r"\bhdl\s*cholesterol\b", r"\bgood\s*cholesterol\b"],
    "Triglycerides": [r"\btriglycerides?\b", r"\btrig\b"],
    "Hemoglobin": [r"\bhemoglobin\b", r"\bhgb\b", r"\biron\b"],
    "WBC Count": [r"\bwbc\b", r"\bwhite\s*blood\s*cells?\b", r"\bleukocytes?\b"],
    "Platelets": [r"\bplatelets?\b", r"\bplt\b"],
    "RBC Count": [r"\brbc\b", r"\bred\s*blood\s*cells?\b"],
    "Creatinine": [r"\bcreatinine\b", r"\bkidney\s*function\b"],
    "BUN": [r"\bbun\b", r"\bblood\s*urea\s*nitrogen\b"],
    "ALT (SGPT)": [r"\balt\b", r"\bsgpt\b", r"\bliver\s*enzyme\b"],
    "AST (SGOT)": [r"\bast\b", r"\bsgot\b"],
    "TSH": [r"\btsh\b", r"\bthyroid\b"],
    "Vitamin D": [r"\bvitamin\s*d\b", r"\bvit\s*d\b", r"\b25-oh\s*vitamin\s*d\b"],
    "Vitamin B12": [r"\bvitamin\s*b12\b", r"\bvit\s*b12\b", r"\bb12\b"],
    "Systolic BP": [r"\bsystolic\b"],
    "Diastolic BP": [r"\bdiastolic\b"],
    "Blood Pressure": [r"\bblood\s*pressure\b", r"\bbp\b", r"\bhypertension\b"]
}


class QuestionRouter:
    """
    Local Question Router for intent classification and entity extraction.
    Analyzes message structure to direct queries to appropriate local handlers.
    """

    def analyze_question(self, message: str, known_member_names: List[str] = None) -> Dict[str, Any]:
        msg = message.strip()
        msg_lower = msg.lower()
        known_member_names = known_member_names or []

        # 1. Extract Target Member Entity
        target_member_name = self._extract_target_member(msg_lower, known_member_names)

        # 2. Extract Parameter Entity
        parameter_name = self._extract_parameter_name(msg_lower)

        # 3. Classify Intent
        intent = self._classify_intent(msg_lower, target_member_name, parameter_name)

        return {
            "intent": intent,
            "target_member_name": target_member_name,
            "parameter_name": parameter_name,
            "raw_message": msg,
            "msg_lower": msg_lower
        }

    def _extract_target_member(self, msg_lower: str, known_member_names: List[str]) -> Optional[str]:
        # First match against actual user family members
        for name in known_member_names:
            full_name = name.lower().strip()
            first_name = full_name.split()[0]
            if re.search(r'\b' + re.escape(full_name) + r"(?:'s)?\b", msg_lower) or \
               (len(first_name) >= 2 and re.search(r'\b' + re.escape(first_name) + r"(?:'s)?\b", msg_lower)):
                return name

        # Match name patterns in prompt e.g. "for Sarah", "Sarah's", "about David"
        name_match = re.search(r'\b(?:for|about|is|does|has|of|on|how\s+can|in)\s+([a-zA-Z]{3,})\b', msg_lower)
        if name_match:
            candidate = name_match.group(1).title()
            stop_words = {
                "Any", "The", "Our", "All", "My", "Your", "Reports", "Report", "Lab", "Labs",
                "Document", "Documents", "Glucose", "Blood", "Vitamin", "Thyroid", "Lipid",
                "What", "Show", "List", "Decrease", "Lower", "Improve", "Increase", "Reduce",
                "Help", "Have", "Exist", "Stored", "High", "Low", "Normal", "Diabetes"
            }
            if candidate not in stop_words:
                return candidate

        return None

    def _extract_parameter_name(self, msg_lower: str) -> Optional[str]:
        for canonical, patterns in CANONICAL_PARAMETERS.items():
            for pat in patterns:
                if re.search(pat, msg_lower):
                    return canonical
        return None

    def _classify_intent(self, msg_lower: str, target_member: Optional[str], parameter: Optional[str]) -> str:
        # Check Greetings
        greetings_patterns = [
            r"^(hi|hello|hey|greetings|good\s+morning|good\s+afternoon|good\s+evening)\b",
            r"^(hi|hello|hey|greetings)\s*[!.]*$"
        ]
        if any(re.search(pat, msg_lower) for pat in greetings_patterns):
            return INTENT_GENERAL_GREETING

        # Check Family Members Query
        family_patterns = [
            r"\bwho\s+are\s+(my|our)\s+family\b",
            r"\blist\s+(my|our)\s+family\b",
            r"\bshow\s+(my|our)\s+family\b",
            r"\bfamily\s+members?\b",
            r"\bwho\s+is\s+in\s+my\s+family\b"
        ]
        if any(re.search(pat, msg_lower) for pat in family_patterns):
            return INTENT_FAMILY_MEMBERS

        # Check General Educational Medical Questions
        general_edu_patterns = [
            r"\bwhat\s+is\s+(diabetes|glucose|cholesterol|hypertension|hemoglobin|vitamin\s*d|creatinine|tsh|blood\s*pressure|anemia)\b",
            r"\bhow\s+can\s+(i|we|one)\s+(decrease|lower|reduce|improve|manage|increase)\s+(glucose|blood\s*sugar|cholesterol|blood\s*pressure|bp|creatinine|weight)\b",
            r"\bhow\s+to\s+(decrease|lower|reduce|improve|manage|increase)\s+(glucose|blood\s*sugar|cholesterol|blood\s*pressure|bp|creatinine|weight)\b",
            r"\bwhat\s+causes\s+(high|low)\s+(glucose|blood\s*sugar|cholesterol|blood\s*pressure|creatinine)\b",
            r"\bwhat\s+foods\s+are\s+high\s+in\s+(iron|vitamin\s*d|calcium|protein|fiber)\b",
            r"\bwhy\s+is\s+(hemoglobin|vitamin\s*d|glucose|blood\s*pressure)\s+important\b"
        ]
        if not target_member and any(re.search(pat, msg_lower) for pat in general_edu_patterns):
            return INTENT_MEDICAL_GENERAL_QUESTION

        # Check Patient-Specific Advice Query ("how can Sarah decrease her glucose?")
        patient_advice_patterns = [
            r"\bhow\s+can\s+[a-zA-Z]+\s+(decrease|lower|reduce|improve|manage)\s+",
            r"\bwhat\s+can\s+[a-zA-Z]+\s+do\s+",
            r"\bhow\s+to\s+help\s+[a-zA-Z]+\s+"
        ]
        if target_member and any(re.search(pat, msg_lower) for pat in patient_advice_patterns):
            return INTENT_PATIENT_SPECIFIC_ADVICE

        # Check Parameter Trend Query
        trend_patterns = [
            r"\btrend\b", r"\banalyze\s+.*trend\b", r"\bhow\s+is\s+.*changing\b",
            r"\bover\s+(past|historical|her|his)\s+reports\b", r"\bprogression\b", r"\bhistory\b"
        ]
        if parameter and any(re.search(pat, msg_lower) for pat in trend_patterns):
            return INTENT_PARAMETER_TREND

        # Check Report Values Query ("what are values in it", "can you mention the values in Sarah's report", "list Sarah's report values", "blood test results")
        report_values_patterns = [
            r"\bvalues\b",
            r"\bresults\b",
            r"\bparameters\b",
            r"\bmention\s+.*values\b",
            r"\bwhat\s+(are|were)\s+.*(values|results|parameters|numbers)\b",
            r"\b(list|show|get|give|mention)\s+.*(values|results|parameters|numbers)\b",
            r"\b(all|stored)\s+(values|results|parameters)\b",
            r"\bblood\s+test\s+results\b",
            r"\bshow\s+.*(latest|recent)\s+blood\s+test\b",
            r"\bwhat\s+parameters\b",
            r"\bvalues\s+in\s+it\b"
        ]
        if any(re.search(pat, msg_lower) for pat in report_values_patterns):
            return INTENT_REPORT_VALUES

        # Check Parameter Value Query
        value_patterns = [
            r"\bwhat\s+is\b", r"\bshow\s+.*level\b", r"\bvalue\b", r"\bresult\b", r"\blevel\b"
        ]
        if parameter and (target_member or any(re.search(pat, msg_lower) for pat in value_patterns)):
            return INTENT_PARAMETER_VALUE

        # Check Report Existence / List Query
        report_list_patterns = [
            r"\bdo\s+i\s+have\s+any\s+reports\b",
            r"\bwhat\s+reports\b",
            r"\bshow\s+.*reports\b",
            r"\blist\s+.*reports\b",
            r"\bhow\s+many\s+reports\b",
            r"\bwhen\s+was\s+.*latest\s+report\b",
            r"\breport\s+exists?\b"
        ]
        if any(re.search(pat, msg_lower) for pat in report_list_patterns) or \
           (target_member and any(w in msg_lower for w in ["report", "reports", "document", "documents"])):
            return INTENT_REPORT_LIST

        # Check Abnormal Results Query
        abnormal_patterns = [
            r"\babnormal\b", r"\bcritical\b", r"\bborderline\b", r"\bhigh\s+or\s+low\b", r"\bwarning\b", r"\balert\b"
        ]
        if any(re.search(pat, msg_lower) for pat in abnormal_patterns):
            return INTENT_ABNORMAL_RESULTS

        # Check Health Summary Query
        summary_patterns = [
            r"\bsummary\b", r"\boverall\b", r"\bhealth\s+profile\b", r"\boverview\b"
        ]
        if any(re.search(pat, msg_lower) for pat in summary_patterns):
            return INTENT_HEALTH_SUMMARY

        # Fallback General Education if question contains common health keywords
        if any(k in msg_lower for k in ["diabetes", "glucose", "cholesterol", "blood pressure", "hypertension", "hemoglobin", "vitamin d", "iron", "creatinine", "kidney", "liver"]):
            return INTENT_MEDICAL_GENERAL_QUESTION

        return INTENT_UNKNOWN

