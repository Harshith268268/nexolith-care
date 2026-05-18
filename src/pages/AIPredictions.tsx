import React, { useState, useEffect } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import {
  BrainCircuit,
  AlertTriangle,
  ShieldCheck,
  Info,
  ArrowRight,
  Activity,
  Heart,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AIPredictions() {
  const { activeMember, auth } = useFamily();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeMember || !auth.token) {
      setData(null);
      return;
    }

    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/analytics/predictions/?member_id=${activeMember.id}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        if (res.ok) {
          const payload = await res.json();
          setData(payload);
        }
      } catch (err) {
        console.error("Failed to load live health predictions", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [activeMember, auth.token]);

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'Critical':
      case 'High':
        return {
          bg: 'bg-critical-50 border-critical-200 text-critical-700',
          badge: 'bg-critical-500 text-white',
          text: 'text-critical-600',
          meter: 'bg-critical-500'
        };
      case 'Borderline':
      case 'Moderate':
        return {
          bg: 'bg-warning-50 border-warning-200 text-warning-700',
          badge: 'bg-warning-500 text-white',
          text: 'text-warning-600',
          meter: 'bg-warning-500'
        };
      case 'Low':
      case 'Normal':
        return {
          bg: 'bg-success-50 border-success-200 text-success-700',
          badge: 'bg-success-500 text-white',
          text: 'text-success-600',
          meter: 'bg-success-500'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          badge: 'bg-slate-500 text-white',
          text: 'text-slate-600',
          meter: 'bg-slate-500'
        };
    }
  };

  const hasInsufficientReports = data?.predictions?.length === 0 && data?.summary?.includes("at least 2 reports");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <BrainCircuit className="w-6 h-6 mr-2.5 text-primary-600 animate-pulse" />
            AI Health Projections
          </h1>
          <p className="text-slate-500 mt-1">
            Intelligent wellness forecasting based on historical laboratory trend progressions.
          </p>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start shadow-sm">
        <Info className="w-5 h-5 text-indigo-600 mt-0.5 mr-3 shrink-0" />
        <p className="text-xs sm:text-sm text-indigo-800 leading-relaxed">
          <strong>Disclaimer:</strong> Nexolith Care health predictions are formulated using historical trends and statistical normal ranges. These insights do not represent clinical diagnoses, physical assessments, or emergency advice. Always consult your primary care physician for official clinical evaluations.
        </p>
      </div>

      {!activeMember ? (
        // Prompt to select a member
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            No Member Selected
          </h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            Please choose a family member from the dropdown menu in the sidebar to generate personalized clinical predictions and disease risk forecasting.
          </p>
        </div>
      ) : loading ? (
        // Loading State
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm animate-pulse">Running health forecasting algorithms...</p>
        </div>
      ) : hasInsufficientReports ? (
        // Insufficient Reports Empty State
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-warning-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            Insufficient Reports Loaded
          </h3>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            Upload at least 2 reports for accurate AI prediction analysis. We require historical intervals to compare parameter percentage fluctuations.
          </p>
          <div className="mt-6">
            <Link
              to="/reports/upload"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm text-sm">
              Upload Report
            </Link>
          </div>
        </div>
      ) : data ? (
        // Live Predictions Grid
        <div className="space-y-6">
          {/* Health Score Overview Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Score Circle */}
              <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Health Score</span>
                <div className="relative flex items-center justify-center">
                  {/* Gauge */}
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="50"
                      className="text-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                      stroke="currentColor"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="50"
                      className="text-primary-500"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={314.16}
                      strokeDashoffset={314.16 - (314.16 * data.healthScore) / 100}
                      stroke="currentColor"
                    />
                  </svg>
                  <span className="absolute text-3xl font-extrabold">{data.healthScore}</span>
                </div>
              </div>

              {/* Status and Summary */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {data.member}'s AI Projections
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getRiskStyles(data.overallRisk).bg}`}>
                    Overall: {data.overallRisk}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.summary}
                </p>
                <div className="flex items-center space-x-4 text-xs text-slate-400">
                  <span className="flex items-center">
                    <Activity className="w-4 h-4 mr-1 text-primary-400" />
                    7 Clinical Indicators Checked
                  </span>
                  <span className="flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1 text-emerald-400" />
                    Live Trend Analysis Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Predictions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.predictions.map((p: any, idx: number) => {
              const styles = getRiskStyles(p.severity);
              return (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                  {/* Card Header */}
                  <div className="p-6 border-b border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{p.title}</h3>
                        <span className="text-xs text-slate-400 font-medium">Neural Projection</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${styles.bg}`}>
                        {p.severity} Risk
                      </span>
                    </div>

                    {/* Confidence percentage bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                        <span>AI Confidence</span>
                        <span>{p.confidence}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${styles.meter} transition-all duration-500`}
                          style={{ width: `${p.confidence}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 bg-slate-50/50 flex-1 flex flex-col gap-5">
                    {/* Reason */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1.5 text-indigo-500" />
                        Historical Explanation
                      </h4>
                      <p className="text-slate-700 text-sm leading-relaxed">
                        {p.reason}
                      </p>
                    </div>

                    {/* Preventive Recommendations */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500" />
                        Preventive Suggestion
                      </h4>
                      <p className="text-slate-700 text-sm leading-relaxed">
                        {p.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
                    <span className="text-slate-500">Live analytics synchronizer</span>
                    <Link
                      to="/trends"
                      className="text-primary-600 font-medium hover:text-primary-700 flex items-center">
                      View Trends <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Generic fallback if something is missing
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-slate-500 text-sm">Failed to generate AI projections data.</p>
        </div>
      )}
    </div>
  );
}