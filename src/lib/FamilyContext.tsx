import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import localforage from 'localforage';
import { FamilyMember, Report, Alert, Prediction } from './mockData';

// Pointing to Django backend
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface AuthState {
  token: string | null;
  familyId: number | null;
  username: string | null;
}

interface FamilyContextType {
  auth: AuthState;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string, confirmPassword?: string) => Promise<any>;
  verifyEmail: (email: string, otp: string) => Promise<any>;
  resendVerificationOtp: (email: string) => Promise<any>;
  requestForgotPassword: (email: string) => Promise<any>;
  verifyResetOtp: (email: string, otp: string) => Promise<any>;
  resetPassword: (email: string, otp: string, newPassword: string, confirmPassword?: string) => Promise<any>;
  logout: () => void;
  authError: string | null;
  authLoading: boolean;

  members: FamilyMember[];
  activeMember: FamilyMember | null;
  setActiveMember: (member: FamilyMember | null) => void;
  addMember: (data: any) => Promise<void>;
  updateMember: (id: string, data: any) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  
  reports: Report[];
  addReport: (data: any) => Promise<Report>;
  updateReport: (id: string, data: any) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;

  alerts: Alert[];
  addAlert: (data: any) => Promise<void>;
  updateAlert: (id: string, data: any) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  markAlertRead: (id: string) => Promise<void>;
  rescheduleAlert: (id: string, newDate: string) => Promise<void>;

  dataLoading: boolean;
  refreshData: () => Promise<void>;
  refreshFamilyData: () => Promise<void>;

  predictions: Prediction[];
  predictionsLoading: boolean;
  fetchPredictions: (force?: boolean) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

