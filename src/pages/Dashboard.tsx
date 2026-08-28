import React, { useState, useEffect } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import { Avatar } from '../components/Avatar';
import {
  Bell,
  FileText,
  HeartPulse,
  ArrowRight,
  ChevronRight,
  Users,
  AlertTriangle,
  Upload,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

export function Dashboard() {
  const { activeMember, setActiveMember, members, reports, alerts, auth } = useFamily();
  const navigate = useNavigate();

  const [insights, setInsights] = useState<any>(null);
  const [selectedTrendParam, setSelectedTrendParam] = useState<string>('Glucose');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loadingTrends, setLoadingTrends] = useState<boolean>(false);
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // 1. Fetch live AI insights for the active member (or default primary member)
  useEffect(() => {
    if (!auth.token) return;

    const memberId = activeMember ? activeMember.id : (members.length > 0 ? members[0].id : null);
    if (!memberId) return;

    const fetchAnalytics = async () => {
      setLoadingInsights(true);
      try {
        const headers = { 'Authorization': `Bearer ${auth.token}` };
        const res = await fetch(`${API_BASE}/api/analytics/insights/?member_id=${memberId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setInsights(data);
        }
      } catch (err) {
        console.error("Failed to load AI insights", err);
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchAnalytics();
  }, [activeMember, members, auth.token, reports]);

  // 2. Fetch trend data when parameter or active member selection changes
  useEffect(() => {
    if (!auth.token) return;

    const memberId = activeMember ? activeMember.id : (members.length > 0 ? members[0].id : null);
    if (!memberId) {
      setTrendData([]);
      return;
    }

    const fetchTrends = async () => {
      setLoadingTrends(true);
      try {
        const headers = { 'Authorization': `Bearer ${auth.token}` };
        const res = await fetch(`${API_BASE}/api/analytics/member-trends/?member_id=${memberId}&parameter=${selectedTrendParam}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setTrendData(data.map((d: any) => ({
            value: Number(d.value),
            date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            rawDate: d.date
          })));
        } else {
          setTrendData([]);
        }
      } catch (err) {
        console.error("Failed to load trend analysis", err);
        setTrendData([]);
      } finally {
        setLoadingTrends(false);
      }
    };

    fetchTrends();
  }, [selectedTrendParam, activeMember, members, auth.token, reports]);

  // Filter reports and alerts based on active member selection
  const displayReports = activeMember
    ? reports.filter((r) => String(r.memberId || (r as any).member_id) === String(activeMember.id))
    : reports;

  const displayAlerts = activeMember
    ? alerts.filter((a) => String(a.memberId || (a as any).member_id) === String(activeMember.id))
    : alerts;

  const activeAlerts = displayAlerts.filter((a) => a.status === 'Active' || a.status === 'Upcoming');

  const recentReports = [...displayReports]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const isMetadataTerm = (param: string) => {
    if (!param) return true;
    const p = param.trim().toLowerCase();
    const badList = ['age', 'gender', 'age/gender', 'sex', 'uhid', 'patient', 'doctor', 'date', 'report date', 'hospital', 'sample', 'page', 'specimen', 'reg'];
    return badList.some(b => p === b || p.startsWith(b));
  };

  // Extract all lab parameters from display reports to calculate REAL health score (strictly excluding metadata terms)
  const allLabValues = displayReports.flatMap(r => r.labValues || []).filter(lv => !isMetadataTerm(lv.parameter));
  const normalLabCount = allLabValues.filter(lv => lv.status === 'Normal').length;
  const totalLabCount = allLabValues.length;
  
  const hasHealthScore = totalLabCount > 0;
  const healthScore = hasHealthScore ? Math.round((normalLabCount / totalLabCount) * 100) : null;

  let scoreLabel = 'Normal';
  let scoreBadgeColor = 'text-[#48A383] bg-[#EBF8F4] border-[#D6F2E9]';
  let gaugeColor = '#5DBB9A';

  if (healthScore !== null) {
    if (healthScore < 60) {
      scoreLabel = 'Attention';
      scoreBadgeColor = 'text-[#C25252] bg-[#FDF2F2] border-[#FCE4E4]';
      gaugeColor = '#D96C6C';
    } else if (healthScore < 80) {
      scoreLabel = 'Borderline';
      scoreBadgeColor = 'text-[#D4A050] bg-[#FDF8ED] border-[#FBF0D8]';
      gaugeColor = '#E8B86A';
    }
  }

  const getUnitForParam = (paramName: string) => {
    const p = paramName.toLowerCase();
    if (p.includes('glucose')) return 'mg/dL';
    if (p.includes('cholesterol') || p.includes('ldl') || p.includes('hdl') || p.includes('triglycerides')) return 'mg/dL';
    if (p.includes('systolic') || p.includes('diastolic') || p.includes('bp') || p.includes('pressure')) return 'mmHg';
    if (p.includes('hemoglobin')) return 'g/dL';
    if (p.includes('platelet')) return '10³/µL';
    if (p.includes('bmi')) return 'kg/m²';
    return '';
  };

  let latestTrendVal: number | null = null;
  let percentChange: string | null = null;
  let isFavorableChange = true;

  if (trendData.length >= 2) {
    const firstVal = trendData[0].value;
    const lastVal = trendData[trendData.length - 1].value;
    latestTrendVal = lastVal;
    if (firstVal > 0) {
      const diff = ((lastVal - firstVal) / firstVal) * 100;
      percentChange = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
      const paramLower = selectedTrendParam.toLowerCase();
      if (paramLower.includes('hemoglobin') || paramLower.includes('hdl')) {
        isFavorableChange = diff >= 0;
      } else {
        isFavorableChange = diff <= 0;
      }
    }
  } else if (trendData.length === 1) {
    latestTrendVal = trendData[0].value;
  }

  const evaluatedKeyLabs = Array.from(
    new Map(allLabValues.map(item => [item.parameter.toLowerCase(), item])).values()
  ).slice(0, 4);

  const greetingName = activeMember ? activeMember.name.split(' ')[0] : (auth.username || 'User');

  return (
    <div className="space-y-8 animate-fade-in-up pb-12" data-testid="dashboard-container">
      
      {/* 1. DASHBOARD HERO SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 xl:p-10 border border-[#E3EEEE] shadow-2xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#DDF2F1]/80 text-[#1C696D] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#5DBB9A]" />
              <span>Family Health Overview</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-[#18313A] tracking-tight">
              {getGreeting()}, <span className="text-[#55BFC2]">{greetingName}</span>
            </h1>
            <p className="text-[#64777C] text-sm leading-relaxed">
              Here's a simple, calm view of your family's health today.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-[#64777C]">
              <div className="flex items-center space-x-2 bg-[#F5F8F8] px-3.5 py-2 rounded-2xl border border-[#E3EEEE]">
                <Users className="w-4 h-4 text-[#55BFC2]" />
                <span><strong className="text-[#18313A] font-bold">{members.length}</strong> Family Members</span>
              </div>
              <div className="flex items-center space-x-2 bg-[#F5F8F8] px-3.5 py-2 rounded-2xl border border-[#E3EEEE]">
                <FileText className="w-4 h-4 text-[#55BFC2]" />
                <span><strong className="text-[#18313A] font-bold">{displayReports.length}</strong> Reports</span>
              </div>
              <div className="flex items-center space-x-2 bg-[#F5F8F8] px-3.5 py-2 rounded-2xl border border-[#E3EEEE]">
                <Bell className="w-4 h-4 text-[#E8B86A]" />
                <span><strong className="text-[#18313A] font-bold">{activeAlerts.length}</strong> Active Alerts</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="hidden sm:flex items-center space-x-3 bg-[#EAF6F5] p-4 rounded-2xl border border-[#B8DEDE]/50">
              <div className="p-3 bg-white rounded-xl shadow-2xs">
                <HeartPulse className="w-6 h-6 text-[#55BFC2]" />
              </div>
              <div className="text-left pr-2">
                <span className="text-xs font-bold text-[#18313A] block">Overall Status</span>
                <span className={`text-xs font-semibold ${hasHealthScore ? 'text-[#5DBB9A]' : 'text-[#64777C]'}`}>
                  {hasHealthScore ? `${healthScore}% Normal Vitals` : 'No report data yet'}
                </span>
              </div>
            </div>

            <Link
              to="/reports/upload"
              data-testid="upload-report-link"
              className="inline-flex items-center justify-center px-6 py-3.5 bg-[#55BFC2] hover:bg-[#3AAFA9] text-white rounded-2xl font-bold shadow-2xs hover:shadow-sm transition-all duration-200 active:scale-[0.98] text-sm shrink-0"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Report
            </Link>
          </div>
        </div>
      </div>

      {/* 2. FAMILY HEALTH CARDS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#18313A] tracking-tight">Family Health Profiles</h2>
            <p className="text-xs text-[#64777C]">Individual member patient details and health vitals.</p>
          </div>
          <Link to="/family" className="text-xs font-bold text-[#3AAFA9] hover:underline flex items-center gap-1">
            Manage Family <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {members.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E3EEEE] p-8 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#DDF2F1] text-[#3AAFA9] flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#18313A]">No family members added yet</h3>
            <p className="text-[#64777C] text-xs mt-1 mb-4 max-w-md mx-auto">Add a family member to begin tracking their medical records, vitals, and health trends.</p>
            <Link to="/family" className="inline-flex items-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl text-xs font-bold hover:bg-[#3AAFA9] transition-colors">
              <Plus className="w-4 h-4 mr-1.5" /> Add Family Member
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map((member) => {
              const isSelected = activeMember?.id === member.id;
              const photo = member.profile_image || member.avatarUrl;
              const hCm = member.height_cm || member.heightCm;
              const wKg = member.weight_kg || member.weightKg;
              const bmiVal = member.bmi || (hCm && wKg ? (wKg / ((hCm / 100) * (hCm / 100))).toFixed(1) : null);

              // Correct Status Handling: 0 reports = "No report data" (NO DATA != NORMAL)
              const hasReports = (member.reportCount && member.reportCount > 0) || reports.some(r => String(r.memberId || (r as any).member_id) === String(member.id));
              
              let statusText = hasReports ? 'Normal' : 'No report data';
              let statusDot = hasReports ? 'bg-[#5DBB9A]' : 'bg-[#64777C]';

              if (hasReports) {
                if (member.overallRisk === 'Critical') {
                  statusText = 'Requires Attention';
                  statusDot = 'bg-[#D96C6C]';
                } else if (member.overallRisk === 'Borderline') {
                  statusText = 'Borderline';
                  statusDot = 'bg-[#E8B86A]';
                }
              }

              return (
                <div
                  key={member.id}
                  onClick={() => setActiveMember(member)}
                  className={`bg-white rounded-3xl border p-5 transition-all cursor-pointer relative medical-card-hover ${
                    isSelected 
                      ? 'border-[#55BFC2] ring-2 ring-[#55BFC2]/20 shadow-xs' 
                      : 'border-[#E3EEEE] shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3.5">
                      <Avatar name={member.name} src={photo} size="lg" />
                      <div>
                        <h3 className="font-bold text-[#18313A] text-base">
                          {member.name}
                        </h3>
                        <p className="text-xs text-[#64777C]">
                          {member.relation || 'Primary'} • {member.gender || 'Unspecified'} • {member.age} yrs
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-[#F5F8F8] rounded-2xl border border-[#E3EEEE] text-center mb-4">
                    <div>
                      <span className="text-[10px] font-semibold text-[#64777C] block uppercase">Height</span>
                      <span className="text-xs font-bold text-[#18313A]">{hCm ? `${hCm} cm` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#64777C] block uppercase">Weight</span>
                      <span className="text-xs font-bold text-[#18313A]">{wKg ? `${wKg} kg` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#64777C] block uppercase">BMI</span>
                      <span className="text-xs font-bold text-[#18313A]">{bmiVal ? bmiVal : '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
                      <span className="text-[#64777C]">Overall health:</span>
                      <span className="font-bold text-[#18313A]">{statusText}</span>
                    </div>
                    <Link to="/family" className="text-xs font-semibold text-[#3AAFA9] hover:underline">
                      View profile →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MAIN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* RADIAL HEALTH SCORE GAUGE */}
            <div className="bg-white rounded-3xl p-5 border border-[#E3EEEE] shadow-2xs flex flex-col justify-between items-center text-center">
              <h3 className="text-xs font-semibold text-[#64777C] uppercase tracking-wider mb-1">Health Score</h3>
              
              <div className="relative w-32 h-32 flex items-center justify-center my-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#F5F8F8" strokeWidth="8" fill="none" />
                  {hasHealthScore && (
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke={gaugeColor} 
                      strokeWidth="8" 
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * healthScore!) / 100}
                      strokeLinecap="round" 
                      fill="none" 
                      className="transition-all duration-1000 ease-out"
                    />
                  )}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {hasHealthScore ? (
                    <>
                      <span className="text-3xl font-extrabold text-[#18313A]">{healthScore}%</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${scoreBadgeColor}`}>
                        {scoreLabel}
                      </span>
                    </>
                  ) : (
                    <div className="px-2 text-center">
                      <span className="text-xs font-bold text-[#64777C] block leading-tight">No Data</span>
                      <span className="text-[10px] text-[#64777C]">0 Reports</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full space-y-1.5 pt-2 border-t border-[#E3EEEE] text-xs text-[#64777C]">
                {evaluatedKeyLabs.length > 0 ? (
                  evaluatedKeyLabs.map((lv, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="flex items-center truncate max-w-[110px]">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${lv.status === 'Critical' ? 'bg-[#D96C6C]' : lv.status === 'Borderline' ? 'bg-[#E8B86A]' : 'bg-[#5DBB9A]'}`} />
                        {lv.parameter}
                      </span>
                      <span className="text-[#18313A] font-bold shrink-0">{lv.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#64777C]">Upload reports to evaluate vitals</div>
                )}
              </div>
            </div>

            {/* NEXOLITH AI HEALTH ASSISTANT PANEL */}
            <div className="md:col-span-2 rounded-3xl p-6 bg-white border border-[#E3EEEE] shadow-2xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-[#DDF2F1] text-[#3AAFA9]">
                      <Sparkles className="w-4 h-4 text-[#55BFC2]" />
                    </div>
                    <span className="text-sm font-bold text-[#18313A]">✦ Nexolith Health Assistant</span>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EBF8F4] text-[#48A383]">
                    Active Care AI
                  </span>
                </div>

                <p className="text-xs text-[#64777C] leading-relaxed">
                  Ask about your reports, health trends, or general health questions.
                </p>

                {loadingInsights ? (
                  <div className="py-4 text-xs text-[#64777C] flex items-center space-x-2">
                    <span className="w-2 h-2 bg-[#55BFC2] rounded-full animate-ping" />
                    <span>Analyzing health trends...</span>
                  </div>
                ) : insights && insights.insights && insights.insights.length > 0 ? (
                  <div className="space-y-2">
                    {insights.insights.slice(0, 2).map((insight: string, idx: number) => (
                      <div key={idx} className="bg-[#F5F8F8] border border-[#E3EEEE] rounded-2xl p-3.5">
                        <p className="text-xs text-[#18313A] leading-relaxed font-medium">
                          {insight}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#F5F8F8] border border-[#E3EEEE] rounded-2xl p-3.5">
                    <p className="text-xs text-[#64777C] leading-relaxed font-medium">
                      No medical report data available yet. Upload a report to generate AI insights.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-[#E3EEEE] flex items-center justify-between text-xs font-medium">
                <span className="text-[#64777C]">Based on {displayReports.length} records</span>
                <Link to="/assistant" className="text-[#3AAFA9] hover:underline font-bold flex items-center gap-1">
                  Ask Question →
                </Link>
              </div>
            </div>

          </div>

          {/* HEALTH TRENDS CHART SECTION */}
          <div className="bg-white rounded-3xl p-6 border border-[#E3EEEE] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#18313A] tracking-tight">Health Trends</h2>
                <p className="text-xs text-[#64777C]">Longitudinal vital curves calculated from medical reports.</p>
              </div>

              <div className="flex items-center gap-1 bg-[#F5F8F8] p-1 rounded-2xl overflow-x-auto scrollbar-hide border border-[#E3EEEE]">
                {['Glucose', 'Hemoglobin', 'Cholesterol', 'Platelets', 'Systolic', 'BMI'].map((param) => (
                  <button
                    key={param}
                    onClick={() => setSelectedTrendParam(param)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedTrendParam === param 
                        ? 'bg-white text-[#1C696D] shadow-2xs font-bold' 
                        : 'text-[#64777C] hover:text-[#18313A]'
                    }`}
                  >
                    {param}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#F5F8F8] p-4 rounded-2xl border border-[#E3EEEE]">
              <div>
                <span className="text-[11px] text-[#64777C] font-semibold block uppercase">Latest {selectedTrendParam}</span>
                <div className="text-2xl font-bold text-[#18313A] mt-0.5">
                  {latestTrendVal !== null ? (
                    <>
                      {latestTrendVal}{' '}
                      <span className="text-xs font-semibold text-[#64777C]">
                        {getUnitForParam(selectedTrendParam)}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-[#64777C]">No data</span>
                  )}
                </div>
              </div>

              {percentChange !== null ? (
                <div className="text-right">
                  <span className="text-[11px] text-[#64777C] font-semibold block uppercase">Change</span>
                  <span className={`text-sm font-bold inline-flex items-center ${isFavorableChange ? 'text-[#48A383]' : 'text-[#C25252]'}`}>
                    <TrendingUp className={`w-4 h-4 mr-1 ${!isFavorableChange && 'rotate-180'}`} />
                    {percentChange}
                  </span>
                </div>
              ) : (
                <div className="text-right text-xs text-[#64777C] font-semibold bg-white px-3 py-1.5 rounded-xl border border-[#E3EEEE]">
                  {trendData.length > 0 ? 'Single Result' : 'No Trend Data'}
                </div>
              )}
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              {loadingTrends ? (
                <div className="text-xs text-[#64777C] animate-pulse font-semibold">Loading trend chart...</div>
              ) : trendData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="medicalTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#55BFC2" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#55BFC2" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64777C" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64777C" fontSize={11} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E3EEEE', color: '#18313A', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                      itemStyle={{ color: '#3AAFA9' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#55BFC2" strokeWidth={3} fillOpacity={1} fill="url(#medicalTrendGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#F5F8F8] rounded-2xl border border-dashed border-[#E3EEEE]">
                  <TrendingUp className="w-8 h-8 text-[#64777C] mb-2" />
                  <p className="text-xs font-bold text-[#18313A]">No trend data available for {selectedTrendParam}</p>
                  <p className="text-[11px] text-[#64777C] mt-0.5">Upload at least 2 medical reports to analyze longitudinal trends over time.</p>
                </div>
              )}
            </div>
          </div>

          {/* RECENT MEDICAL ACTIVITY */}
          <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E3EEEE] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#18313A] tracking-tight">Recent Medical Reports</h2>
                <p className="text-xs text-[#64777C]">Verified clinical document records.</p>
              </div>
              <Link to="/reports" className="text-xs font-bold text-[#3AAFA9] hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6">
              {recentReports.length > 0 ? (
                <div className="space-y-4">
                  {recentReports.map((report) => {
                    const member = members.find((m) => String(m.id) === String(report.memberId || (report as any).member_id));

                    return (
                      <Link
                        key={report.id}
                        to={`/reports/${report.id}`}
                        className="block bg-white hover:bg-[#F5F8F8] p-4 rounded-2xl border border-[#E3EEEE] transition-all shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3.5">
                            <div className="p-3 rounded-xl bg-[#DDF2F1] text-[#3AAFA9] shrink-0">
                              <FileText className="w-5 h-5 text-[#55BFC2]" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#18313A]">
                                {report.title}
                              </h4>
                              <div className="flex items-center space-x-2 text-xs text-[#64777C] mt-0.5">
                                <span className="font-semibold text-[#18313A]">{member ? member.name : 'Patient'}</span>
                                <span>•</span>
                                <span>{new Date(report.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <AbnormalityBadge level={report.abnormality} />
                            <ChevronRight className="w-4 h-4 text-[#64777C]" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#F5F8F8] rounded-2xl border border-dashed border-[#E3EEEE]">
                  <FileText className="w-8 h-8 text-[#64777C] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#18313A]">No medical reports stored for this member</p>
                  <p className="text-[11px] text-[#64777C] mt-1 mb-4">Upload a PDF or image report to start automatic parameter extraction.</p>
                  <Link to="/reports/upload" className="inline-flex items-center px-4 py-2.5 bg-[#55BFC2] text-white text-xs font-bold rounded-xl hover:bg-[#3AAFA9] transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload First Report
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* HEALTH ALERTS PANEL */}
          <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E3EEEE] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#E8B86A]" />
                <h2 className="text-base font-bold text-[#18313A] tracking-tight">Health Alerts</h2>
              </div>
              <Link to="/alerts" className="text-xs font-bold text-[#3AAFA9] hover:underline">
                View All
              </Link>
            </div>

            <div className="p-3 divide-y divide-[#E3EEEE]">
              {activeAlerts.length > 0 ? (
                activeAlerts.slice(0, 4).map((alert) => {
                  const member = members.find((m) => String(m.id) === String(alert.memberId || (alert as any).member_id));

                  let alertBadgeBg = 'bg-[#EBF8F4] text-[#48A383] border-[#D6F2E9]';
                  if (alert.severity === 'Critical') alertBadgeBg = 'bg-[#FDF2F2] text-[#C25252] border-[#FCE4E4]';
                  else if (alert.severity === 'Borderline') alertBadgeBg = 'bg-[#FDF8ED] text-[#D4A050] border-[#FBF0D8]';

                  return (
                    <div key={alert.id} className="p-3 hover:bg-[#F5F8F8] rounded-2xl transition-colors space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {alert.severity === 'Critical' ? (
                            <AlertTriangle className="w-4 h-4 text-[#D96C6C] shrink-0" />
                          ) : (
                            <HeartPulse className="w-4 h-4 text-[#E8B86A] shrink-0" />
                          )}
                          <h4 className="text-xs font-bold text-[#18313A]">{alert.title}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${alertBadgeBg}`}>
                          {alert.severity}
                        </span>
                      </div>

                      <p className="text-xs text-[#64777C] leading-relaxed line-clamp-2 pl-6">
                        {alert.description}
                      </p>

                      <div className="flex items-center justify-between pt-1 pl-6 text-[11px] text-[#64777C]">
                        {member && (
                          <span className="font-semibold text-[#18313A]">{member.name}</span>
                        )}
                        <Link to="/alerts" className="text-[#3AAFA9] font-bold hover:underline">
                          Review →
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-[#64777C]">
                  <CheckCircle2 className="w-6 h-6 text-[#5DBB9A] mx-auto mb-1.5" />
                  <p className="text-[#18313A] font-bold text-xs">All clear</p>
                  <p className="text-[#64777C] text-[11px] mt-0.5">No critical health alerts active.</p>
                </div>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs p-5 space-y-3">
            <h2 className="text-xs font-bold text-[#64777C] uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/reports/upload"
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F5F8F8] hover:bg-[#DDF2F1]/50 border border-[#E3EEEE] text-center transition-all medical-card-hover group"
              >
                <Upload className="w-5 h-5 text-[#55BFC2] mb-1.5" />
                <span className="text-xs font-bold text-[#18313A]">+ Upload Report</span>
              </Link>
              
              <Link
                to="/family"
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F5F8F8] hover:bg-[#DDF2F1]/50 border border-[#E3EEEE] text-center transition-all medical-card-hover group"
              >
                <Users className="w-5 h-5 text-[#55BFC2] mb-1.5" />
                <span className="text-xs font-bold text-[#18313A]">Family Members</span>
              </Link>

              <Link
                to="/trends"
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F5F8F8] hover:bg-[#DDF2F1]/50 border border-[#E3EEEE] text-center transition-all medical-card-hover group"
              >
                <TrendingUp className="w-5 h-5 text-[#55BFC2] mb-1.5" />
                <span className="text-xs font-bold text-[#18313A]">Health Trends</span>
              </Link>

              <Link
                to="/assistant"
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F5F8F8] hover:bg-[#DDF2F1]/50 border border-[#E3EEEE] text-center transition-all medical-card-hover group"
              >
                <Sparkles className="w-5 h-5 text-[#55BFC2] mb-1.5" />
                <span className="text-xs font-bold text-[#18313A]">AI Assistant</span>
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}