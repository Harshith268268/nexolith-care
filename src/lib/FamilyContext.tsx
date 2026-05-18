import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import localforage from 'localforage';
import { FamilyMember, Report, Alert, Prediction } from './mockData';

// Pointing to Django backend
export const API_BASE = 'http://localhost:8000';

interface AuthState {
  token: string | null;
  familyId: number | null;
  username: string | null;
}

interface FamilyContextType {
  auth: AuthState;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
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
  } catch {}
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
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      persistAuth({ token: data.access, familyId: data.family_id || 1, username });
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      persistAuth({ token: data.access, familyId: data.family_id || 1, username });
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
    // Gracefully support camelCase/snake_case mapping for avatarUrl
    const payload = {
      name: data.name,
      age: data.age,
      relation: data.relation,
      avatar_url: data.avatarUrl || data.avatar_url || ''
    };
    const res = await apiFetch('/api/family/members/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to add member');
    }
    await refreshData();
  };

  const updateMember = async (id: string, data: any) => {
    // Gracefully support camelCase/snake_case mapping for avatarUrl and use PATCH for partial stability
    const payload = {
      name: data.name,
      age: data.age,
      relation: data.relation,
      avatar_url: data.avatarUrl || data.avatar_url || ''
    };
    const res = await apiFetch(`/api/family/members/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to update member');
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