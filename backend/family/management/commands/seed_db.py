import json
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from family.models import Family, FamilyMember
from reports.models import Report
from alerts.models import Alert
from datetime import datetime

class Command(BaseCommand):
    help = 'Seeds the database with temporary healthcare data for testing.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting database seed...")

        # 1. Clean up existing data (optional, but good for fresh start)
        User.objects.filter(username='testfamily').delete()
        
        # 2. Create the main user and family
        user = User.objects.create_user(username='testfamily', password='password123')
        family, _ = Family.objects.get_or_create(user=user)

        # 3. Create Family Members
        members_data = [
            {'name': 'Sarah Jenkins', 'age': 42, 'relation': 'Primary', 'avatar_url': 'https://i.pravatar.cc/150?u=sarah'},
            {'name': 'David Jenkins', 'age': 45, 'relation': 'Spouse', 'avatar_url': 'https://i.pravatar.cc/150?u=david'},
            {'name': 'Emma Jenkins', 'age': 12, 'relation': 'Dependent', 'avatar_url': 'https://i.pravatar.cc/150?u=emma'},
            {'name': 'Robert Smith', 'age': 72, 'relation': 'Parent', 'avatar_url': 'https://i.pravatar.cc/150?u=robert'},
        ]
        
        member_objs = {}
        for m in members_data:
            member = FamilyMember.objects.create(family=family, **m)
            # Store by first name lowercase for easy reference below
            member_objs[m['name'].split()[0].lower()] = member

        # 4. Create Reports
        reports_data = [
            {
                'member': member_objs['sarah'],
                'title': 'Comprehensive Metabolic Panel',
                'date': '2023-10-15',
                'type': 'Blood',
                'abnormality': 'Normal',
                'summary': 'Your metabolic panel results are generally within normal limits. Fasting glucose is excellent. Kidney and liver functions appear healthy.',
                'doctor_notes': 'Patient is healthy. Continue current diet and exercise routine.',
                'lab_values': [
                    {'parameter': 'Glucose', 'value': 85, 'unit': 'mg/dL', 'referenceRange': '70-99', 'status': 'Normal', 'date': '2023-10-15'},
                    {'parameter': 'Calcium', 'value': 9.2, 'unit': 'mg/dL', 'referenceRange': '8.6-10.2', 'status': 'Normal', 'date': '2023-10-15'},
                    {'parameter': 'Sodium', 'value': 140, 'unit': 'mEq/L', 'referenceRange': '135-145', 'status': 'Normal', 'date': '2023-10-15'}
                ]
            },
            {
                'member': member_objs['david'],
                'title': 'Lipid Panel',
                'date': '2023-09-22',
                'type': 'Blood',
                'abnormality': 'Borderline',
                'summary': 'Cholesterol levels are slightly elevated. LDL is borderline high. Consider dietary adjustments.',
                'doctor_notes': '',
                'lab_values': [
                    {'parameter': 'Total Cholesterol', 'value': 215, 'unit': 'mg/dL', 'referenceRange': '<200', 'status': 'Borderline', 'date': '2023-09-22'},
                    {'parameter': 'LDL', 'value': 135, 'unit': 'mg/dL', 'referenceRange': '<100', 'status': 'Borderline', 'date': '2023-09-22'},
                    {'parameter': 'HDL', 'value': 45, 'unit': 'mg/dL', 'referenceRange': '>40', 'status': 'Normal', 'date': '2023-09-22'}
                ]
            },
            {
                'member': member_objs['robert'],
                'title': 'HbA1c & Fasting Glucose',
                'date': '2023-10-01',
                'type': 'Blood',
                'abnormality': 'Critical',
                'summary': 'HbA1c levels indicate poor glycemic control. Immediate consultation with an endocrinologist is recommended to adjust medication.',
                'doctor_notes': '',
                'lab_values': [
                    {'parameter': 'HbA1c', 'value': 8.2, 'unit': '%', 'referenceRange': '<5.7', 'status': 'Critical', 'date': '2023-10-01'},
                    {'parameter': 'Fasting Glucose', 'value': 165, 'unit': 'mg/dL', 'referenceRange': '70-99', 'status': 'Critical', 'date': '2023-10-01'}
                ]
            },
            {
                'member': member_objs['sarah'],
                'title': 'Annual Physical Bloodwork',
                'date': '2022-10-10',
                'type': 'Blood',
                'abnormality': 'Normal',
                'summary': '',
                'doctor_notes': '',
                'lab_values': [
                    {'parameter': 'Glucose', 'value': 88, 'unit': 'mg/dL', 'referenceRange': '70-99', 'status': 'Normal', 'date': '2022-10-10'}
                ]
            },
            {
                'member': member_objs['emma'],
                'title': 'Chest X-Ray',
                'date': '2023-08-10',
                'type': 'Imaging',
                'abnormality': 'Normal',
                'summary': 'Clear lungs. No signs of infection or abnormalities.',
                'doctor_notes': '',
                'lab_values': []
            }
        ]

        for r in reports_data:
            Report.objects.create(**r)

        # 5. Create Alerts
        alerts_data = [
            {
                'member': member_objs['robert'],
                'title': 'Critical HbA1c Level',
                'description': "Robert's HbA1c is 8.2%. Please schedule an endocrinologist appointment.",
                'date': '2023-10-02',
                'severity': 'Critical',
                'type': 'Alert',
                'status': 'Active'
            },
            {
                'member': member_objs['david'],
                'title': 'Follow-up Lipid Panel',
                'description': "It has been 3 months since David's borderline lipid panel. Time for a re-check.",
                'date': '2023-12-22',
                'severity': 'Borderline',
                'type': 'Reminder',
                'status': 'Upcoming'
            },
            {
                'member': member_objs['emma'],
                'title': 'Annual Pediatric Checkup',
                'description': 'Emma is due for her annual physical next month.',
                'date': '2023-11-15',
                'severity': 'Normal',
                'type': 'Reminder',
                'status': 'Upcoming'
            }
        ]

        for a in alerts_data:
            Alert.objects.create(**a)

        self.stdout.write(self.style.SUCCESS("Database seeded successfully! You can login with 'testfamily' / 'password123'."))
