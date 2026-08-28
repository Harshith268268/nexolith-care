import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import {
  ArrowLeft,
  Download,
  Share2,
  FileText,
  HeartPulse,
  Activity,
  Stethoscope,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  Calendar,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import { Avatar } from '../components/Avatar';
import { toast } from 'sonner';

export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reports, members, updateReport, deleteReport } = useFamily();
  
  const report = reports.find((r) => String(r.id) === id);
  const member = report
    ? members.find((m) => String(m.id) === String((report as any).memberId ?? (report as any).member_id))
    : undefined;
  const [activeTab, setActiveTab] = useState<'summary' | 'values' | 'original' | 'notes'>('summary');
  const [isEditing, setIsEditing] = useState(false);

  if (!report) return <div className="text-center py-12 text-[#64777C]">Report record not found</div>;

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
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/reports"
            className="p-2.5 bg-white border border-[#E3EEEE] rounded-2xl hover:bg-[#F5F8F8] transition-colors text-[#64777C]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-[#18313A]">
                {report.title}
              </h1>
              <AbnormalityBadge level={report.abnormality} />
            </div>
            <div className="flex items-center text-xs text-[#64777C] space-x-4 font-medium">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#55BFC2]" />
                {new Date(report.date).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {member && (
                <span className="flex items-center">
                  <Avatar
                    name={member.name}
                    src={member.profile_image || member.avatarUrl}
                    size="sm"
                    className="w-4 h-4 mr-1.5"
                  />
                  {member.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2.5 bg-white border border-[#E3EEEE] rounded-2xl hover:bg-[#F5F8F8] transition-colors text-[#55BFC2]"
            title="Edit Report">
            <Edit2 className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2.5 bg-white border border-[#E3EEEE] rounded-2xl hover:bg-rose-50 transition-colors text-[#D96C6C]"
            title="Delete Report">
            <Trash2 className="w-4.5 h-4.5" />
          </button>
          <button
            className="p-2.5 bg-white border border-[#E3EEEE] rounded-2xl hover:bg-[#F5F8F8] transition-colors text-[#64777C]"
            title="Share">
            <Share2 className="w-4.5 h-4.5" />
          </button>
          <button
            className="p-2.5 bg-white border border-[#E3EEEE] rounded-2xl hover:bg-[#F5F8F8] transition-colors text-[#64777C]"
            title="Download PDF">
            <Download className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden">
            <div className="flex border-b border-[#E3EEEE] overflow-x-auto scrollbar-hide">
              {[
                { id: 'summary', label: 'AI Summary', icon: HeartPulse },
                { id: 'values', label: 'Extracted Values', icon: Activity },
                { id: 'original', label: 'Original Document', icon: FileText },
                { id: 'notes', label: "Doctor's Notes", icon: Stethoscope }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-6 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                      isActive 
                        ? 'border-[#55BFC2] text-[#1C696D] bg-[#DDF2F1]/50' 
                        : 'border-transparent text-[#64777C] hover:text-[#18313A] hover:bg-[#F5F8F8]'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 min-h-[380px]">
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <div className="bg-[#EAF6F5] border border-[#B8DEDE]/60 rounded-2xl p-5">
                    <div className="flex items-start">
                      <HeartPulse className="w-5 h-5 text-[#55BFC2] mt-0.5 mr-3 shrink-0" />
                      <div>
                        <h3 className="font-bold text-[#1C696D] text-sm mb-1.5">
                          Plain English Summary
                        </h3>
                        <p className="text-xs text-[#18313A] leading-relaxed">
                          {report.summary || 'No AI summary available for this report yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {report.abnormality !== 'Normal' && (
                    <div className={`rounded-2xl p-5 border ${report.abnormality === 'Critical' ? 'bg-[#FDF2F2] border-[#FCE4E4]' : 'bg-[#FDF8ED] border-[#FBF0D8]'}`}>
                      <h3 className={`font-bold text-xs mb-2 ${report.abnormality === 'Critical' ? 'text-[#C25252]' : 'text-[#D4A050]'}`}>
                        Key Areas of Concern
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {(report.labValues as any[] | undefined)
                          ?.filter((v: any) => v.status && v.status !== 'Normal')
                          .map((v: any, i: number) => (
                            <li key={i} className={report.abnormality === 'Critical' ? 'text-[#C25252]' : 'text-[#D4A050]'}>
                              <span className="font-bold">{v.parameter}</span>{' '}
                              is {(v.status as string).toLowerCase()} ({v.value} {v.unit})
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'values' && (
                <div>
                  {report.labValues && report.labValues.length > 0 ? (
                    <div className="overflow-x-auto border border-[#E3EEEE] rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F5F8F8] border-b border-[#E3EEEE] text-[#64777C] font-semibold">
                          <tr>
                            <th className="px-4 py-3">Parameter</th>
                            <th className="px-4 py-3">Result</th>
                            <th className="px-4 py-3">Reference Range</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E3EEEE]">
                          {report.labValues.map((val: any, idx: number) => {
                            const status = val.status || 'Normal';
                            return (
                              <tr key={val.id || idx} className="hover:bg-[#F5F8F8]">
                                <td className="px-4 py-3 font-bold text-[#18313A]">
                                  <div>{val.parameter}</div>
                                  {val.explanation && (
                                    <div className="text-[11px] text-[#64777C] font-normal mt-0.5 max-w-md leading-relaxed">
                                      {val.explanation}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-1.5">
                                    {status === 'Critical' && (
                                      <AlertTriangle className="w-3.5 h-3.5 text-[#D96C6C] shrink-0" />
                                    )}
                                    {status === 'Borderline' && (
                                      <AlertCircle className="w-3.5 h-3.5 text-[#E8B86A] shrink-0" />
                                    )}
                                    <span className="font-bold text-[#18313A]">
                                      {val.value}
                                    </span>
                                    <span className="text-[#64777C] ml-1">{val.unit}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[#64777C]">
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
                    <div className="text-center text-[#64777C] text-xs py-12">
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
                        <h4 className="text-xs font-bold text-[#18313A]">Parsed Text Output</h4>
                        {(report as any).file && (
                          <a
                            href={`${API_BASE}${(report as any).file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#3AAFA9] font-bold hover:underline flex items-center"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Download original document
                          </a>
                        )}
                      </div>
                      <pre className="bg-[#F5F8F8] border border-[#E3EEEE] rounded-2xl p-5 text-xs text-[#18313A] whitespace-pre-wrap overflow-auto max-h-[450px] font-mono leading-relaxed">
                        {(report as any).ocrText}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="w-10 h-10 text-[#64777C] mx-auto mb-3" />
                      <p className="text-xs font-bold text-[#18313A]">No raw text view available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  {report.doctorNotes ? (
                    <div className="bg-[#F5F8F8] rounded-2xl p-6 border border-[#E3EEEE] text-xs text-[#18313A] leading-relaxed">
                      "{report.doctorNotes}"
                    </div>
                  ) : (
                    <div className="text-center text-[#64777C] text-xs py-12">
                      No doctor's notes attached to this report.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs p-5">
            <h3 className="text-sm font-bold text-[#18313A] mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-[#55BFC2]" />
              Parameter Summary
            </h3>

            {report.labValues && report.labValues.length > 0 ? (
              <div className="space-y-3">
                {(report.labValues as any[]).slice(0, 3).map((val: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#F5F8F8] rounded-2xl border border-[#E3EEEE]">
                    <div>
                      <p className="text-xs font-bold text-[#18313A]">{val.parameter}</p>
                      <p className="text-[11px] text-[#64777C]">{val.value} {val.unit}</p>
                    </div>
                    <AbnormalityBadge level={val.status || 'Normal'} />
                  </div>
                ))}
                <Link to="/trends" className="block w-full text-center py-2 text-xs text-[#3AAFA9] font-bold hover:underline mt-2">
                  View Full Trends →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-[#64777C]">No lab values extracted.</p>
            )}
          </div>

          <div className="bg-[#EAF6F5] border border-[#B8DEDE]/60 rounded-3xl p-6 text-[#18313A]">
            <h3 className="font-bold text-sm mb-1.5 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-[#55BFC2]" />
              Have questions?
            </h3>
            <p className="text-[#64777C] text-xs mb-4">
              Ask the AI assistant to explain any part of this lab result.
            </p>
            <Link
              to="/assistant"
              className="inline-block w-full text-center bg-[#55BFC2] hover:bg-[#3AAFA9] text-white font-bold py-2.5 rounded-xl transition-colors text-xs shadow-2xs">
              Ask Health Assistant
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Report Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18313A]/30 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-[#E3EEEE]">
            <div className="px-6 py-4 border-b border-[#E3EEEE] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#18313A]">Edit Report</h2>
              <button onClick={() => setIsEditing(false)} className="text-[#64777C] hover:text-[#18313A]">
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
                <label className="block text-xs font-bold text-[#18313A] mb-1">Report Title</label>
                <input required name="title" type="text" defaultValue={report.title} className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Date</label>
                  <input required name="date" type="date" defaultValue={report.date.split('T')[0]} className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Type</label>
                  <select required name="type" defaultValue={report.type} className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none">
                    <option value="Blood">Blood Test</option>
                    <option value="Imaging">Imaging</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Discharge">Discharge Summary</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-[#E3EEEE]">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2.5 text-[#64777C] font-semibold text-xs hover:bg-[#F5F8F8] rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#55BFC2] text-white font-bold text-xs hover:bg-[#3AAFA9] rounded-xl shadow-2xs">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}