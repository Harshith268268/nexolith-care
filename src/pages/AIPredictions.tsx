import React, { useState, useEffect } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import {
  Sparkles,
  AlertTriangle,
  Info,
  Activity,
  TrendingUp,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AIPredictions() {
  const { activeMember, auth, reports, members } = useFamily();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeMember || !auth.token) {
      setData(null);
      return;
    }

    let isMounted = true;
    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/analytics/predictions/?member_id=${activeMember.id}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        if (res.ok && isMounted) {
          const payload = await res.json();
          setData(payload);
        }
      } catch (err) {
        console.error("Failed to load live health predictions", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPredictions();
    return () => {
      isMounted = false;
    };
  }, [activeMember, auth.token, reports]);

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'Critical':
      case 'High':
        return {
          bg: 'bg-[#FDF2F2] border-[#FCE4E4] text-[#C25252]',
          badge: 'bg-[#D96C6C] text-white',
          text: 'text-[#C25252]',
          meter: 'bg-[#D96C6C]'
        };
      case 'Borderline':
      case 'Moderate':
        return {
          bg: 'bg-[#FDF8ED] border-[#FBF0D8] text-[#D4A050]',
          badge: 'bg-[#E8B86A] text-white',
          text: 'text-[#D4A050]',
          meter: 'bg-[#E8B86A]'
        };
      case 'Low':
      case 'Normal':
      default:
        return {
          bg: 'bg-[#EBF8F4] border-[#D6F2E9] text-[#48A383]',
          badge: 'bg-[#5DBB9A] text-white',
          text: 'text-[#48A383]',
          meter: 'bg-[#5DBB9A]'
        };
    }
  };

  const hasZeroMembers = members.length === 0;
  const hasZeroReports = reports.length === 0 || (data && data.summary && data.summary.includes("No AI Predictions Yet"));
  const hasInsufficientData = data && data.predictions && data.predictions.length === 0 && !hasZeroReports;

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18313A] flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-[#55BFC2]" />
            AI Health Projections
          </h1>
          <p className="text-[#64777C] text-xs sm:text-sm mt-0.5">
            Calm, preventive wellness insights computed from historical laboratory parameters.
          </p>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <div className="bg-[#EAF6F5] border border-[#B8DEDE]/60 rounded-2xl p-4 flex items-start shadow-2xs">
        <Info className="w-4 h-4 text-[#3AAFA9] mt-0.5 mr-3 shrink-0" />
        <p className="text-xs text-[#1C696D] leading-relaxed">
          <strong>Disclaimer:</strong> Nexolith Care health predictions are formulated using historical trends and statistical normal ranges. These insights do not represent clinical diagnoses or emergency advice. Always consult your primary care physician for official evaluations.
        </p>
      </div>

      {hasZeroMembers ? (
        <div className="bg-white rounded-3xl border border-[#E3EEEE] p-12 text-center shadow-2xs">
          <div className="w-14 h-14 bg-[#DDF2F1] text-[#3AAFA9] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#18313A] mb-1">
            No family members added yet.
          </h3>
          <p className="text-[#64777C] max-w-md mx-auto text-xs">
            Add a family member profile in the Family section to begin tracking health records.
          </p>
          <div className="mt-5">
            <Link
              to="/family"
              className="inline-flex items-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors shadow-2xs">
              Add Family Member
            </Link>
          </div>
        </div>
      ) : !activeMember ? (
        <div className="bg-white rounded-3xl border border-[#E3EEEE] p-12 text-center shadow-2xs">
          <div className="w-14 h-14 bg-[#DDF2F1] text-[#3AAFA9] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#18313A] mb-1">
            No Member Selected
          </h3>
          <p className="text-[#64777C] max-w-md mx-auto text-xs">
            Please choose a family member from the top switcher to view personalized clinical health projections.
          </p>
        </div>
      ) : loading || !data ? (
        <div className="bg-white rounded-3xl border border-[#E3EEEE] p-12 text-center shadow-2xs space-y-3">
          <div className="w-10 h-10 border-3 border-[#55BFC2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#64777C] text-xs font-semibold">Running health forecasting algorithms...</p>
        </div>
      ) : hasZeroReports ? (
        <div className="bg-white rounded-3xl border border-[#E3EEEE] p-12 text-center shadow-2xs">
          <div className="w-14 h-14 bg-[#F5F8F8] text-[#64777C] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#E3EEEE]">
            <FileText className="w-7 h-7 text-[#55BFC2]" />
          </div>
          <h3 className="text-base font-bold text-[#18313A] mb-1">
            No AI Predictions Yet
          </h3>
          <p className="text-[#64777C] max-w-md mx-auto text-xs">
            Upload a medical report to generate personalized health projections based on your actual medical data.
          </p>
          <div className="mt-5">
            <Link
              to="/reports/upload"
              className="inline-flex items-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors shadow-2xs">
              Upload Report
            </Link>
          </div>
        </div>
      ) : hasInsufficientData ? (
        <div className="bg-white rounded-3xl border border-[#E3EEEE] p-12 text-center shadow-2xs">
          <div className="w-14 h-14 bg-[#FDF8ED] text-[#D4A050] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#FBF0D8]">
            <AlertTriangle className="w-7 h-7 text-[#D4A050]" />
          </div>
          <h3 className="text-base font-bold text-[#18313A] mb-1">
            Insufficient Data
          </h3>
          <p className="text-[#64777C] max-w-md mx-auto text-xs">
            More medical measurements are needed to generate a reliable health projection.
          </p>
          <div className="mt-5">
            <Link
              to="/reports/upload"
              className="inline-flex items-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors shadow-2xs">
              Upload Additional Report
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Health Score Overview Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EEEE] shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#E3EEEE] pb-6 md:pb-0">
                <span className="text-[#64777C] text-xs font-semibold uppercase tracking-wider mb-2">Health Score</span>
                <div className="relative flex items-center justify-center">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="44" stroke="#F5F8F8" strokeWidth="8" fill="transparent" />
                    {data.healthScore !== null && data.healthScore !== undefined && (
                      <circle
                        cx="56"
                        cy="56"
                        r="44"
                        stroke="#55BFC2"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={276.46}
                        strokeDashoffset={276.46 - (276.46 * data.healthScore) / 100}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  {data.healthScore !== null && data.healthScore !== undefined ? (
                    <span className="absolute text-2xl font-bold text-[#18313A]">{data.healthScore}%</span>
                  ) : (
                    <span className="absolute text-xs font-bold text-[#64777C] text-center">Not available</span>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#18313A]">
                    {data.member || 'Member'}'s Projections
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getRiskStyles(data.overallRisk || 'Low').bg}`}>
                    Overall: {data.overallRisk || 'Normal'}
                  </span>
                </div>
                <p className="text-xs text-[#64777C] leading-relaxed">
                  {data.summary || 'Health evaluation complete.'}
                </p>
                <div className="flex items-center space-x-4 text-xs font-semibold text-[#1C696D]">
                  <span className="flex items-center">
                    <Activity className="w-3.5 h-3.5 mr-1 text-[#55BFC2]" />
                    Clinical Indicators Evaluated
                  </span>
                  <span className="flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-1 text-[#5DBB9A]" />
                    Trend Sync Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Predictions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(data.predictions || []).map((p: any, idx: number) => {
              const styles = getRiskStyles(p.severity);
              return (
                <div key={idx} className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden flex flex-col hover:shadow-xs transition-all">
                  <div className="p-6 border-b border-[#E3EEEE] space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-[#18313A]">{p.title}</h3>
                        <span className="text-xs text-[#64777C]">Health Projection</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles.badge}`}>
                        {p.severity} Risk
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[#18313A] leading-relaxed">
                      {p.indicator}
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#64777C]">Model Statistical Confidence</span>
                        <span className="text-[#18313A] font-bold">
                          {p.confidence ? `${p.confidence}%` : 'Not available'}
                        </span>
                      </div>
                      {p.confidence ? (
                        <div className="w-full bg-[#F5F8F8] h-2 rounded-full overflow-hidden border border-[#E3EEEE]">
                          <div
                            className={`h-full rounded-full ${styles.meter} transition-all duration-1000`}
                            style={{ width: `${p.confidence}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-6 bg-[#F5F8F8] flex-1 space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-[#18313A] block mb-1">Observed Parameter Trend:</span>
                      <p className="text-[#64777C] leading-relaxed">{p.trend}</p>
                    </div>

                    {p.recommendation && (
                      <div>
                        <span className="font-bold text-[#1C696D] block mb-1">Preventive Wellness Recommendation:</span>
                        <p className="text-[#18313A] leading-relaxed">{p.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}