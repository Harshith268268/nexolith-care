"""
Local Medical Extractor Service
Extracts medical lab parameter names, numeric values, units, and reference ranges
from PDF tables (pdfplumber) and OCR text (pytesseract) using high-precision
clinical regex patterns and token alignment heuristics.
"""

import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Standard Medical Parameter Dictionary mapping canonical names to regex patterns & default bounds
CANONICAL_PARAM_CATALOG = [
    {
        "canonical": "Fasting Glucose",
        "patterns": [r"fasting\s*glucose", r"fbs", r"plasma\s*glucose", r"blood\s*sugar"],
        "default_unit": "mg/dL",
        "default_range": "70-99",
        "lower": 70.0,
        "upper": 99.0
    },
    {
        "canonical": "HbA1c",
        "patterns": [r"hba1c", r"glycated\s*hemoglobin", r"hemoglobin\s*a1c", r"a1c"],
        "default_unit": "%",
        "default_range": "4.0-5.6",
        "lower": 4.0,
        "upper": 5.6
    },
    {
        "canonical": "Total Cholesterol",
        "patterns": [r"total\s*cholesterol", r"cholesterol,\s*total", r"cholesterol"],
        "default_unit": "mg/dL",
        "default_range": "125-199",
        "lower": 125.0,
        "upper": 199.0
    },
    {
        "canonical": "LDL Cholesterol",
        "patterns": [r"ldl\s*cholesterol", r"ldl-c", r"ldl", r"bad\s*cholesterol"],
        "default_unit": "mg/dL",
        "default_range": "50-99",
        "lower": 50.0,
        "upper": 99.0
    },
    {
        "canonical": "HDL Cholesterol",
        "patterns": [r"hdl\s*cholesterol", r"hdl-c", r"hdl", r"good\s*cholesterol"],
        "default_unit": "mg/dL",
        "default_range": "40-75",
        "lower": 40.0,
        "upper": 75.0
    },
    {
        "canonical": "Triglycerides",
        "patterns": [r"triglycerides", r"triglyceride", r"trig"],
        "default_unit": "mg/dL",
        "default_range": "50-149",
        "lower": 50.0,
        "upper": 149.0
    },
    {
        "canonical": "Hemoglobin",
        "patterns": [r"hemoglobin", r"\bhb\b", r"hgb"],
        "default_unit": "g/dL",
        "default_range": "13.0-17.0",
        "lower": 13.0,
        "upper": 17.0
    },
    {
        "canonical": "WBC Count",
        "patterns": [r"wbc", r"white\s*blood\s*cell", r"leukocyte"],
        "default_unit": "10^3/uL",
        "default_range": "4.5-11.0",
        "lower": 4.5,
        "upper": 11.0
    },
    {
        "canonical": "Platelets",
        "patterns": [r"platelet", r"plt", r"thrombocyte"],
        "default_unit": "10^3/uL",
        "default_range": "150-450",
        "lower": 150.0,
        "upper": 450.0
    },
    {
        "canonical": "RBC Count",
        "patterns": [r"rbc", r"red\s*blood\s*cell", r"erythrocyte"],
        "default_unit": "10^6/uL",
        "default_range": "4.2-5.8",
        "lower": 4.2,
        "upper": 5.8
    },
    {
        "canonical": "Creatinine",
        "patterns": [r"creatinine", r"serum\s*creatinine"],
        "default_unit": "mg/dL",
        "default_range": "0.6-1.2",
        "lower": 0.6,
        "upper": 1.2
    },
    {
        "canonical": "BUN",
        "patterns": [r"bun\b", r"blood\s*urea\s*nitrogen", r"urea"],
        "default_unit": "mg/dL",
        "default_range": "7.0-20.0",
        "lower": 7.0,
        "upper": 20.0
    },
    {
        "canonical": "ALT (SGPT)",
        "patterns": [r"alt\b", r"sgpt", r"alanine\s*aminotransferase"],
        "default_unit": "U/L",
        "default_range": "7.0-45.0",
        "lower": 7.0,
        "upper": 45.0
    },
    {
        "canonical": "AST (SGOT)",
        "patterns": [r"ast\b", r"sgot", r"aspartate\s*aminotransferase"],
        "default_unit": "U/L",
        "default_range": "8.0-40.0",
        "lower": 8.0,
        "upper": 40.0
    },
    {
        "canonical": "TSH",
        "patterns": [r"tsh", r"thyroid\s*stimulating\s*hormone"],
        "default_unit": "mIU/L",
        "default_range": "0.4-4.0",
        "lower": 0.4,
        "upper": 4.0
    },
    {
        "canonical": "Vitamin D",
        "patterns": [r"vitamin\s*d", r"25-oh\s*vitamin\s*d", r"calcidiol"],
        "default_unit": "ng/mL",
        "default_range": "30-100",
        "lower": 30.0,
        "upper": 100.0
    },
    {
        "canonical": "Vitamin B12",
        "patterns": [r"vitamin\s*b12", r"b12", r"cobalamin"],
        "default_unit": "pg/mL",
        "default_range": "200-900",
        "lower": 200.0,
        "upper": 900.0
    },
    {
        "canonical": "Systolic BP",
        "patterns": [r"systolic", r"systolic\s*bp"],
        "default_unit": "mmHg",
        "default_range": "90-119",
        "lower": 90.0,
        "upper": 119.0
    },
    {
        "canonical": "Diastolic BP",
        "patterns": [r"diastolic", r"diastolic\s*bp"],
        "default_unit": "mmHg",
        "default_range": "60-79",
        "lower": 60.0,
        "upper": 79.0
    },
    {
        "canonical": "Calcium",
        "patterns": [r"calcium", r"serum\s*calcium"],
        "default_unit": "mg/dL",
        "default_range": "8.5-10.2",
        "lower": 8.5,
        "upper": 10.2
    },
    {
        "canonical": "Potassium",
        "patterns": [r"potassium", r"serum\s*potassium"],
        "default_unit": "mEq/L",
        "default_range": "3.5-5.1",
        "lower": 3.5,
        "upper": 5.1
    },
    {
        "canonical": "Sodium",
        "patterns": [r"sodium", r"serum\s*sodium"],
        "default_unit": "mEq/L",
        "default_range": "135-145",
        "lower": 135.0,
        "upper": 145.0
    }
]


