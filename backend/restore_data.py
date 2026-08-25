import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from family.models import Family, FamilyMember
from reports.models import Report

user = User.objects.get(username='testfamily')
family, _ = Family.objects.get_or_create(user=user)

members_def = [
    {'name': 'Sarah Jenkins', 'age': 41, 'relation': 'Primary'},
    {'name': 'David Jenkinss', 'age': 45, 'relation': 'Spouse'},
    {'name': 'Emma Jenkins', 'age': 18, 'relation': 'Dependent'},
    {'name': 'janedoe', 'age': 22, 'relation': 'Dependent'},
    {'name': 'john jeckins', 'age': 75, 'relation': 'Parent'}
]

m_objs = {}
for m in members_def:
    member, _ = FamilyMember.objects.get_or_create(
        family=family,
        name=m['name'],
        defaults={'age': m['age'], 'relation': m['relation'], 'avatar_url': ''}
    )
    # Strip any profile picture/avatar URL
    member.avatar_url = ''
    member.save()
    m_objs[m['name']] = member

print('Restored Family Members (no avatar images):')
for m in FamilyMember.objects.filter(family=family):
    print(f" - ID {m.id}: {m.name} ({m.relation}, {m.age} yrs), avatarUrl='{m.avatar_url}'")

# Restore reports for each member matching user's exact screenshot dates & health statuses
reports_def = [
    {
        'member': m_objs['Sarah Jenkins'],
        'title': 'Comprehensive Metabolic Panel',
        'date': '2026-05-18',
        'type': 'Blood',
        'abnormality': 'Borderline',
        'summary': 'Metabolic panel results show borderline elevation in fasting glucose.',
        'doctor_notes': 'Monitor diet and recheck in 3 months.'
    },
    {
        'member': m_objs['David Jenkinss'],
        'title': 'Lipid Panel',
        'date': '2026-05-18',
        'type': 'Blood',
        'abnormality': 'Critical',
        'summary': 'Cholesterol levels are significantly elevated. High LDL.',
        'doctor_notes': 'Initiated statin therapy.'
    },
    {
        'member': m_objs['Emma Jenkins'],
        'title': 'Chest X-Ray',
        'date': '2023-08-10',
        'type': 'Imaging',
        'abnormality': 'Normal',
        'summary': 'Clear lungs. No signs of infection.',
        'doctor_notes': ''
    },
    {
        'member': m_objs['janedoe'],
        'title': 'Annual Physical Bloodwork',
        'date': '2026-05-18',
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'All vital health indicators within standard healthy reference ranges.',
        'doctor_notes': ''
    },
    {
        'member': m_objs['john jeckins'],
        'title': 'HbA1c & Fasting Glucose',
        'date': '2026-08-24',
        'type': 'Blood',
        'abnormality': 'Normal',
        'summary': 'Glycemic control is well managed.',
        'doctor_notes': ''
    }
]

for r in reports_def:
    Report.objects.get_or_create(member=r['member'], title=r['title'], defaults=r)

print('Restoration complete! All 5 family profiles and medical records restored with avatar images removed.')
