import logging
from datetime import date
from family.models import FamilyMember
from .models import Alert
from services.local_medical_extractor import LocalMedicalExtractor

logger = logging.getLogger(__name__)

class MedicalAlertGenerator:
    """
    Scans lab parameters for critical or borderline values
    and automatically generates persistent, actionable alerts in the database.
    Strictly filters out patient/report metadata terms.
    """

    def generate_alerts_for_report(self, report) -> int:
        logger.info(f"MedicalAlertGenerator scanning parameters for report: {report.title}...")
        
        lab_values = report.lab_values or []
        member = report.member
        report_date = report.date or date.today()
        created_count = 0
        extractor = LocalMedicalExtractor()

        for item in lab_values:
            param = item.get('parameter', '').strip()
            val = item.get('value', '')
            unit = item.get('unit', '')
            status = item.get('status', 'Normal')

            if not param or extractor.is_metadata_term(param):
                continue

            if status not in ['Borderline', 'Critical']:
                continue

            title = ""
            desc = ""
            alert_type = "Alert"

            # 1. Parameter trigger mapping
            param_lower = param.lower()
            if 'glucose' in param_lower or 'hba1c' in param_lower:
                title = "Diabetes Risk Alert"
                desc = f"Elevated glucose levels detected ({val} {unit}) in report '{report.title}'. This suggests a potential risk of hyperglycemia or insulin resistance. We recommend limiting sugars and consulting an endocrinologist."
            elif 'ldl' in param_lower or 'cholesterol' in param_lower:
                title = "Cardiovascular Risk Alert"
                desc = f"High lipid profile levels detected ({val} {unit}) in report '{report.title}'. Elevated LDL/Cholesterol increases cardiovascular risk. The AI recommends increasing aerobic exercise and soluble fiber intake."
            elif 'hemoglobin' in param_lower or 'rbc' in param_lower or 'pcv' in param_lower or 'mcv' in param_lower or 'mch' in param_lower:
                title = "Blood Parameter Warning"
                desc = f"Abnormal blood count parameter detected ({param}: {val} {unit}) in report '{report.title}'. We recommend reviewing complete blood count parameters with your physician."
            elif 'bp' in param_lower or 'systolic' in param_lower or 'diastolic' in param_lower or 'pressure' in param_lower:
                title = "Hypertension Warning"
                desc = f"Abnormal blood pressure levels detected ({val} {unit}) in report '{report.title}'. High blood pressure strains your cardiovascular system. Limit sodium consumption and consult a cardiologist."
            else:
                # General abnormal fallback alert
                title = f"Abnormal Health Alert: {param}"
                desc = f"An abnormal value was detected for parameter '{param}' ({val} {unit}, classified as {status}) in your latest checkup. Please review these parameters with a physician."

            if title:
                # 2. Check for deduplication: don't create multiple identical alerts on the same day
                exists = Alert.objects.filter(
                    member=member,
                    title=title,
                    date=report_date
                ).exists()

                if not exists:
                    Alert.objects.create(
                        member=member,
                        report=report,
                        title=title,
                        description=desc,
                        date=report_date,
                        severity=status,
                        type=alert_type,
                        status="Active"
                    )
                    created_count += 1
                    logger.info(f"Successfully generated automatic {status} alert for member {member.name}: '{title}'")

        return created_count
