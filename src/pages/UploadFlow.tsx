import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../lib/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  HeartPulse,
  Edit3,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { toast } from 'sonner';

type Step = 'upload' | 'processing' | 'review';

interface LabRow {
  parameter: string;
  value: string;
  unit: string;
  range: string;
  status: string;
}

interface ExtractedReport {
  title: string;
  type: string;
  abnormality: string;
  summary: string;
  lab_values: LabRow[];
}

export function UploadFlow() {
  const { members, activeMember, addReport } = useFamily();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('upload');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    activeMember?.id?.toString() || members[0]?.id?.toString() || ''
  );
  const [file, setFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState('Uploading document...');
  const [extractedReport, setExtractedReport] = useState<ExtractedReport | null>(null);
  const [editableRows, setEditableRows] = useState<LabRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const startProcessing = async () => {
    if (!file || !selectedMemberId) return;
    setStep('processing');
    setProcessingStatus('Uploading document...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('member_id', selectedMemberId);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('date', new Date().toISOString().split('T')[0]);
      formData.append('type', 'Blood');

      setProcessingStatus('Extracting text via OCR...');

      const report = await addReport(formData as any);

      setProcessingStatus('AI is analyzing parameters...');

      const result: ExtractedReport = {
        title: report.title || file.name,
        type: report.type || 'Blood',
        abnormality: report.abnormality || 'Normal',
        summary: report.summary || 'OCR extraction complete.',
        lab_values: (report.labValues as LabRow[]) || [],
      };
      setExtractedReport(result);
      setEditableRows(result.lab_values);
      setStep('review');
    } catch (err: any) {
      toast.error(`Processing failed: ${err.message}`);
      setStep('upload');
    }
  };

  const handleSaveEdits = async () => {
    if (!extractedReport) return;
    setIsSaving(true);
    toast.success('Report saved and linked to family profile!');
    navigate('/reports');
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up pb-12">
      {/* Stepper Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#18313A] mb-6">Upload Medical Report</h1>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E3EEEE] -z-10 rounded-full" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#55BFC2] -z-10 rounded-full transition-all duration-500"
            style={{ width: step === 'upload' ? '0%' : step === 'processing' ? '50%' : '100%' }}
          />
          {[
            { id: 'upload', label: 'Upload File', icon: UploadCloud },
            { id: 'processing', label: 'Processing', icon: HeartPulse },
            { id: 'review', label: 'Review Records', icon: CheckCircle2 },
          ].map((s, i) => {
            const isActive = step === s.id;
            const isPast = (step === 'processing' && i === 0) || (step === 'review' && i < 2);
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex flex-col items-center bg-[#F5F8F8] px-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${isActive ? 'border-[#55BFC2] bg-[#DDF2F1] text-[#1C696D]' : isPast ? 'border-[#55BFC2] bg-[#55BFC2] text-white' : 'border-[#E3EEEE] bg-white text-[#64777C]'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-semibold mt-2 ${isActive || isPast ? 'text-[#18313A]' : 'text-[#64777C]'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden min-h-[400px] relative">
        <AnimatePresence mode="wait">

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-6 sm:p-8">
              <div className="mb-6">
                <label className="block text-xs font-bold text-[#18313A] mb-3">Who is this report for?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id.toString())}
                      className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${selectedMemberId === member.id.toString() ? 'border-[#55BFC2] bg-[#DDF2F1]/50' : 'border-[#E3EEEE] hover:border-[#B8DEDE] bg-white'}`}
                    >
                      <Avatar name={member.name} src={member.profile_image || member.avatarUrl} size="md" className="mb-2" />
                      <span className="text-xs font-bold text-[#18313A] text-center">{member.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-colors ${file ? 'border-[#55BFC2] bg-[#DDF2F1]/40' : 'border-[#E3EEEE] hover:border-[#55BFC2] bg-[#F5F8F8]'}`}
              >
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-2xs flex items-center justify-center mb-3 text-[#55BFC2]">
                      <FileText className="w-7 h-7 text-[#55BFC2]" />
                    </div>
                    <p className="text-xs font-bold text-[#18313A]">{file.name}</p>
                    <p className="text-[11px] text-[#64777C] mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button onClick={() => setFile(null)} className="mt-3 text-xs text-[#D96C6C] font-bold hover:underline">
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-[#DDF2F1] text-[#3AAFA9] rounded-2xl flex items-center justify-center mb-3">
                      <UploadCloud className="w-7 h-7 text-[#55BFC2]" />
                    </div>
                    <p className="text-sm font-bold text-[#18313A] mb-1">Drag and drop your report here</p>
                    <p className="text-xs text-[#64777C] mb-5">Supports PDF, JPG, PNG (Max 10MB)</p>
                    <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2.5 bg-white border border-[#E3EEEE] text-[#18313A] rounded-xl text-xs font-bold hover:bg-[#F5F8F8] transition-colors shadow-2xs">
                      Browse Files
                      <input type="file" data-testid="report-file-input" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={startProcessing}
                  disabled={!file || !selectedMemberId}
                  data-testid="start-processing-btn"
                  className="inline-flex items-center justify-center px-6 py-3 bg-[#55BFC2] text-white rounded-xl text-xs font-bold hover:bg-[#3AAFA9] transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process Report <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                <Loader2 className="w-20 h-20 text-[#DDF2F1] animate-spin absolute" />
                <HeartPulse className="w-8 h-8 text-[#55BFC2]" />
              </div>
              <h3 className="text-lg font-bold text-[#18313A] mb-1">Analyzing Report</h3>
              <p className="text-xs text-[#64777C]">{processingStatus}</p>
            </motion.div>
          )}

          {/* STEP 3: REVIEW */}
          {step === 'review' && extractedReport && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 sm:p-8 flex flex-col h-full">
              <div className="mb-5 flex items-start justify-between bg-[#EBF8F4] p-4 rounded-2xl border border-[#D6F2E9]">
                <div className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-[#5DBB9A] mt-0.5 mr-3 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[#48A383]">Extraction Complete</h4>
                    <p className="text-xs text-[#48A383] mt-0.5">{extractedReport.summary}</p>
                  </div>
                </div>
              </div>

              {/* Report Metadata */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="bg-[#F5F8F8] rounded-2xl p-3 text-center border border-[#E3EEEE]">
                  <p className="text-[10px] font-semibold text-[#64777C] mb-0.5">Report Title</p>
                  <p className="text-xs font-bold text-[#18313A] truncate">{extractedReport.title}</p>
                </div>
                <div className="bg-[#F5F8F8] rounded-2xl p-3 text-center border border-[#E3EEEE]">
                  <p className="text-[10px] font-semibold text-[#64777C] mb-0.5">Type</p>
                  <p className="text-xs font-bold text-[#18313A]">{extractedReport.type}</p>
                </div>
                <div className={`rounded-2xl p-3 text-center border ${extractedReport.abnormality === 'Normal' ? 'bg-[#EBF8F4] border-[#D6F2E9]' : extractedReport.abnormality === 'Critical' ? 'bg-[#FDF2F2] border-[#FCE4E4]' : 'bg-[#FDF8ED] border-[#FBF0D8]'}`}>
                  <p className="text-[10px] font-semibold text-[#64777C] mb-0.5">Overall Status</p>
                  <p className={`text-xs font-bold ${extractedReport.abnormality === 'Normal' ? 'text-[#48A383]' : extractedReport.abnormality === 'Critical' ? 'text-[#C25252]' : 'text-[#D4A050]'}`}>
                    {extractedReport.abnormality}
                  </p>
                </div>
              </div>

              {editableRows.length > 0 ? (
                <div className="flex-1 overflow-auto border border-[#E3EEEE] rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F8F8] border-b border-[#E3EEEE] text-[#64777C] font-semibold">
                      <tr>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3">Value</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Range</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3EEEE]">
                      {editableRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F5F8F8]">
                          <td className="px-4 py-3 font-bold text-[#18313A]">{row.parameter}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.value}
                              onChange={(e) => {
                                const updated = [...editableRows];
                                updated[idx].value = e.target.value;
                                setEditableRows(updated);
                              }}
                              className="w-20 bg-transparent border-b border-dashed border-[#64777C] focus:border-[#55BFC2] focus:outline-none text-[#18313A] font-bold"
                            />
                          </td>
                          <td className="px-4 py-3 text-[#64777C]">{row.unit}</td>
                          <td className="px-4 py-3 text-[#64777C]">{row.range}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              row.status === 'Normal' ? 'bg-[#EBF8F4] text-[#48A383]' :
                              row.status === 'Critical' ? 'bg-[#FDF2F2] text-[#C25252]' :
                              'bg-[#FDF8ED] text-[#D4A050]'
                            }`}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 bg-[#F5F8F8] rounded-2xl border border-dashed border-[#E3EEEE]">
                  <AlertCircle className="w-8 h-8 text-[#64777C] mb-2" />
                  <p className="text-xs font-bold text-[#18313A]">No structured parameters detected.</p>
                  <p className="text-[11px] text-[#64777C] mt-1">The report file has been uploaded safely.</p>
                </div>
              )}

              <div className="mt-6 flex justify-between items-center pt-4 border-t border-[#E3EEEE]">
                <button onClick={() => { setStep('upload'); setExtractedReport(null); }} className="text-[#64777C] hover:text-[#18313A] font-semibold text-xs flex items-center">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Upload Another
                </button>
                <button
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-[#55BFC2] text-white rounded-xl text-xs font-bold hover:bg-[#3AAFA9] transition-colors shadow-2xs disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit3 className="w-4 h-4 mr-1.5" />}
                  View Reports
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}