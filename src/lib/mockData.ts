export type MemberRole = 'Primary' | 'Dependent' | 'Spouse' | 'Parent';
export type AbnormalityLevel = 'Normal' | 'Borderline' | 'Critical';
export type ReportType = 'Blood' | 'Imaging' | 'Prescription' | 'Discharge';

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  relation: MemberRole;
  avatarUrl?: string;
  lastReportDate: string;
  reportCount: number;
  overallRisk: AbnormalityLevel;
}

export interface LabValue {
  id: string;
  parameter: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: AbnormalityLevel;
  date: string;
}

export interface Report {
  id: string;
  memberId: string;
  title: string;
  date: string;
  type: ReportType;
  abnormality: AbnormalityLevel;
  summary?: string;
  labValues?: any[];  // Dynamic — shape varies by OCR extraction
  doctorNotes?: string;
  file?: string;     // URL to uploaded file
  ocrText?: string;  // Raw OCR text
}

export interface Alert {
  id: string;
  memberId: string;
  title: string;
  description: string;
  date: string;
  severity: AbnormalityLevel;
  type: 'Reminder' | 'Alert';
  status: 'Active' | 'Upcoming' | 'History';
}

export interface Prediction {
  id: string;
  memberId: string;
  condition: string;
  riskLevel: 'Low' | 'Moderate' | 'High';
  factors: string[];
  suggestions: string[];
  reportCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: {reportId: string;title: string;}[];
}

export const mockMembers: FamilyMember[] = [
{
  id: 'm1',
  name: 'Sarah Jenkins',
  age: 42,
  relation: 'Primary',
  avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
  lastReportDate: '2023-10-15',
  reportCount: 12,
  overallRisk: 'Normal'
},
{
  id: 'm2',
  name: 'David Jenkins',
  age: 45,
  relation: 'Spouse',
  avatarUrl: 'https://i.pravatar.cc/150?u=david',
  lastReportDate: '2023-09-22',
  reportCount: 8,
  overallRisk: 'Borderline'
},
{
  id: 'm3',
  name: 'Emma Jenkins',
  age: 12,
  relation: 'Dependent',
  avatarUrl: 'https://i.pravatar.cc/150?u=emma',
  lastReportDate: '2023-08-10',
  reportCount: 4,
  overallRisk: 'Normal'
},
{
  id: 'm4',
  name: 'Robert Smith',
  age: 72,
  relation: 'Parent',
  avatarUrl: 'https://i.pravatar.cc/150?u=robert',
  lastReportDate: '2023-10-01',
  reportCount: 24,
  overallRisk: 'Critical'
}];