function getStoredAuth(): AuthState {
  try {
    const raw = localStorage.getItem('healthai_auth');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    // Ignore invalid JSON in localStorage
  }
  return { token: null, familyId: null, username: null };
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(getStoredAuth);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [activeMember, setActiveMember] = useState<FamilyMember | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsFetched, setPredictionsFetched] = useState(false);

  const isAuthenticated = Boolean(auth.token);

  const apiFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      // Don't set Content-Type for FormData — browser sets it with boundary
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string> || {})
    };
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }, [auth.token]);

  const refreshData = useCallback(async () => {
    if (!auth.token) return;
    setDataLoading(true);

    try {
      // Fetch all required data in parallel
      const [membersRes, reportsRes, alertsRes] = await Promise.all([
        apiFetch('/api/family/members/'),
        apiFetch('/api/reports/'),
        apiFetch('/api/alerts/')
      ]);

      if (membersRes.ok && reportsRes.ok && alertsRes.ok) {
        const fetchedMembers = await membersRes.json();
        const fetchedReports = await reportsRes.json();
        const fetchedAlerts = await alertsRes.json();

        const enrichedMembers = fetchedMembers.map((member: any) => {
          const memberReports = fetchedReports.filter((r: any) => String(r.member_id || r.memberId) === String(member.id));
          const worstAbnormality = memberReports.reduce((worst: string, r: any) => {
            if (r.abnormality === 'Critical') return 'Critical';
            if (r.abnormality === 'Borderline' && worst !== 'Critical') return 'Borderline';
            return worst;
          }, 'Normal');

          return {
            ...member,
            reportCount: memberReports.length,
            overallRisk: worstAbnormality,
            lastReportDate: memberReports.length > 0 ? memberReports[0].date : null
          };
        });

        setMembers(enrichedMembers);
        setReports(fetchedReports);
        setAlerts(fetchedAlerts);
        
        setActiveMember(prev => {
          if (prev) {
            const updated = fetchedMembers.find((m: any) => m.id === prev.id);
            return updated || (fetchedMembers[0] || null);
          }
          return fetchedMembers[0] || null;
        });
      }
    } catch (err) {
      console.error('Failed to refresh data from server.', err);
    } finally {
      setDataLoading(false);
    }
  }, [auth.token, apiFetch]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    } else {
      setMembers([]);
      setReports([]);
      setAlerts([]);
      setActiveMember(null);
      setPredictions([]);
      setPredictionsFetched(false);
    }
  }, [isAuthenticated]);

  const persistAuth = (state: AuthState) => {
    setAuth(state);
    localStorage.setItem('healthai_auth', JSON.stringify(state));
  };

  const login = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        const error: any = new Error(data.detail || 'Login failed');
        error.data = data;
        error.emailUnverified = data.email_unverified;
        error.email = data.email;
        throw error;
      }
      persistAuth({ token: data.access, familyId: data.family_id || 1, username });
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, confirmPassword?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          confirm_password: confirmPassword || password
        })
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = 'Registration failed';
        if (data.username) msg = Array.isArray(data.username) ? data.username[0] : data.username;
        else if (data.email) msg = Array.isArray(data.email) ? data.email[0] : data.email;
        else if (data.password) msg = Array.isArray(data.password) ? data.password[0] : data.password;
        else if (data.confirm_password) msg = Array.isArray(data.confirm_password) ? data.confirm_password[0] : data.confirm_password;
        else if (data.detail) msg = data.detail;
        throw new Error(msg);
      }
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyEmail = async (email: string, otp: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Email verification failed');
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const resendVerificationOtp = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to resend OTP');
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const requestForgotPassword = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to process request');
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyResetOtp = async (email: string, otp: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-reset-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'OTP verification failed');
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string, confirmPassword?: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp,
          new_password: newPassword,
          confirm_password: confirmPassword || newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = 'Password reset failed';
        if (data.new_password) msg = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
        else if (data.confirm_password) msg = Array.isArray(data.confirm_password) ? data.confirm_password[0] : data.confirm_password;
        else if (data.detail) msg = data.detail;
        throw new Error(msg);
      }
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('healthai_auth');
    setAuth({ token: null, familyId: null, username: null });
    setMembers([]);
    setReports([]);
    setAlerts([]);
    setActiveMember(null);
  };

  const addMember = async (data: any) => {
    // Gracefully support camelCase/snake_case mapping for all fields
    const payload = {
      name: data.name,
      gender: data.gender || 'Male',
      age: data.age,
      height_cm: data.height_cm !== undefined ? data.height_cm : (data.heightCm !== undefined ? data.heightCm : null),
      weight_kg: data.weight_kg !== undefined ? data.weight_kg : (data.weightKg !== undefined ? data.weightKg : null),
      relation: data.relation,
      avatar_url: data.avatarUrl || data.avatar_url || ''
    };
    const res = await apiFetch('/api/family/members/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = 'Failed to add member';
      if (err.height_cm) msg = Array.isArray(err.height_cm) ? err.height_cm[0] : err.height_cm;
      else if (err.weight_kg) msg = Array.isArray(err.weight_kg) ? err.weight_kg[0] : err.weight_kg;
      else if (err.age) msg = Array.isArray(err.age) ? err.age[0] : err.age;
      else if (err.name) msg = Array.isArray(err.name) ? err.name[0] : err.name;
      else if (err.gender) msg = Array.isArray(err.gender) ? err.gender[0] : err.gender;
      else if (err.detail) msg = err.detail;
      throw new Error(msg);
    }
    await refreshData();
  };

  const updateMember = async (id: string, data: any) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.gender !== undefined) payload.gender = data.gender;
    if (data.age !== undefined) payload.age = data.age;
    if (data.height_cm !== undefined || data.heightCm !== undefined) {
      payload.height_cm = data.height_cm !== undefined ? data.height_cm : data.heightCm;
    }
    if (data.weight_kg !== undefined || data.weightKg !== undefined) {
      payload.weight_kg = data.weight_kg !== undefined ? data.weight_kg : data.weightKg;
    }
    if (data.relation !== undefined) payload.relation = data.relation;
    if (data.avatarUrl || data.avatar_url) payload.avatar_url = data.avatarUrl || data.avatar_url;

    const res = await apiFetch(`/api/family/members/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let msg = 'Failed to update member';
      if (err.height_cm) msg = Array.isArray(err.height_cm) ? err.height_cm[0] : err.height_cm;
      else if (err.weight_kg) msg = Array.isArray(err.weight_kg) ? err.weight_kg[0] : err.weight_kg;
      else if (err.age) msg = Array.isArray(err.age) ? err.age[0] : err.age;
      else if (err.name) msg = Array.isArray(err.name) ? err.name[0] : err.name;
      else if (err.detail) msg = err.detail;
      throw new Error(msg);
    }
    await refreshData();
  };

  const deleteMember = async (id: string) => {
    const res = await apiFetch(`/api/family/members/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete member');
    await refreshData();
  };

  const addReport = async (data: any): Promise<any> => {
    const isFormData = data instanceof FormData;
    const res = await apiFetch('/api/reports/', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add report');
    }
    const newReport = await res.json();
    setReports(prev => [newReport, ...prev]);
    
    // Update local member stats
    setMembers(prev => prev.map(m => {
      if (String(m.id) === String(newReport.memberId || newReport.member_id)) {
        const newCount = (m.reportCount || 0) + 1;
        let newRisk = m.overallRisk || 'Normal';
        if (newReport.abnormality === 'Critical') newRisk = 'Critical';
        else if (newReport.abnormality === 'Borderline' && newRisk !== 'Critical') newRisk = 'Borderline';
        
        return { ...m, reportCount: newCount, overallRisk: newRisk, lastReportDate: newReport.date };
      }
      return m;
    }));

    return newReport;
  };

  const updateReport = async (id: string, data: any) => {
    const res = await apiFetch(`/api/reports/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update report');
    const updatedReport = await res.json();
    setReports(prev => prev.map(r => String(r.id) === id ? updatedReport : r));
  };

  const deleteReport = async (id: string) => {
    const res = await apiFetch(`/api/reports/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete report');
    setReports(prev => prev.filter(r => String(r.id) !== id));
  };

  const addAlert = async (data: any) => {
    const res = await apiFetch('/api/alerts/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add alert');
    const newAlert = await res.json();
    setAlerts(prev => [newAlert, ...prev]);
  };

  const updateAlert = async (id: string, data: any) => {
    const res = await apiFetch(`/api/alerts/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update alert');
    const updatedAlert = await res.json();
    setAlerts(prev => prev.map(a => String(a.id) === id ? updatedAlert : a));
  };

  const deleteAlert = async (id: string) => {
    const res = await apiFetch(`/api/alerts/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete alert');
    setAlerts(prev => prev.filter(a => String(a.id) !== id));
  };

  const markAlertRead = async (id: string) => {
    const res = await apiFetch(`/api/alerts/${id}/read/`, { method: 'PUT' });
    if (res.ok) {
      setAlerts(prev => prev.map(a => String(a.id) === id ? { ...a, status: 'History' } : a));
    }
  };

  const rescheduleAlert = async (id: string, newDate: string) => {
    const res = await apiFetch(`/api/alerts/${id}/reschedule/`, {
      method: 'PUT',
      body: JSON.stringify({ date: newDate })
    });
    if (res.ok) {
      setAlerts(prev => prev.map(a => String(a.id) === id ? { ...a, date: newDate } : a));
    }
  };

  const fetchPredictions = async (force = false) => {
    // Placeholder until AI backend is fully integrated
    console.log("Fetching predictions...");
  };

  return (
    <FamilyContext.Provider value={{
      auth, isAuthenticated, login, register, logout, authError, authLoading,
      verifyEmail, resendVerificationOtp, requestForgotPassword, verifyResetOtp, resetPassword,
      members, activeMember, setActiveMember, addMember, updateMember, deleteMember,
      reports, addReport, updateReport, deleteReport,
      alerts, addAlert, updateAlert, deleteAlert, markAlertRead, rescheduleAlert,
      dataLoading, refreshData, refreshFamilyData: refreshData,
      predictions, predictionsLoading, fetchPredictions
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) throw new Error('useFamily must be used within a FamilyProvider');
  return context;
}