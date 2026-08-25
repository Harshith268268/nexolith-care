import os
import django
from datetime import datetime, date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from family.models import Family, FamilyMember
from reports.models import Report

user = User.objects.get(username='testfamily')
family, _ = Family.objects.get_or_create(user=user)

# Map existing members
members = {m.name: m for m in FamilyMember.objects.filter(family=family)}

sarah = members.get('Sarah Jenkins')
david = members.get('David Jenkinss')
emma = members.get('Emma Jenkins')
jane = members.get('janedoe')
john = members.get('john jeckins')

# Clear existing test reports to avoid duplication
Report.objects.filter(member__family=family).delete()

reports_data = [
    # --- Sarah Jenkins (5 Reports) ---
    {
        'member': sarah,
        'title': 'Comprehensive Metabolic Panel',
        'date': date(2026, 5, 18),
        'type': 'Blood',
        'abnormality': 'Borderline',
        'summary': 'Metabolic panel shows mild glucose elevation (104 mg/dL). Kidney and liver markers within reference ranges.',
        'doctor_notes': 'Dietary modifications recommended. Re-evaluate fasting blood sugar in 3 months.',
        'lab_values': [
            {'parameter': 'Glucose', 'value': 104, 'unit': 'mg/dL', 'referenceRange': '70-99', 'status': 'Borderline', 'date': '2026-05-18'},
            {'parameter': 'Calcium', 'value': 9.4, 'unit': 'mg/dL', 'referenceRange': '8.6-10.2', 'status': 'Normal', 'date': '2026-05-18'},
            {'parameter': 'Sodium', 'value': 139, 'unit': 'mEq/L', 'referenceRange': '135-145', 'status': 'Normal', 'date': '2026-05-18'}
        ]
    },
    {
        'member': sarah,
        'title': 'Complete Blood Count (CBC)',
        'date': date(2026, 4, 12),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'White blood cell count, red blood cell count, and platelets are all within healthy range.',
        'doctor_notes': 'Routine screening clean.',
        'lab_values': [
            {'parameter': 'WBC', 'value': 6.5, 'unit': 'k/uL', 'referenceRange': '4.5-11.0', 'status': 'Normal', 'date': '2026-04-12'},
            {'parameter': 'Hemoglobin', 'value': 13.8, 'unit': 'g/dL', 'referenceRange': '12.0-15.5', 'status': 'Normal', 'date': '2026-04-12'}
        ]
    },
    {
        'member': sarah,
        'title': 'Annual Physical Bloodwork',
        'date': date(2025, 10, 10),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'Comprehensive wellness blood test. All liver and kidney enzymes normal.',
        'doctor_notes': 'Patient in good overall health.',
        'lab_values': [
            {'parameter': 'ALT', 'value': 22, 'unit': 'U/L', 'referenceRange': '7-56', 'status': 'Normal', 'date': '2025-10-10'}
        ]
    },
    {
        'member': sarah,
        'title': 'Thyroid Function Panel (TSH)',
        'date': date(2025, 6, 15),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'Thyroid stimulating hormone level is 2.1 mIU/L, indicating normal thyroid health.',
        'doctor_notes': 'No thyroid intervention required.',
        'lab_values': [
            {'parameter': 'TSH', 'value': 2.1, 'unit': 'mIU/L', 'referenceRange': '0.4-4.0', 'status': 'Normal', 'date': '2025-06-15'}
        ]
    },
    {
        'member': sarah,
        'title': 'Lipid & Glucose Assessment',
        'date': date(2024, 11, 20),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'Total cholesterol 185 mg/dL. HDL 58 mg/dL. Normal baseline.',
        'doctor_notes': 'Maintain healthy lifestyle.',
        'lab_values': [
            {'parameter': 'Total Cholesterol', 'value': 185, 'unit': 'mg/dL', 'referenceRange': '<200', 'status': 'Normal', 'date': '2024-11-20'}
        ]
    },

    # --- David Jenkinss (3 Reports) ---
    {
        'member': david,
        'title': 'Lipid Panel',
        'date': date(2026, 5, 18),
        'type': 'Blood',
        'abnormality': 'Critical',
        'summary': 'Total cholesterol 248 mg/dL with elevated LDL (165 mg/dL). High cardiovascular risk.',
        'doctor_notes': 'Started statin therapy. Follow up lipid panel in 60 days.',
        'lab_values': [
            {'parameter': 'Total Cholesterol', 'value': 248, 'unit': 'mg/dL', 'referenceRange': '<200', 'status': 'Critical', 'date': '2026-05-18'},
            {'parameter': 'LDL', 'value': 165, 'unit': 'mg/dL', 'referenceRange': '<100', 'status': 'Critical', 'date': '2026-05-18'}
        ]
    },
    {
        'member': david,
        'title': 'Cardiovascular Risk Screening',
        'date': date(2026, 2, 10),
        'type': 'Blood',
        'abnormality': 'Borderline',
        'summary': 'High sensitivity C-reactive protein slightly elevated. Blood pressure 132/85.',
        'doctor_notes': 'Reduce sodium intake and increase aerobic exercise.',
        'lab_values': [
            {'parameter': 'hs-CRP', 'value': 2.4, 'unit': 'mg/L', 'referenceRange': '<1.0', 'status': 'Borderline', 'date': '2026-02-10'}
        ]
    },
    {
        'member': david,
        'title': 'Routine Bloodwork & EKG',
        'date': date(2025, 9, 22),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'Sinus rhythm on EKG. Baseline metabolic panel clear.',
        'doctor_notes': 'EKG unremarkable.',
        'lab_values': []
    },

    # --- Emma Jenkins (1 Report) ---
    {
        'member': emma,
        'title': 'Chest X-Ray',
        'date': date(2023, 8, 10),
        'type': 'Imaging',
        'abnormality': 'Normal',
        'summary': 'Clear lungs. No signs of infection or lung field opacity.',
        'doctor_notes': 'Pediatric screening clean.',
        'lab_values': []
    },

    # --- janedoe (3 Reports) ---
    {
        'member': jane,
        'title': 'Annual Physical Bloodwork',
        'date': date(2026, 5, 18),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'All blood counts and metabolic parameters strictly within reference ranges.',
        'doctor_notes': 'Patient in excellent health.',
        'lab_values': [
            {'parameter': 'Glucose', 'value': 88, 'unit': 'mg/dL', 'referenceRange': '70-99', 'status': 'Normal', 'date': '2026-05-18'}
        ]
    },
    {
        'member': jane,
        'title': 'Vitamin D & Micronutrient Panel',
        'date': date(2026, 1, 14),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'Vitamin D level is 42 ng/mL (sufficient). Vitamin B12 normal.',
        'doctor_notes': 'Nutritional levels healthy.',
        'lab_values': [
            {'parameter': 'Vitamin D', 'value': 42, 'unit': 'ng/mL', 'referenceRange': '30-100', 'status': 'Normal', 'date': '2026-01-14'}
        ]
    },
    {
        'member': jane,
        'title': 'Comprehensive Health Screening',
        'date': date(2025, 8, 20),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'Baseline wellness evaluation.',
        'doctor_notes': '',
        'lab_values': []
    },

    # --- john jeckins (1 Report) ---
    {
        'member': john,
        'title': 'HbA1c & Fasting Glucose',
        'date': date(2026, 8, 24),
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'HbA1c level is 5.4% (normal). Fasting blood sugar is 92 mg/dL.',
        'doctor_notes': 'Excellent glycemic management.',
        'lab_values': [
            {'parameter': 'HbA1c', 'value': 5.4, 'unit': '%', 'referenceRange': '<5.7', 'status': 'Normal', 'date': '2026-08-24'}
        ]
    }
]

for r in reports_data:
    if r['member']:
        Report.objects.create(**r)

print('Successfully restored all medical reports matching exact screenshot counts:')
for m in FamilyMember.objects.filter(family=family):
    count = Report.objects.filter(member=m).count()
    latest = Report.objects.filter(member=m).order_by('-date').first()
    latest_date = latest.date if latest else 'None'
    print(f" - {m.name}: {count} stored report(s), latest date: {latest_date}")
