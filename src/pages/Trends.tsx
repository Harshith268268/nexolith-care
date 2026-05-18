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
import { Activity, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import { Link } from 'react-router-dom';

// Known reference ranges for common medical parameters
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
  // Exact match first
  if (KNOWN_RANGES[param]) return KNOWN_RANGES[param];
  // Fuzzy match
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

  // Dynamically aggregate all parameters from all reports for the active member
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

    // Sort each parameter's data by date
    for (const param of Object.keys(paramMap)) {
      paramMap[param].sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    }

    const params = Object.keys(paramMap);
    return { parameters: params, parameterData: paramMap };
  }, [reports, activeMember]);

  // Auto-select first parameter if none selected
  const activeParam = selectedParam && parameterData[selectedParam] ? selectedParam : parameters[0] || null;
  const data = activeParam ? parameterData[activeParam] : [];
  const range = activeParam ? getRange(activeParam) : { min: 0, max: 100, unit: 'units' };

  // Time filtering
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Health Trends</h1>
          <p className="text-slate-500">Track vital parameters over time.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Trend Data Yet</h3>
          <p className="text-slate-500 max-w-sm">
            Upload medical reports with lab values to automatically generate health trend charts.
            Every parameter found in your reports will appear here.
          </p>
          <Link to="/reports/upload" className="mt-6 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors">
            Upload First Report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Health Trends</h1>
          <p className="text-slate-500">
            {parameters.length} parameter{parameters.length !== 1 ? 's' : ''} tracked
            {activeMember ? ` for ${activeMember.name}` : ' across all members'}.
          </p>
        </div>
        {!activeMember && (
          <div className="bg-warning-50 text-warning-700 px-4 py-2 rounded-xl text-sm font-medium border border-warning-100">
            Showing all members. Select one for individual trends.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        {/* Parameter Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex-1 overflow-x-auto scrollbar-hide pb-2 lg:pb-0">
            <div className="flex space-x-2">
              {parameters.map((p) => {
                const pData = parameterData[p];
                const latest = pData[pData.length - 1]?.value;
                const pRange = getRange(p);
                const pStatus = latest !== undefined ? getStatus(latest, pRange.min, pRange.max) : 'Normal';
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedParam(p)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeParam === p ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <span>{p}</span>
                    {pStatus !== 'Normal' && (
                      <span className={`inline-block w-2 h-2 rounded-full ${pStatus === 'Critical' ? 'bg-critical-400' : 'bg-warning-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 bg-slate-100 p-1 rounded-xl">
            {['3M', '6M', '1Y', 'All'].map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${timeRange === tr ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tr}
              </button>
            ))}
          </div>
        </div>

        {activeParam && (
          <>
            {/* Chart header */}
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{activeParam}</h2>
                <p className="text-sm text-slate-500">
                  Normal range: {range.min}–{range.max} {range.unit}
                </p>
              </div>
              {latestValue !== null && (
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Latest Reading</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-slate-900">{latestValue}</span>
                    <span className="text-slate-500">{range.unit}</span>
                    <AbnormalityBadge level={latestStatus} />
                  </div>
                </div>
              )}
            </div>

            {filteredData.length >= 2 ? (
              <div className="h-[300px] sm:h-[400px] w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                      formatter={(val: any) => [`${val} ${range.unit}`, activeParam]}
                    />
                    <ReferenceArea y1={range.min} y2={range.max} fill="#10b981" fillOpacity={0.06} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center bg-slate-50 rounded-xl mb-8 border border-dashed border-slate-200">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Upload at least 2 reports to generate a trend chart.</p>
              </div>
            )}

            {/* History Table */}
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4">Reading History</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Source Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...filteredData].reverse().map((row, i) => {
                      const rowStatus = getStatus(row.value, range.min, range.max);
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-900 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                            {row.fullDate}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {row.value} <span className="text-slate-500 font-normal">{range.unit}</span>
                          </td>
                          <td className="px-4 py-3">
                            <AbnormalityBadge level={rowStatus} />
                          </td>
                          <td className="px-4 py-3">
                            {row.reportId ? (
                              <Link to={`/reports/${row.reportId}`} className="text-primary-600 hover:text-primary-700 font-medium flex items-center">
                                <Activity className="w-4 h-4 mr-1.5" />
                                View Report
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}