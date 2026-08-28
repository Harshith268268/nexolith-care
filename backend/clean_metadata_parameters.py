import os
import sys
import django

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from reports.models import Report, ReportParameter
from alerts.models import Alert
from services.local_medical_extractor import LocalMedicalExtractor

def clean_database():
    extractor = LocalMedicalExtractor()
    print("=== STARTING POSTGRESQL METADATA CLEANUP ===")

    # 1. Clean ReportParameter table
    bad_params = []
    all_params = ReportParameter.objects.all()
    for p in all_params:
        if extractor.is_metadata_term(p.parameter):
            bad_params.append(p.id)

    deleted_param_count, _ = ReportParameter.objects.filter(id__in=bad_params).delete()
    print(f"Deleted {deleted_param_count} ReportParameter record(s) matching metadata terms.")

    # 2. Clean Report.lab_values JSON list
    cleaned_reports = 0
    all_reports = Report.objects.all()
    for r in all_reports:
        if not r.lab_values or not isinstance(r.lab_values, list):
            continue
        
        original_count = len(r.lab_values)
        clean_lab = [item for item in r.lab_values if isinstance(item, dict) and not extractor.is_metadata_term(item.get('parameter', ''))]
        
        if len(clean_lab) != original_count:
            r.lab_values = clean_lab
            r.save()
            r.sync_parameters()
            cleaned_reports += 1
            print(f"Purged {original_count - len(clean_lab)} metadata parameter(s) from Report id={r.id} ('{r.title}').")

    # 3. Clean Alert table
    bad_alerts = []
    all_alerts = Alert.objects.all()
    for a in all_alerts:
        if extractor.is_metadata_term(a.title) or "Age/Gender" in a.title or "Uhid" in a.title or "Age/Gender" in a.description or "UHID" in a.description:
            bad_alerts.append(a.id)

    deleted_alert_count, _ = Alert.objects.filter(id__in=bad_alerts).delete()
    print(f"Deleted {deleted_alert_count} Alert record(s) linked to metadata terms.")

    print("=== POSTGRESQL METADATA CLEANUP COMPLETE ===")

if __name__ == '__main__':
    clean_database()
