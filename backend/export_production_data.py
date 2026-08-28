"""
Nexolith Care - Data Export & Backup Script for Production Migration
Exports all Django database models (Users, Profiles, Family Members, Reports, Parameters, Alerts)
into a structured JSON backup artifact while preserving media file references.
"""

import os
import sys
import json
import django
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.serializers import serialize
from django.contrib.auth.models import User
from accounts.models import UserProfile, EmailOTP, PendingRegistration
from family.models import Family, FamilyMember
from reports.models import Report, ReportParameter
from alerts.models import Alert

def export_data():
    export_dir = BASE_DIR / 'data_exports'
    export_dir.mkdir(parents=True, exist_ok=True)
    backup_file = export_dir / 'production_data_backup.json'
    manifest_file = export_dir / 'production_data_manifest.json'

    print("==================================================")
    print("NEXOLITH CARE — DATA EXPORT & MIGRATION PRESERVATION")
    print("==================================================")

    # Tally existing records
    counts = {
        'users': User.objects.count(),
        'user_profiles': UserProfile.objects.count(),
        'pending_registrations': PendingRegistration.objects.count(),
        'email_otps': EmailOTP.objects.count(),
        'families': Family.objects.count(),
        'family_members': FamilyMember.objects.count(),
        'reports': Report.objects.count(),
        'report_parameters': ReportParameter.objects.count(),
        'alerts': Alert.objects.count(),
    }

    print("Current Database Summary:")
    for model_name, count in counts.items():
        print(f"  • {model_name}: {count} records")

    # Serialize in correct dependency order
    data_to_serialize = [
        User.objects.all(),
        UserProfile.objects.all(),
        PendingRegistration.objects.all(),
        EmailOTP.objects.all(),
        Family.objects.all(),
        FamilyMember.objects.all(),
        Report.objects.all(),
        ReportParameter.objects.all(),
        Alert.objects.all(),
    ]

    combined_objects = []
    for query_set in data_to_serialize:
        serialized_str = serialize('json', query_set, use_natural_foreign_keys=True, use_natural_primary_keys=False)
        combined_objects.extend(json.loads(serialized_str))

    # Write backup data file
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(combined_objects, f, indent=2, ensure_ascii=False)

    # Write manifest file
    manifest = {
        'timestamp': str(django.utils.timezone.now()),
        'total_objects': len(combined_objects),
        'counts': counts,
        'backup_file': str(backup_file.name)
    }

    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    print("\nSUCCESS: Database export completed successfully!")
    print(f"  Backup Archive: {backup_file}")
    print(f"  Backup Manifest: {manifest_file}")
    print(f"  Total Objects Serialized: {len(combined_objects)}")

if __name__ == '__main__':
    export_data()
