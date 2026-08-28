import React, { useMemo, useState } from 'react';
import { useFamily } from '../lib/FamilyContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { Calendar, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import { Link } from 'react-router-dom';

const KNOWN_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  'Glucose': { min: 70, max: 99, unit: 'mg/dL' },
  'Fasting Glucose': { min: 70, max: 99, unit: 'mg/dL' },
  'HbA1c': { min: 4.0, max: 5.6, unit: '%' },
  'Total Cholesterol': { min: 0, max: 199, unit: 'mg/dL' },
  'LDL': { min: 0, max: 99, unit: 'mg/dL' },
  'HDL': { min: 40, max: 60, unit: 'mg/dL' },
  'Hemoglobin': { min: 12, max: 17.5, unit: 'g/dL' },
  'Triglycerides': { min: 0, max: 149, unit: 'mg/dL' },
  'Creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL' },
  'Systolic BP': { min: 90, max: 120, unit: 'mmHg' },
  'Diastolic BP': { min: 60, max: 80, unit: 'mmHg' },
  'WBC': { min: 4.5, max: 11.0, unit: 'K/μL' },
  'RBC': { min: 4.2, max: 5.9, unit: 'M/μL' },
  'Platelets': { min: 150, max: 400, unit: 'K/μL' },
  'Sodium': { min: 136, max: 145, unit: 'mEq/L' },
  'Potassium': { min: 3.5, max: 5.1, unit: 'mEq/L' },
};

function getRange(param: string): { min: number; max: number; unit: string } {
  if (KNOWN_RANGES[param]) return KNOWN_RANGES[param];
  const lower = param.toLowerCase();
  for (const [key, val] of Object.entries(KNOWN_RANGES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return val;
    }
  }
  return { min: 0, max: 100, unit: 'units' };
}

function getStatus(value: number, min: number, max: number): string {
  if (value >= min && value <= max) return 'Normal';
  const overshoot = Math.abs(value > max ? value - max : min - value);
  const range = max - min;
  return overshoot / range > 0.2 ? 'Critical' : 'Borderline';
}

export function Trends() {
  const { activeMember, reports } = useFamily();
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('All');

  const { parameters, parameterData } = useMemo(() => {
    const memberReports = activeMember
      ? reports.filter((r) => {
          const mid = typeof r.memberId === 'object' ? (r.memberId as any)?.id : r.memberId;
          return String(mid) === String(activeMember.id);
        })
      : reports;

    const paramMap: Record<string, Array<{ date: string; fullDate: string; value: number; reportId: string }>> = {};

    for (const report of memberReports) {
      const labValues = (report.labValues as any[]) || [];
      for (const lv of labValues) {
        const numVal = parseFloat(lv.value);
        if (!lv.parameter || isNaN(numVal)) continue;
        if (!paramMap[lv.parameter]) paramMap[lv.parameter] = [];
        const d = new Date(report.date);
        paramMap[lv.parameter].push({
          date: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          fullDate: d.toLocaleDateString(),
          value: numVal,
          reportId: report.id?.toString() || '',
        });
      }
    }

    for (const param of Object.keys(paramMap)) {
      paramMap[param].sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    }

    const params = Object.keys(paramMap);
    return { parameters: params, parameterData: paramMap };
  }, [reports, activeMember]);

  const activeParam = selectedParam && parameterData[selectedParam] ? selectedParam : parameters[0] || null;
  const data = activeParam ? parameterData[activeParam] : [];
  const range = activeParam ? getRange(activeParam) : { min: 0, max: 100, unit: 'units' };

  const filteredData = useMemo(() => {
    if (timeRange === 'All' || !data.length) return data;
    const now = new Date();
    const months = timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;
    const cutoff = new Date(now.setMonth(now.getMonth() - months));
    return data.filter(d => new Date(d.fullDate) >= cutoff);
  }, [data, timeRange]);

  const latestValue = filteredData.length > 0 ? filteredData[filteredData.length - 1].value : null;
  const latestStatus = latestValue !== null ? getStatus(latestValue, range.min, range.max) : 'Normal';

  if (!parameters.length) {
    return (
      <div className="space-y-6 animate-fade-in-up pb-12">
        <div>
          <h1 className="text-2xl font-bold text-[#18313A]">Health Trends</h1>
          <p className="text-[#64777C] text-xs sm:text-sm mt-0.5">Track vital parameters over time.</p>
        </div>
        <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-[#DDF2F1] text-[#3AAFA9] rounded-2xl flex items-center justify-center mb-3">
            <TrendingUp className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#18313A] mb-1">No health trend data available</h3>
          <p className="text-[#64777C] text-xs max-w-sm">
            Upload a report containing medical measurements to view trends.
          </p>
          <Link to="/reports/upload" className="mt-5 inline-flex items-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors shadow-2xs">
            Upload Report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18313A]">Health Trends</h1>
          <p className="text-[#64777C] text-xs sm:text-sm mt-0.5">
            {parameters.length} parameter{parameters.length !== 1 ? 's' : ''} tracked
            {activeMember ? ` for ${activeMember.name}` : ' across all family members'}.
          </p>
        </div>
        {!activeMember && (
          <div className="bg-[#FDF8ED] text-[#D4A050] px-4 py-2 rounded-2xl text-xs font-semibold border border-[#FBF0D8]">
            Showing all members. Select one for individual curves.
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {parameters.map((param) => (
              <button
                key={param}
                onClick={() => setSelectedParam(param)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeParam === param
                    ? 'bg-[#55BFC2] text-white shadow-2xs'
                    : 'bg-[#F5F8F8] text-[#64777C] hover:text-[#18313A] border border-[#E3EEEE]'
                }`}
              >
                {param}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#F5F8F8] p-1 rounded-xl border border-[#E3EEEE] shrink-0">
            {['All', '3M', '6M', '1Y'].map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === tr
                    ? 'bg-white text-[#18313A] shadow-2xs font-bold'
                    : 'text-[#64777C] hover:text-[#18313A]'
                }`}
              >
                {tr}
              </button>
            ))}
          </div>
        </div>

        {activeParam && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F5F8F8] rounded-2xl border border-[#E3EEEE] gap-4">
              <div>
                <span className="text-[11px] text-[#64777C] font-semibold uppercase block">Parameter Selected</span>
                <span className="text-lg font-bold text-[#18313A]">{activeParam}</span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-[#64777C] font-semibold uppercase block">Reference Range</span>
                  <span className="text-xs font-bold text-[#18313A]">{range.min} - {range.max} {range.unit}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64777C] font-semibold uppercase block">Latest Reading</span>
                  <span className="text-xs font-bold text-[#18313A]">{latestValue !== null ? `${latestValue} ${range.unit}` : 'No data'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64777C] font-semibold uppercase block">Status</span>
                  <AbnormalityBadge level={latestStatus as any} />
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              {filteredData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3EEEE" vertical={false} />
                    <XAxis dataKey="date" stroke="#64777C" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64777C" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E3EEEE', color: '#18313A', fontSize: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#3AAFA9' }}
                    />
                    <ReferenceArea y1={range.min} y2={range.max} fill="#DDF2F1" fillOpacity={0.4} />
                    <Line type="monotone" dataKey="value" stroke="#55BFC2" strokeWidth={3} dot={{ fill: '#3AAFA9', r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-[#F5F8F8] rounded-2xl border border-dashed border-[#E3EEEE]">
                  <TrendingUp className="w-8 h-8 text-[#64777C] mb-2" />
                  <p className="text-xs font-bold text-[#18313A]">No data points for this timeframe</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}