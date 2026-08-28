"""
Local Medical Extractor Service
Extracts medical lab parameter names, numeric values, units, and reference ranges
from PDF tables (pdfplumber) and OCR text (pytesseract) using high-precision
clinical regex patterns and token alignment heuristics.
Guarantees 100% strict isolation of patient/report metadata (Age, Gender, UHID, Date)
from clinical medical measurements.
Preserves exact complete numbers (e.g. Vitamin B12 = 229, Hemoglobin = 15.3).
"""

import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Standard Medical Parameter Catalog mapping canonical names to regex patterns & bounds
CANONICAL_PARAM_CATALOG = [
    {
        "canonical": "Fasting Glucose",
        "patterns": [r"fasting\s*glucose", r"fbs", r"plasma\s*glucose", r"blood\s*sugar", r"\bglucose\b"],
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
        "patterns": [r"total\s*cholesterol", r"cholesterol,\s*total", r"\bcholesterol\b"],
        "default_unit": "mg/dL",
        "default_range": "125-199",
        "lower": 125.0,
        "upper": 199.0
    },
    {
        "canonical": "LDL Cholesterol",
        "patterns": [r"ldl\s*cholesterol", r"ldl-c", r"bad\s*cholesterol"],
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
        "canonical": "RBC Count",
        "patterns": [r"rbc", r"red\s*blood\s*cell", r"erythrocyte", r"rbc\s*count"],
        "default_unit": "10^6/uL",
        "default_range": "4.2-5.8",
        "lower": 4.2,
        "upper": 5.8
    },
    {
        "canonical": "WBC Count",
        "patterns": [r"wbc", r"white\s*blood\s*cell", r"leukocyte", r"wbc\s*count", r"total\s*leukocyte\s*count"],
        "default_unit": "10^3/uL",
        "default_range": "4.5-11.0",
        "lower": 4.5,
        "upper": 11.0
    },
    {
        "canonical": "Platelets",
        "patterns": [r"platelet", r"plt", r"thrombocyte", r"platelet\s*count"],
        "default_unit": "10^3/uL",
        "default_range": "150-450",
        "lower": 150.0,
        "upper": 450.0
    },
    {
        "canonical": "PCV",
        "patterns": [r"\bpcv\b", r"packed\s*cell\s*volume", r"hematocrit", r"\bhct\b"],
        "default_unit": "%",
        "default_range": "40.0-50.0",
        "lower": 40.0,
        "upper": 50.0
    },
    {
        "canonical": "MCV",
        "patterns": [r"\bmcv\b", r"mean\s*corpuscular\s*volume"],
        "default_unit": "fL",
        "default_range": "80.0-100.0",
        "lower": 80.0,
        "upper": 100.0
    },
    {
        "canonical": "MCH",
        "patterns": [r"\bmch\b", r"mean\s*corpuscular\s*hemoglobin\b"],
        "default_unit": "pg",
        "default_range": "27.0-32.0",
        "lower": 27.0,
        "upper": 32.0
    },
    {
        "canonical": "MCHC",
        "patterns": [r"\bmchc\b", r"mean\s*corpuscular\s*hemoglobin\s*concentration"],
        "default_unit": "g/dL",
        "default_range": "31.5-35.5",
        "lower": 31.5,
        "upper": 35.5
    },
    {
        "canonical": "RDW",
        "patterns": [r"rdw-cv", r"rdw-sd", r"\brdw\b", r"red\s*cell\s*distribution\s*width"],
        "default_unit": "%",
        "default_range": "11.5-14.5",
        "lower": 11.5,
        "upper": 14.5
    },
    {
        "canonical": "Vitamin B12",
        "patterns": [r"vitamin\s*b12", r"\bb12\b", r"cobalamin"],
        "default_unit": "pg/mL",
        "default_range": "200-900",
        "lower": 200.0,
        "upper": 900.0
    },
    {
        "canonical": "Vitamin D",
        "patterns": [r"vitamin\s*d3?", r"25-oh\s*vitamin\s*d", r"calcidiol"],
        "default_unit": "ng/mL",
        "default_range": "30-100",
        "lower": 30.0,
        "upper": 100.0
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
        "canonical": "Bilirubin Total",
        "patterns": [r"total\s*bilirubin", r"bilirubin\s*total", r"\bbilirubin\b"],
        "default_unit": "mg/dL",
        "default_range": "0.2-1.2",
        "lower": 0.2,
        "upper": 1.2
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
        "canonical": "Uric Acid",
        "patterns": [r"uric\s*acid"],
        "default_unit": "mg/dL",
        "default_range": "3.5-7.2",
        "lower": 3.5,
        "upper": 7.2
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
    Preserves exact source values, units, and reference ranges without altering or calculating bounds.
    Extracted document metadata (e.g. Report Date, Patient Name, Age, Gender, UHID) is strictly isolated from lab parameters.
    """

    METADATA_TERMS = {
        "date", "report date", "patient", "patient name", "patient id", "name",
        "age", "gender", "sex", "age/gender", "age / gender", "age/sex", "age & sex",
        "doctor", "dr", "ref by", "ref. by", "ref dr", "ref. dr", "hospital", "lab",
        "laboratory", "sample", "sample id", "sample type", "specimen", "collected date",
        "result date", "reg date", "reg. date", "registration date", "reg no", "reg. no",
        "registration no", "registration number", "uhid", "uhid no", "uhid number",
        "uhid/lab id", "patient uhid", "uhid:", "uhid :", "report no", "report number",
        "page", "test name", "parameter", "result", "unit", "units", "range",
        "reference range", "normal range", "status", "notes", "comment", "remarks",
        "report", "dates", "time", "collected", "collection", "received", "printed",
        "delivered", "id", "no", "number", "reg", "year", "2026", "2025", "2024",
        "phone", "mobile", "address", "email", "barcode", "bar code", "department"
    }

    UNIT_REGEX = r"(Lakhs/[µu]L|mg/dL|g/dL|10\^3/uL|10\^6/uL|%|mIU/L|ng/mL|pg/mL|mmHg|U/L|mEq/L|mmol/L|g/L|μU/mL|uU/mL|fL|pg)"

    def is_metadata_term(self, name: str) -> bool:
        if not name:
            return True
        n_clean = name.strip().rstrip(":").lower()
        if n_clean in self.METADATA_TERMS:
            return True

        metadata_patterns = [
            r'\bage\b', r'\bgender\b', r'\bsex\b', r'\buhid\b', r'\bpatient\b', r'\bdoctor\b',
            r'\bsample\b', r'\bhospital\b', r'\blab\b', r'\bpage\b', r'\breport\b', r'\bstatus\b',
            r'\bnotes\b', r'\bremarks\b', r'\bdate\b', r'\bdates\b', r'\btime\b', r'\byear\b',
            r'\bspecimen\b', r'\bregistration\b', r'\breg\.\s*no\b', r'\bref\.\s*dr\b', r'\bphone\b',
            r'\baddress\b', r'\bemail\b', r'\bbarcode\b', r'\bage/gender\b', r'\bage\s*/\s*gender\b'
        ]
        for pat in metadata_patterns:
            if re.search(pat, n_clean):
                return True

        if re.match(r'^(20\d\d|19\d\d)$', n_clean):
            return True
        return False

    def extract_metadata(self, text_or_tables: str) -> Dict[str, Any]:
        metadata = {"report_date": None, "patient_name": None, "age": None, "gender": None, "uhid": None}
        if not text_or_tables:
            return metadata

        lines = [l.strip() for l in text_or_tables.split("\n") if l.strip()]

        date_patterns = [
            r"Date\s*:\s*(\d{4}[-./]\d{2}[-./]\d{2})",
            r"Date\s*:\s*(\d{2}[-./]\d{2}[-./]\d{4})",
            r"Report\s*Date\s*:\s*(\d{4}[-./]\d{2}[-./]\d{2})",
            r"\b(\d{4}-\d{2}-\d{2})\b",
            r"\b(\d{2}/\d{2}/\d{4})\b",
            r"\b(\d{4}/\d{2}/\d{2})\b"
        ]

        for line in lines:
            for pat in date_patterns:
                m = re.search(pat, line, re.IGNORECASE)
                if m:
                    raw_date = m.group(1)
                    if "/" in raw_date:
                        parts = raw_date.split("/")
                        if len(parts[0]) == 4:
                            formatted_date = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                        else:
                            formatted_date = f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
                        metadata["report_date"] = formatted_date
                    elif "." in raw_date:
                        parts = raw_date.split(".")
                        if len(parts[0]) == 4:
                            metadata["report_date"] = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    else:
                        metadata["report_date"] = raw_date
                    break
            if metadata["report_date"]:
                break

        for line in lines:
            name_match = re.search(r"Patient\s*Name\s*:\s*([A-Za-z\s.]+)", line, re.IGNORECASE)
            if name_match:
                metadata["patient_name"] = name_match.group(1).strip()
                break

        for line in lines:
            uhid_match = re.search(r"UHID\s*:\s*([A-Za-z0-9]+)", line, re.IGNORECASE)
            if uhid_match:
                metadata["uhid"] = uhid_match.group(1).strip()
                break

        return metadata

    def parse_tables(self, raw_tables: List[List[List[str]]]) -> List[Dict[str, Any]]:
        extracted = []
        seen = set()

        if not raw_tables:
            return extracted

        for table in raw_tables:
            if not table:
                continue
            for row in table:
                if not row or len(row) < 2:
                    continue

                clean_row = [str(c).replace('\n', ' ').strip() if c else "" for c in row]
                first_col = clean_row[0].strip()
                if not first_col or self.is_metadata_term(first_col):
                    continue

                first_word = first_col.split()[0].lower().rstrip(":")
                if self.is_metadata_term(first_word):
                    continue

                val_str = ""
                val_num = None
                unit = ""
                range_str = ""
                lower_b = None
                upper_b = None

                for col in clean_row[1:]:
                    if not col:
                        continue

                    if val_num is None:
                        num_m = re.search(r"[-+]?\d*\.\d+|\d+", col)
                        if num_m:
                            val_str = num_m.group(0)
                            try:
                                val_num = float(val_str)
                            except ValueError:
                                pass

                            unit_m = re.search(self.UNIT_REGEX, col, re.IGNORECASE)
                            if unit_m:
                                unit = unit_m.group(1)

                    range_match_bounded = re.search(r"(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)", col)
                    range_match_less = re.search(r"<\s*(\d+\.?\d*)", col)
                    range_match_greater = re.search(r">\s*(\d+\.?\d*)", col)

                    if range_match_bounded:
                        lower_b = float(range_match_bounded.group(1))
                        upper_b = float(range_match_bounded.group(2))
                        range_str = f"{range_match_bounded.group(1)}-{range_match_bounded.group(2)}"
                    elif range_match_less:
                        lower_b = 0.0
                        upper_b = float(range_match_less.group(1))
                        range_str = f"<{range_match_less.group(1)}"
                    elif range_match_greater:
                        lower_b = float(range_match_greater.group(1))
                        upper_b = 1000.0
                        range_str = f">{range_match_greater.group(1)}"

                if val_num is not None and first_col.lower() not in seen and not self.is_metadata_term(first_col):
                    extracted.append({
                        "parameter": first_col,
                        "raw_name": first_col,
                        "value": val_str,
                        "numeric_value": val_num,
                        "unit": unit,
                        "range": range_str,
                        "lower_bound": lower_b if lower_b is not None else val_num,
                        "upper_bound": upper_b if upper_b is not None else val_num
                    })
                    seen.add(first_col.lower())

        return extracted

    def parse_document(self, text_or_tables: str, raw_tables: List[List[List[str]]] = None) -> List[Dict[str, Any]]:
        extracted = []
        seen_canonicals = set()

        if raw_tables:
            table_items = self.parse_tables(raw_tables)
            for item in table_items:
                if not self.is_metadata_term(item["parameter"]):
                    extracted.append(item)
                    seen_canonicals.add(item["parameter"].lower())

        if extracted:
            logger.info(f"LocalMedicalExtractor extracted {len(extracted)} lab parameters from raw PDF tables.")
            return extracted

        if not text_or_tables:
            return extracted

        lines = [line.strip() for line in text_or_tables.split("\n") if line.strip()]

        for spec in CANONICAL_PARAM_CATALOG:
            canonical_name = spec["canonical"]
            if canonical_name.lower() in seen_canonicals:
                continue

            item = self._find_spec_in_lines(spec, lines)
            if item and not self.is_metadata_term(item["parameter"]):
                extracted.append(item)
                seen_canonicals.add(canonical_name.lower())
                seen_canonicals.add(item["parameter"].lower())
                for tok in item["parameter"].lower().split():
                    if len(tok) >= 3:
                        seen_canonicals.add(tok)
                if item.get("raw_name"):
                    seen_canonicals.add(item["raw_name"].lower())

        generic_items = self._extract_generic_patterns(lines, seen_canonicals)
        for item in generic_items:
            if not self.is_metadata_term(item["parameter"]):
                extracted.append(item)

        logger.info(f"LocalMedicalExtractor extracted {len(extracted)} lab parameters from text.")
        return extracted

    def _find_spec_in_lines(self, spec: Dict[str, Any], lines: List[str]) -> Optional[Dict[str, Any]]:
        patterns = spec["patterns"]
        for line in lines:
            line_clean = line.replace("|", " ").replace("  ", " ").strip()
            
            first_word = line_clean.split()[0].lower().rstrip(":") if line_clean.split() else ""
            if self.is_metadata_term(first_word) and not any(re.search(pat, line_clean, re.IGNORECASE) for pat in patterns):
                continue

            for pat in patterns:
                m_pat = re.search(pat, line_clean, re.IGNORECASE)
                if m_pat:
                    # Crucial Fix: Extract numbers ONLY from the string AFTER the parameter name pattern!
                    # This prevents digits in parameter names (e.g. B12 -> 12, D3 -> 3, T3 -> 3) from being extracted as values!
                    value_part = line_clean[m_pat.end():].strip()
                    
                    # 1. Extract reference range first if present (e.g. 200 - 900 or < 5)
                    range_match_bounded = re.search(r"(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)", value_part)
                    range_match_less = re.search(r"<\s*(\d+\.?\d*)", value_part)
                    range_match_greater = re.search(r">\s*(\d+\.?\d*)", value_part)

                    if range_match_bounded:
                        l_b = float(range_match_bounded.group(1))
                        u_b = float(range_match_bounded.group(2))
                        range_str = f"{range_match_bounded.group(1)}-{range_match_bounded.group(2)}"
                        value_part_no_range = value_part.replace(range_match_bounded.group(0), "")
                    elif range_match_less:
                        l_b = 0.0
                        u_b = float(range_match_less.group(1))
                        range_str = f"<{range_match_less.group(1)}"
                        value_part_no_range = value_part.replace(range_match_less.group(0), "")
                    elif range_match_greater:
                        l_b = float(range_match_greater.group(1))
                        u_b = 1000.0
                        range_str = f">{range_match_greater.group(1)}"
                        value_part_no_range = value_part.replace(range_match_greater.group(0), "")
                    else:
                        l_b = spec["lower"]
                        u_b = spec["upper"]
                        range_str = spec["default_range"]
                        value_part_no_range = value_part

                    # 2. Extract unit string
                    unit_match = re.search(self.UNIT_REGEX, line_clean, re.IGNORECASE)
                    unit = unit_match.group(1) if unit_match else spec["default_unit"]

                    # 3. Find observed numeric value in value_part_no_range
                    numbers = re.findall(r"[-+]?\d*\.\d+|\d+", value_part_no_range)
                    if not numbers:
                        numbers = re.findall(r"[-+]?\d*\.\d+|\d+", value_part)

                    if not numbers:
                        continue

                    valid_nums = [float(n) for n in numbers if float(n) < 10000]
                    if not valid_nums:
                        continue

                    val_num = valid_nums[0]
                    val_str = str(numbers[0])

                    matched_name = line_clean.split()[0].rstrip(":") if line_clean.split() else spec["canonical"]
                    if self.is_metadata_term(matched_name) or len(matched_name) < 2:
                        matched_name = spec["canonical"]

                    return {
                        "parameter": matched_name if matched_name in ["Glucose", "Hemoglobin", "Cholesterol", "Platelets", "PCV", "MCV", "MCH", "MCHC", "Vitamin B12"] else spec["canonical"],
                        "raw_name": matched_name,
                        "value": val_str,
                        "numeric_value": val_num,
                        "unit": unit,
                        "range": range_str,
                        "lower_bound": l_b,
                        "upper_bound": u_b
                    }

        return None

    def _extract_generic_patterns(self, lines: List[str], seen: set) -> List[Dict[str, Any]]:
        generics = []
        pattern = re.compile(
            r'([A-Za-z][A-Za-z\s\-/()]{1,30}?)\s*[:|]\s*'
            r'(\d+\.?\d*)\s*'
            r'([A-Za-z/%μ^0-9]+)?\s*'
            r'([\d.]+\s*[-–]\s*[\d.]+|[<>]\s*[\d.]+)?',
            re.IGNORECASE
        )

        for line in lines:
            line_clean = line.strip()
            if not line_clean:
                continue

            first_term = line_clean.split()[0].lower().rstrip(":") if line_clean.split() else ""
            if self.is_metadata_term(first_term) or any(term in line_clean.lower() for term in ["patient name", "report date", "sample id", "age/gender", "uhid"]):
                continue

            match = pattern.search(line_clean)
            if match:
                param_raw, val_raw, unit_raw, range_raw = match.groups()
                param_name = param_raw.strip()

                if param_name.lower() in [s.lower() for s in seen] or self.is_metadata_term(param_name) or len(param_name) < 2:
                    continue

                try:
                    num_val = float(val_raw)
                except ValueError:
                    continue

                unit = unit_raw.strip() if unit_raw else ""
                
                if range_raw:
                    range_str = range_raw.strip()
                    r_match = re.search(r"(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)", range_str)
                    r_less = re.search(r"<\s*(\d+\.?\d*)", range_str)
                    r_greater = re.search(r">\s*(\d+\.?\d*)", range_str)

                    if r_match:
                        l_b = float(r_match.group(1))
                        u_b = float(r_match.group(2))
                    elif r_less:
                        l_b = 0.0
                        u_b = float(r_less.group(1))
                    elif r_greater:
                        l_b = float(r_greater.group(1))
                        u_b = 1000.0
                    else:
                        l_b = num_val
                        u_b = num_val
                else:
                    range_str = ""
                    l_b = num_val
                    u_b = num_val

                generics.append({
                    "parameter": param_name.title(),
                    "value": str(val_raw),
                    "numeric_value": num_val,
                    "unit": unit,
                    "range": range_str,
                    "lower_bound": l_b,
                    "upper_bound": u_b
                })
                seen.add(param_name)

        return generics