class LocalMedicalExtractor:
    """
    Parses OCR text or structured PDF table outputs into standardized lab parameter dictionaries.
    """

    def parse_document(self, text_or_tables: str) -> List[Dict[str, Any]]:
        """
        Main extraction entry point. Returns a list of structured lab items:
        [
          {
            "parameter": "Hemoglobin",
            "value": 14.2,
            "unit": "g/dL",
            "range": "13.0-17.0",
            "lower_bound": 13.0,
            "upper_bound": 17.0
          }, ...
        ]
        """
        extracted = []
        seen_canonicals = set()

        if not text_or_tables:
            return extracted

        lines = [line.strip() for line in text_or_tables.split("\n") if line.strip()]

        # Strategy 1: Match against Canonical Catalog using line context
        for spec in CANONICAL_PARAM_CATALOG:
            canonical_name = spec["canonical"]
            if canonical_name in seen_canonicals:
                continue

            item = self._find_spec_in_lines(spec, lines)
            if item:
                extracted.append(item)
                seen_canonicals.add(canonical_name)

        # Strategy 2: Fallback Regex for unknown lab parameters
        generic_items = self._extract_generic_patterns(lines, seen_canonicals)
        for item in generic_items:
            extracted.append(item)

        logger.info(f"LocalMedicalExtractor extracted {len(extracted)} lab parameters.")
        return extracted

    def _find_spec_in_lines(self, spec: Dict[str, Any], lines: List[str]) -> Optional[Dict[str, Any]]:
        """
        Searches document lines for a match with parameter patterns and extracts numerical value, unit, range.
        """
        patterns = spec["patterns"]
        for line in lines:
            line_clean = line.replace("|", " ").replace("  ", " ")
            for pat in patterns:
                if re.search(pat, line_clean, re.IGNORECASE):
                    # Found parameter line! Extract numbers
                    numbers = re.findall(r"[-+]?\d*\.\d+|\d+", line_clean)
                    if not numbers:
                        continue

                    # Filter out numbers that look like dates or years if multiple numbers present
                    valid_nums = [float(n) for n in numbers if float(n) < 10000]
                    if not valid_nums:
                        continue

                    # The result value is typically the first number after parameter name
                    val = valid_nums[0]

                    # Extract unit if present
                    unit_match = re.search(r"(mg/dL|g/dL|10\^3/uL|10\^6/uL|%|mIU/L|ng/mL|pg/mL|mmHg|U/L|mEq/L|mmol/L)", line_clean, re.IGNORECASE)
                    unit = unit_match.group(1) if unit_match else spec["default_unit"]

                    # Extract range if present in line e.g. "13.0 - 17.0" or "70-99"
                    range_match = re.search(r"(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)", line_clean)
                    if range_match:
                        lower_b = float(range_match.group(1))
                        upper_b = float(range_match.group(2))
                        range_str = f"{lower_b}-{upper_b}"
                    else:
                        lower_b = spec["lower"]
                        upper_b = spec["upper"]
                        range_str = spec["default_range"]

                    return {
                        "parameter": spec["canonical"],
                        "value": str(val),
                        "numeric_value": val,
                        "unit": unit,
                        "range": range_str,
                        "lower_bound": lower_b,
                        "upper_bound": upper_b
                    }

        return None

    def _extract_generic_patterns(self, lines: List[str], seen: set) -> List[Dict[str, Any]]:
        """
        Extracts generic lab parameter rows e.g. "Creatinine 1.1 mg/dL 0.6-1.2".
        """
        generics = []
        pattern = re.compile(
            r'([A-Za-z][A-Za-z\s\-/()]{2,30}?)\s*[:|]\s*'
            r'(\d+\.?\d*)\s*'
            r'([A-Za-z/%μ^0-9]+)?\s*'
            r'([\d.]+\s*[-–]\s*[\d.]+)?',
            re.IGNORECASE
        )

        for line in lines:
            line_clean = line.strip()
            match = pattern.search(line_clean)
            if match:
                param_raw, val_raw, unit_raw, range_raw = match.groups()
                param_name = param_raw.strip()

                if param_name.lower() in [s.lower() for s in seen] or len(param_name) < 3:
                    continue

                try:
                    num_val = float(val_raw)
                except ValueError:
                    continue

                unit = unit_raw.strip() if unit_raw else "units"
                if range_raw:
                    r_match = re.search(r"(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)", range_raw)
                    if r_match:
                        l_b = float(r_match.group(1))
                        u_b = float(r_match.group(2))
                        range_str = f"{l_b}-{u_b}"
                    else:
                        l_b = num_val * 0.8
                        u_b = num_val * 1.2
                        range_str = range_raw
                else:
                    l_b = num_val * 0.8
                    u_b = num_val * 1.2
                    range_str = f"{round(l_b, 1)}-{round(u_b, 1)}"

                generics.append({
                    "parameter": param_name.title(),
                    "value": str(num_val),
                    "numeric_value": num_val,
                    "unit": unit,
                    "range": range_str,
                    "lower_bound": l_b,
                    "upper_bound": u_b
                })
                seen.add(param_name)

        return generics
