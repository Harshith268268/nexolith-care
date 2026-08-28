"""
Nexolith Care - Data Import & Restore Script for Production Deployment
Imports backup archive (production_data_backup.json) into target PostgreSQL database.
Preserves existing primary keys, foreign key constraints, and compares local vs target counts.
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

from django.core.serializers import deserialize
from django.db import transaction
from django.contrib.auth.models import User
from accounts.models import UserProfile, PendingRegistration, EmailOTP
from family.models import Family, FamilyMember
from reports.models import Report, ReportParameter
from alerts.models import Alert

def import_data(backup_file_path=None):
    if not backup_file_path:
        default_p1 = BASE_DIR / 'data_exports' / 'production_data_backup.json'
        default_p2 = BASE_DIR / 'production_data_backup.json'
        backup_file_path = default_p1 if default_p1.exists() else default_p2
    else:
        backup_file_path = Path(backup_file_path)

    if not backup_file_path.exists():
        print(f"ERROR: Backup file not found at {backup_file_path}")
        sys.exit(1)

    manifest_path = backup_file_path.parent / 'production_data_manifest.json'
    manifest_counts = {}
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r', encoding='utf-8') as mf:
                manifest_counts = json.load(mf).get('counts', {})
        except Exception:
            pass

    print("==================================================")
    print("NEXOLITH CARE — DATA IMPORT & CENTRAL RESTORE")
    print("==================================================")
    print(f"Reading backup archive: {backup_file_path}")

    with open(backup_file_path, 'r', encoding='utf-8') as f:
        data_str = f.read()

    deserialized_objects = list(deserialize('json', data_str, ignorenonexistent=True))
    print(f"Loaded {len(deserialized_objects)} objects from archive. Importing into PostgreSQL...")

    imported_count = 0

    with transaction.atomic():
        for obj in deserialized_objects:
            obj.save()
            imported_count += 1

    # Tally current database counts after import
    current_counts = {
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

    print("\nSUCCESS: All data imported cleanly into target database!")
    print(f"  Total Objects Restored: {imported_count}")
    print("\nDatabase Count Verification (Source Manifest vs Target Database):")
    for key, count in current_counts.items():
        src_val = manifest_counts.get(key, 'N/A')
        print(f"  • {key}: Source = {src_val} | Target DB = {count}")

if __name__ == '__main__':
    target_path = sys.argv[1] if len(sys.argv) > 1 else None
    import_data(target_path)
