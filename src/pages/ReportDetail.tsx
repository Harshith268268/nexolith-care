import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import { mockMembers } from '../lib/mockData';
import {
  ArrowLeft,
  Download,
  Share2,
  FileText,
  BrainCircuit,
  Activity,
  Stethoscope,
  Info,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X } from
'lucide-react';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import { Avatar } from '../components/Avatar';
import { toast } from 'sonner';
export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reports, members, updateReport, deleteReport } = useFamily();
  
  const report = reports.find((r) => String(r.id) === id);
  // memberId can be a number (from backend) or string
  const member = report
    ? members.find((m) => String(m.id) === String((report as any).memberId ?? (report as any).member_id))
    : undefined;
  const [activeTab, setActiveTab] = useState<'summary' | 'values' | 'original' | 'notes'>('summary');
  const [isEditing, setIsEditing] = useState(false);

  if (!report) return <div className="text-center py-12 text-slate-500">Report not found</div>;

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      try {
        await deleteReport(report.id.toString());
        toast.success('Report deleted successfully');
        navigate('/reports');
      } catch (err: any) {
        toast.error(`Failed to delete report: ${err.message}`);
      }
    }
  };
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/reports"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500">
            
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {report.title}
              </h1>
              <AbnormalityBadge level={report.abnormality} />
            </div>
            <div className="flex items-center text-sm text-slate-500 space-x-4">
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1.5" />
                {new Date(report.date).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {member &&
              <span className="flex items-center">
                  <Avatar
                  name={member.name}
                  src={member.avatarUrl}
                  size="sm"
                  className="w-5 h-5 mr-1.5" />
                
                  {member.name}
                </span>
              }
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-primary-600"
            title="Edit Report">
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-critical-50 transition-colors text-critical-600"
            title="Delete Report">
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
            title="Share">
            <Share2 className="w-5 h-5" />
          </button>
          <button
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
            title="Download PDF">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
              {[
              {
                id: 'summary',
                label: 'AI Summary',
                icon: BrainCircuit
              },
              {
                id: 'values',
                label: 'Extracted Values',
                icon: Activity
              },
              {
                id: 'original',
                label: 'Original Document',
                icon: FileText
              },
              {
                id: 'notes',
                label: "Doctor's Notes",
                icon: Stethoscope
              }].
              map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${isActive ? 'border-primary-500 text-primary-600 bg-primary-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                    
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>);

              })}
            </div>

            <div className="p-6 min-h-[400px]">
              {activeTab === 'summary' &&
              <div className="space-y-6">
                  <div className="bg-primary-50 border border-primary-100 rounded-xl p-5">
                    <div className="flex items-start">
                      <BrainCircuit className="w-5 h-5 text-primary-600 mt-0.5 mr-3 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-primary-900 mb-2">
                          Plain English Summary
                        </h3>
                        <p className="text-primary-800 leading-relaxed">
                          {report.summary ||
                        'No AI summary available for this report yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {report.abnormality !== 'Normal' && (
                    <div className={`rounded-xl p-5 border ${report.abnormality === 'Critical' ? 'bg-critical-50 border-critical-100' : 'bg-warning-50 border-warning-100'}`}>
                      <h3 className={`font-semibold mb-2 ${report.abnormality === 'Critical' ? 'text-critical-900' : 'text-warning-900'}`}>
                        Key Areas of Concern
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {(report.labValues as any[] | undefined)
                          ?.filter((v: any) => v.status && v.status !== 'Normal')
                          .map((v: any, i: number) => (
                            <li key={i} className={report.abnormality === 'Critical' ? 'text-critical-800' : 'text-warning-800'}>
                              <span className="font-medium">{v.parameter}</span>{' '}
                              is {(v.status as string).toLowerCase()} ({v.value} {v.unit})
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              }

              {activeTab === 'values' && (
                <div>
                  {report.labValues && report.labValues.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium">Parameter</th>
                            <th className="px-4 py-3 font-medium">Result</th>
                            <th className="px-4 py-3 font-medium">Reference Range</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {report.labValues.map((val: any, idx: number) => {
                            const status = val.status || 'Normal';
                            const rowHighlight = status === 'Critical'
                              ? 'bg-critical-50/20 hover:bg-critical-50/30'
                              : status === 'Borderline'
                              ? 'bg-warning-50/20 hover:bg-warning-50/30'
                              : 'hover:bg-slate-50';
                            return (
                              <tr key={val.id || idx} className={`transition-colors ${rowHighlight}`}>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  <div className="flex items-center text-slate-900 font-semibold">
                                    {val.parameter}
                                  </div>
                                  {val.explanation && (
                                    <div className="text-xs text-slate-500 font-normal mt-0.5 max-w-md leading-relaxed">
                                      {val.explanation}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-1.5">
                                    {status === 'Critical' && (
                                      <AlertTriangle className="w-4 h-4 text-critical-600 shrink-0" title="Critical Warning!" />
                                    )}
                                    {status === 'Borderline' && (
                                      <AlertCircle className="w-4 h-4 text-warning-600 shrink-0" title="Borderline Warning" />
                                    )}
                                    <span className={`font-semibold ${status === 'Critical' ? 'text-critical-600' : status === 'Borderline' ? 'text-warning-600' : 'text-slate-900'}`}>
                                      {val.value}
                                    </span>
                                    <span className="text-slate-500 ml-1">{val.unit}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {val.range || val.referenceRange || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <AbnormalityBadge level={status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-12">
                      No structured lab values extracted for this report.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'original' && (
                <div>
                  {(report as any).ocrText ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700">Raw OCR Text</h4>
                        {(report as any).file && (
                          <a
                            href={`${API_BASE}${(report as any).file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline flex items-center"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Download original file
                          </a>
                        )}
                      </div>
                      <pre className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-[500px] font-mono leading-relaxed">
                        {(report as any).ocrText}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No OCR text available</p>
                      <p className="text-sm text-slate-400 mt-1">Upload a file to extract text automatically.</p>
                      {(report as any).file && (
                        <a
                          href={`${API_BASE}${(report as any).file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 text-sm text-primary-600 hover:underline flex items-center"
                        >
                          <Download className="w-4 h-4 mr-1" /> Download file
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notes' &&
              <div className="prose prose-slate max-w-none">
                  {report.doctorNotes ?
                <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-100 font-serif text-slate-800 leading-relaxed">
                      "{report.doctorNotes}"
                    </div> :

                <div className="text-center text-slate-500 py-12">
                      No doctor's notes attached to this report.
                    </div>
                }
                </div>
              }
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-primary-500" />
              Compare to Previous
            </h3>

            {report.labValues && report.labValues.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 mb-2">Key parameters from this report</p>
                {(report.labValues as any[]).slice(0, 3).map((val: any, i: number) => {
                  const isBetter = val.status === 'Normal';
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{val.parameter}</p>
                        <p className="text-xs text-slate-500">{val.value} {val.unit}</p>
                      </div>
                      <AbnormalityBadge level={val.status || 'Normal'} />
                    </div>
                  );
                })}
                <Link to="/trends" className="block w-full text-center py-2 text-sm text-primary-600 font-medium hover:bg-primary-50 rounded-lg transition-colors mt-2">
                  View Full Trends →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No lab values extracted from this report.</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-sm p-6 text-white">
            <h3 className="font-bold mb-2 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Have questions?
            </h3>
            <p className="text-primary-100 text-sm mb-4">
              Ask the AI assistant to explain any part of this report in detail.
            </p>
            <Link
              to="/assistant"
              className="inline-block w-full text-center bg-white text-primary-700 font-medium py-2 rounded-xl hover:bg-primary-50 transition-colors text-sm shadow-sm">
              
              Ask AI Assistant
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Report Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Report</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedReport = {
                  title: formData.get('title') as string,
                  date: formData.get('date') as string,
                  type: formData.get('type') as string,
                };
                try {
                  await updateReport(report.id.toString(), updatedReport);
                  setIsEditing(false);
                  toast.success('Report updated successfully!');
                } catch (error: any) {
                  console.error("Failed to update report:", error);
                  toast.error(`Failed to update report: ${error.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Report Title</label>
                <input required name="title" type="text" defaultValue={report.title} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input required name="date" type="date" defaultValue={report.date.split('T')[0]} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select required name="type" defaultValue={report.type} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none">
                    <option value="Blood">Blood Test</option>
                    <option value="Imaging">Imaging</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Discharge">Discharge Summary</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
import { Calendar, TrendingUp, MessageSquare } from 'lucide-react';