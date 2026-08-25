"""
Report Trend Engine Service
Analyzes historical lab values chronologically to calculate absolute & percentage changes,
trend directions, and structured trend descriptions.
"""

import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ReportTrendEngine:
    """
    Calculates parameter progression over time from stored reports.
    """

    def analyze_parameter_trend(self, member_name: str, parameter_name: str, historical_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        historical_records: List of dicts e.g. [{"date": "2026-01-10", "value": 105, "unit": "mg/dL", "title": "Lab 1", "status": "Normal"}, ...]
        Sorted by date ascending.
        """
        if not historical_records:
            return {
                "has_trend": False,
                "count": 0,
                "response": f"I don't have any recorded {parameter_name} results for {member_name} in the stored reports."
            }

        # Filter out records where numeric value cannot be parsed
        valid_history = []
        for rec in historical_records:
            val_raw = rec.get("value")
            try:
                num_val = float(re.findall(r'[-+]?\d*\.\d+|\d+', str(val_raw))[0])
                valid_history.append({
                    "date": rec.get("date"),
                    "value": num_val,
                    "unit": rec.get("unit", ""),
                    "title": rec.get("title", "Lab Report"),
                    "status": rec.get("status", "Normal")
                })
            except (IndexError, ValueError):
                continue

        if len(valid_history) == 0:
            return {
                "has_trend": False,
                "count": 0,
                "response": f"I don't have any valid numeric {parameter_name} measurements for {member_name} in the stored reports."
            }

        if len(valid_history) == 1:
            item = valid_history[0]
            return {
                "has_trend": False,
                "count": 1,
                "latest": item,
                "response": f"There is only 1 recorded {parameter_name} result for {member_name} ({item['value']} {item['unit']} on {item['date']}). At least two reports are required to calculate a historical trend."
            }

        # Sort chronologically by date
        valid_history.sort(key=lambda x: str(x["date"]))

        first_rec = valid_history[0]
        latest_rec = valid_history[-1]
        prev_rec = valid_history[-2]

        first_val = first_rec["value"]
        latest_val = latest_rec["value"]
        unit = latest_rec["unit"]

        diff = round(latest_val - first_val, 2)
        if first_val > 0:
            pct_change = round(((latest_val - first_val) / first_val) * 100, 1)
        else:
            pct_change = 0.0

        if diff > 0:
            direction = "increasing"
            direction_desc = f"an upward trend of +{diff} {unit} (+{abs(pct_change)}%)"
        elif diff < 0:
            direction = "decreasing"
            direction_desc = f"a downward trend of {diff} {unit} (-{abs(pct_change)}%)"
        else:
            direction = "stable"
            direction_desc = f"stable levels at {latest_val} {unit}"

        table_rows = [f"- **{rec['date']}**: {rec['value']} {rec['unit']} — Status: **{rec['status']}** ('{rec['title']}')" for rec in valid_history]
        table_str = "\n".join(table_rows)

        summary_response = (
            f"### {member_name}'s {parameter_name} Trend Analysis ({len(valid_history)} measurements)\n\n"
            f"{table_str}\n\n"
            f"**Trend Observation:** {parameter_name} shows **{direction_desc}** from {first_rec['date']} ({first_val} {unit}) to {latest_rec['date']} ({latest_val} {unit})."
        )

        return {
            "has_trend": True,
            "count": len(valid_history),
            "direction": direction,
            "diff": diff,
            "pct_change": pct_change,
            "response": summary_response
        }