export const mockReports: Report[] = [
{
  id: 'r1',
  memberId: 'm1',
  title: 'Comprehensive Metabolic Panel',
  date: '2023-10-15',
  type: 'Blood',
  abnormality: 'Normal',
  summary:
  'Your metabolic panel results are generally within normal limits. Fasting glucose is excellent. Kidney and liver functions appear healthy.',
  labValues: [
  {
    id: 'l1',
    parameter: 'Glucose',
    value: 85,
    unit: 'mg/dL',
    referenceRange: '70-99',
    status: 'Normal',
    date: '2023-10-15'
  },
  {
    id: 'l2',
    parameter: 'Calcium',
    value: 9.2,
    unit: 'mg/dL',
    referenceRange: '8.6-10.2',
    status: 'Normal',
    date: '2023-10-15'
  },
  {
    id: 'l3',
    parameter: 'Sodium',
    value: 140,
    unit: 'mEq/L',
    referenceRange: '135-145',
    status: 'Normal',
    date: '2023-10-15'
  }],

  doctorNotes:
  'Patient is healthy. Continue current diet and exercise routine.'
},
{
  id: 'r2',
  memberId: 'm2',
  title: 'Lipid Panel',
  date: '2023-09-22',
  type: 'Blood',
  abnormality: 'Borderline',
  summary:
  'Cholesterol levels are slightly elevated. LDL (bad cholesterol) is borderline high. Consider dietary adjustments to reduce saturated fats.',
  labValues: [
  {
    id: 'l4',
    parameter: 'Total Cholesterol',
    value: 215,
    unit: 'mg/dL',
    referenceRange: '<200',
    status: 'Borderline',
    date: '2023-09-22'
  },
  {
    id: 'l5',
    parameter: 'LDL',
    value: 135,
    unit: 'mg/dL',
    referenceRange: '<100',
    status: 'Borderline',
    date: '2023-09-22'
  },
  {
    id: 'l6',
    parameter: 'HDL',
    value: 45,
    unit: 'mg/dL',
    referenceRange: '>40',
    status: 'Normal',
    date: '2023-09-22'
  }]

},
{
  id: 'r3',
  memberId: 'm4',
  title: 'HbA1c & Fasting Glucose',
  date: '2023-10-01',
  type: 'Blood',
  abnormality: 'Critical',
  summary:
  'HbA1c levels indicate poor glycemic control. Immediate consultation with an endocrinologist is recommended to adjust medication.',
  labValues: [
  {
    id: 'l7',
    parameter: 'HbA1c',
    value: 8.2,
    unit: '%',
    referenceRange: '<5.7',
    status: 'Critical',
    date: '2023-10-01'
  },
  {
    id: 'l8',
    parameter: 'Fasting Glucose',
    value: 165,
    unit: 'mg/dL',
    referenceRange: '70-99',
    status: 'Critical',
    date: '2023-10-01'
  }]

},
{
  id: 'r4',
  memberId: 'm1',
  title: 'Annual Physical Bloodwork',
  date: '2022-10-10',
  type: 'Blood',
  abnormality: 'Normal',
  labValues: [
  {
    id: 'l9',
    parameter: 'Glucose',
    value: 88,
    unit: 'mg/dL',
    referenceRange: '70-99',
    status: 'Normal',
    date: '2022-10-10'
  }]

},
{
  id: 'r5',
  memberId: 'm3',
  title: 'Chest X-Ray',
  date: '2023-08-10',
  type: 'Imaging',
  abnormality: 'Normal',
  summary: 'Clear lungs. No signs of infection or abnormalities.'
}];


export const mockAlerts: Alert[] = [
{
  id: 'a1',
  memberId: 'm4',
  title: 'Critical HbA1c Level',
  description:
  "Robert's HbA1c is 8.2%. Please schedule an endocrinologist appointment.",
  date: '2023-10-02',
  severity: 'Critical',
  type: 'Alert',
  status: 'Active'
},
{
  id: 'a2',
  memberId: 'm2',
  title: 'Follow-up Lipid Panel',
  description:
  "It has been 3 months since David's borderline lipid panel. Time for a re-check.",
  date: '2023-12-22',
  severity: 'Borderline',
  type: 'Reminder',
  status: 'Upcoming'
},
{
  id: 'a3',
  memberId: 'm3',
  title: 'Annual Pediatric Checkup',
  description: 'Emma is due for her annual physical next month.',
  date: '2023-11-15',
  severity: 'Normal',
  type: 'Reminder',
  status: 'Upcoming'
}];


export const mockPredictions: Prediction[] = [
{
  id: 'p1',
  memberId: 'm2',
  condition: 'Cardiovascular Disease',
  riskLevel: 'Moderate',
  factors: [
  'Elevated LDL (135 mg/dL)',
  'Age (45)',
  'Family history of hypertension'],

  suggestions: [
  'Increase aerobic exercise to 150 mins/week',
  'Adopt Mediterranean diet',
  'Schedule cardiology screening'],

  reportCount: 5
},
{
  id: 'p2',
  memberId: 'm4',
  condition: 'Diabetic Neuropathy',
  riskLevel: 'High',
  factors: [
  'Consistently high HbA1c (>8.0%)',
  'Age (72)',
  'Duration of diabetes (>10 years)'],

  suggestions: [
  'Daily foot inspections',
  'Strict glycemic control',
  'Annual comprehensive foot exam by podiatrist'],

  reportCount: 12
}];


export const mockChatMessages: ChatMessage[] = [
{
  id: 'c1',
  role: 'user',
  content: 'Can you summarize my last blood test?',
  timestamp: '2023-10-16T10:00:00Z'
},
{
  id: 'c2',
  role: 'assistant',
  content:
  'Based on your Comprehensive Metabolic Panel from Oct 15, your results are looking great! Your fasting glucose is 85 mg/dL, which is well within the normal range. Your kidney and liver functions are also healthy. Dr. Smith noted that you should continue your current diet and exercise routine.',
  timestamp: '2023-10-16T10:00:05Z',
  citations: [{ reportId: 'r1', title: 'Comprehensive Metabolic Panel' }]
}];