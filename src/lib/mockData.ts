export type MemberRole = 'Primary' | 'Dependent' | 'Spouse' | 'Parent';
export type AbnormalityLevel = 'Normal' | 'Borderline' | 'Critical';
export type ReportType = 'Blood' | 'Imaging' | 'Prescription' | 'Discharge';

export interface FamilyMember {
  id: string;
  name: string;
  gender?: 'Male' | 'Female';
  age: number;
  height_cm?: number;
  weight_kg?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number | null;
  relation: MemberRole;
  avatarUrl?: string | null;
  profile_image?: string | null;
  profile_image_url?: string | null;
  lastReportDate: string | null;
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
  citations?: { reportId: string; title: string; }[];
}

// Strictly 100% database-driven: No hardcoded fallback sample arrays
export const mockMembers: FamilyMember[] = [];
export const mockReports: Report[] = [];
export const mockAlerts: Alert[] = [];