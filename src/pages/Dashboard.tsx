import React, { useState, useEffect } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import { StatCard } from '../components/StatCard';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import {
  Calendar,
  Bell,
  FileText,
  Activity,
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  MessageSquare,
  Users,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export function Dashboard() {
  const { activeMember, members, reports, alerts, auth } = useFamily();
  const [insights, setInsights] = useState<any>(null);
  const [glucoseTrends, setGlucoseTrends] = useState<any[]>([]);
  const [bpTrends, setBpTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch live insights & trends for the active member
  useEffect(() => {
    if (!activeMember || !auth.token) {
      setInsights(null);
      setGlucoseTrends([]);
      setBpTrends([]);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${auth.token}` };
        
        // Fetch Insights & Risks
        const insightsRes = await fetch(`${API_BASE}/api/analytics/insights/?member_id=${activeMember.id}`, { headers });
        if (insightsRes.ok) {
          const data = await insightsRes.json();
          setInsights(data);
        }

        // Fetch Glucose trends
        const glucoseRes = await fetch(`${API_BASE}/api/analytics/member-trends/?member_id=${activeMember.id}&parameter=Glucose`, { headers });
        if (glucoseRes.ok) {
          const data = await glucoseRes.json();
          // Map to Recharts line chart data
          setGlucoseTrends(data.map((d: any) => ({ value: d.value, date: d.date })));
        }

        // Fetch Blood Pressure trends
        const bpRes = await fetch(`${API_BASE}/api/analytics/member-trends/?member_id=${activeMember.id}&parameter=Systolic`, { headers });
        if (bpRes.ok) {
          const data = await bpRes.json();
          setBpTrends(data.map((d: any) => ({ value: d.value, date: d.date })));
        }
      } catch (err) {
        console.error("Failed to load live health analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [activeMember, auth.token, reports]); // refresh when reports change!

  // Filter reports and alerts based on active member or show all
  const displayReports = activeMember ?
    reports.filter((r) => String(r.memberId || (r as any).member_id) === String(activeMember.id)) :
    reports;
    
  const displayAlerts = activeMember ?
    alerts.filter((a) => String(a.memberId || (a as any).member_id) === String(activeMember.id)) :
    alerts;
    
  const activeAlertsCount = displayAlerts.filter(
    (a) => a.status === 'Active'
  ).length;
  
  const recentReports = [...displayReports].
    sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).
    slice(0, 3);
    
  const upcomingReminders = displayAlerts.
    filter((a) => a.status === 'Upcoming' || a.status === 'Active').
    slice(0, 3);

  // Extract latest vitals values dynamically
  const latestGlucoseVal = displayReports
    .flatMap(r => r.labValues || [])
    .find(lv => lv.parameter.toLowerCase().includes('glucose'));

  const latestBPVal = displayReports
    .flatMap(r => r.labValues || [])
    .find(lv => lv.parameter.toLowerCase().includes('systolic') || lv.parameter.toLowerCase().includes('blood pressure') || lv.parameter.toLowerCase().includes('bp'));

  // Risk scores & colors
  let riskScore = 'Normal';
  let riskColor = 'text-success-600 bg-success-50';
  if (insights?.riskScore) {
    riskScore = insights.riskScore;
    if (riskScore === 'Borderline') riskColor = 'text-warning-600 bg-warning-50';
    if (riskScore === 'Critical') riskColor = 'text-critical-600 bg-critical-50';
  } else if (activeMember) {
    riskScore = activeMember.overallRisk || 'Normal';
    if (riskScore === 'Borderline') riskColor = 'text-warning-600 bg-warning-50';
    if (riskScore === 'Critical') riskColor = 'text-critical-600 bg-critical-50';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {activeMember ?
            `Hello, ${activeMember.name.split(' ')[0]}` :
            'Family Overview'}
          </h1>
          <p className="text-slate-500">
            Here's what's happening with your health today.
          </p>
        </div>
        <Link
          to="/reports/upload"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm animate-pulse">
          Upload Report
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Last Checkup"
          value={
            activeMember && activeMember.lastReportDate ?
            new Date(activeMember.lastReportDate).toLocaleDateString(
              undefined,
              { month: 'short', day: 'numeric', year: 'numeric' }
            ) :
            'Multiple'
          }
          icon={Calendar}
          colorClass="text-primary-600 bg-primary-50" />
        
        <StatCard
          title="Active Alerts"
          value={activeAlertsCount}
          subtitle={activeAlertsCount > 0 ? 'Requires attention' : 'All clear'}
          icon={Bell}
          colorClass={
            activeAlertsCount > 0 ?
            'text-critical-600 bg-critical-50' :
            'text-success-600 bg-success-50'
          } />
        
        <StatCard
          title="Reports Stored"
          value={displayReports.length}
          icon={FileText}
          colorClass="text-indigo-600 bg-indigo-50" />
        
        <StatCard
          title="Overall Status"
          value={riskScore}
          icon={Activity}
          colorClass={riskColor} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Insights Card */}
          <div className="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-6 border border-primary-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BrainCircuit className="w-24 h-24 text-primary-600" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-4">
                <BrainCircuit className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  AI Health Insights
                </h2>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-slate-500 py-4 animate-pulse">Calculating AI trends...</div>
                ) : insights && insights.insights && insights.insights.length > 0 ? (
                  insights.insights.map((insight: string, idx: number) => (
                    <div key={idx} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-primary-50 hover:shadow-sm transition-all">
                      <p className="text-slate-700 text-sm leading-relaxed">
                        <strong>Insight:</strong> {insight}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-primary-50">
                    <p className="text-slate-500 text-sm">
                      Upload your first clinical report or blood test to generate dynamic health trend lines, percentage comparisons, and health tracking insights automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Reports List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Recent Reports
              </h2>
              <Link
                to="/reports"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentReports.length > 0 ?
              recentReports.map((report) => {
                const member = members.find((m) => String(m.id) === String(report.memberId || (report as any).member_id));
                return (
                  <Link
                    key={report.id}
                    to={`/reports/${report.id}`}
                    className="flex items-center p-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shrink-0 mr-4">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {report.title}
                        </h4>
                        <div className="flex items-center text-xs text-slate-500 mt-1">
                          {!activeMember && member &&
                            <>
                              <span className="truncate max-w-[100px]">
                                {member.name}
                              </span>
                              <span className="mx-1.5">•</span>
                            </>
                          }
                          <span>
                            {new Date(report.date).toLocaleDateString()}
                          </span>
                          <span className="mx-1.5">•</span>
                          <span>{report.type}</span>
                        </div>
                      </div>
                      <div className="ml-4 shrink-0">
                        <AbnormalityBadge level={report.abnormality} />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
                    </Link>);
              }) :
              <div className="p-8 text-center text-slate-500">
                No reports found.
              </div>
              }
            </div>
          </div>

          {/* Vitals Trends Plotting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fasting Glucose Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Fasting Glucose</h3>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {latestGlucoseVal ? latestGlucoseVal.value : '--'}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      {latestGlucoseVal ? latestGlucoseVal.unit : 'mg/dL'}
                    </span>
                  </div>
                </div>
                {latestGlucoseVal && <AbnormalityBadge level={latestGlucoseVal.status} />}
              </div>
              <div className="h-16 w-full flex items-center justify-center">
                {glucoseTrends.length >= 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={glucoseTrends}>
                      <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-400 text-center select-none">
                    Requires multiple reports for trend analysis.
                  </div>
                )}
              </div>
            </div>

            {/* Blood Pressure Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Systolic BP</h3>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {latestBPVal ? latestBPVal.value : '--'}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      {latestBPVal ? latestBPVal.unit : 'mmHg'}
                    </span>
                  </div>
                </div>
                {latestBPVal && <AbnormalityBadge level={latestBPVal.status} />}
              </div>
              <div className="h-16 w-full flex items-center justify-center">
                {bpTrends.length >= 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bpTrends}>
                      <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-400 text-center select-none">
                    Requires multiple reports for trend analysis.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          {/* Latest Warnings & Alerts Reminders */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Health Alerts</h2>
              <Link
                to="/alerts"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                View all
              </Link>
            </div>
            <div className="p-2 divide-y divide-slate-100">
              {upcomingReminders.length > 0 ?
              upcomingReminders.map((reminder) => {
                const member = members.find((m) => String(m.id) === String(reminder.memberId || (reminder as any).member_id));
                return (
                  <div
                    key={reminder.id}
                    className="flex items-start p-3 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mr-3">
                        {reminder.severity === 'Critical' ? (
                          <AlertTriangle className="w-5 h-5 text-critical-500" />
                        ) : (
                          <Calendar className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 leading-snug">
                          {reminder.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {reminder.description}
                        </p>
                        <div className="flex items-center mt-2.5 space-x-2">
                          <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {new Date(reminder.date).toLocaleDateString(
                            undefined,
                            { month: 'short', day: 'numeric' }
                          )}
                          </span>
                          {!activeMember && member &&
                            <span className="text-xs text-slate-500 flex items-center">
                              <Avatar
                                name={member.name}
                                src={member.avatarUrl}
                                size="sm"
                                className="w-4 h-4 mr-1" />
                              {member.name.split(' ')[0]}
                            </span>
                          }
                        </div>
                      </div>
                    </div>);
              }) :
              <div className="p-4 text-center text-sm text-slate-500">
                No active warnings.
              </div>
              }
            </div>
          </div>

          {/* AI Recommended Guidance Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-bold text-slate-900 mb-3">
              AI Recommendations
            </h2>
            <div className="space-y-3">
              {insights && insights.recommendations && insights.recommendations.length > 0 ? (
                insights.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 mr-2.5 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">
                  Awaiting reports analysis to populate daily lifestyle modifications.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Link
                to="/assistant"
                className="w-full flex items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mr-3 group-hover:bg-primary-100 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  Ask AI Assistant
                </span>
              </Link>
              <Link
                to="/family"
                className="w-full flex items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mr-3 group-hover:bg-slate-200 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  Manage Family
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>);
}