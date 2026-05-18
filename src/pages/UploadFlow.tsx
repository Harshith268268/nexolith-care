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
  BrainCircuit,
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

      // Populate review from the returned report data
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
    toast.success('Report saved and linked to your profile!');
    navigate('/reports');
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Stepper Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Upload Medical Report</h1>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary-500 -z-10 rounded-full transition-all duration-500"
            style={{ width: step === 'upload' ? '0%' : step === 'processing' ? '50%' : '100%' }}
          />
          {[
            { id: 'upload', label: 'Upload', icon: UploadCloud },
            { id: 'processing', label: 'AI Processing', icon: BrainCircuit },
            { id: 'review', label: 'Review', icon: CheckCircle2 },
          ].map((s, i) => {
            const isActive = step === s.id;
            const isPast = (step === 'processing' && i === 0) || (step === 'review' && i < 2);
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex flex-col items-center bg-slate-50 px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isActive ? 'border-primary-500 bg-primary-50 text-primary-600' : isPast ? 'border-primary-500 bg-primary-500 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium mt-2 ${isActive || isPast ? 'text-slate-900' : 'text-slate-500'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] relative">
        <AnimatePresence mode="wait">

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-6 sm:p-8">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">Who is this report for?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id.toString())}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${selectedMemberId === member.id.toString() ? 'border-primary-500 bg-primary-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                    >
                      <Avatar name={member.name} src={member.avatarUrl} size="md" className="mb-2" />
                      <span className="text-xs font-medium text-center text-slate-700">{member.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${file ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}`}
              >
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-primary-600">
                      <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button onClick={() => setFile(null)} className="mt-4 text-sm text-critical-600 hover:text-critical-700 font-medium">
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-500">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="text-base font-medium text-slate-900 mb-1">Drag and drop your report here</p>
                    <p className="text-sm text-slate-500 mb-6">Supports PDF, JPG, PNG (Max 10MB)</p>
                    <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm">
                      Browse Files
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={startProcessing}
                  disabled={!file || !selectedMemberId}
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Process with AI <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
              <div className="relative w-24 h-24 mb-8">
                <Loader2 className="w-24 h-24 text-primary-200 animate-spin absolute top-0 left-0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BrainCircuit className="w-10 h-10 text-primary-600 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Report</h3>
              <p className="text-slate-500 animate-pulse">{processingStatus}</p>
              <p className="text-xs text-slate-400 mt-3">This may take 10–30 seconds depending on the file size.</p>
            </motion.div>
          )}

          {/* STEP 3: REVIEW */}
          {step === 'review' && extractedReport && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 sm:p-8 flex flex-col h-full">
              <div className="mb-5 flex items-start justify-between bg-success-50 p-4 rounded-xl border border-success-100">
                <div className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-success-600 mt-0.5 mr-3 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-success-900">Extraction Complete</h4>
                    <p className="text-sm text-success-700 mt-1">{extractedReport.summary}</p>
                  </div>
                </div>
              </div>

              {/* Report metadata */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Report Title</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{extractedReport.title}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Type</p>
                  <p className="text-sm font-semibold text-slate-900">{extractedReport.type}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${extractedReport.abnormality === 'Normal' ? 'bg-success-50' : extractedReport.abnormality === 'Critical' ? 'bg-critical-50' : 'bg-warning-50'}`}>
                  <p className="text-xs text-slate-500 mb-1">Overall Status</p>
                  <p className={`text-sm font-semibold ${extractedReport.abnormality === 'Normal' ? 'text-success-700' : extractedReport.abnormality === 'Critical' ? 'text-critical-700' : 'text-warning-700'}`}>
                    {extractedReport.abnormality}
                  </p>
                </div>
              </div>

              {editableRows.length > 0 ? (
                <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Parameter</th>
                        <th className="px-4 py-3 font-medium">Value</th>
                        <th className="px-4 py-3 font-medium">Unit</th>
                        <th className="px-4 py-3 font-medium">Range</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editableRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.parameter}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.value}
                              onChange={(e) => {
                                const updated = [...editableRows];
                                updated[idx].value = e.target.value;
                                setEditableRows(updated);
                              }}
                              className="w-20 bg-transparent border-b border-dashed border-slate-300 focus:border-primary-500 focus:outline-none text-slate-900"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                          <td className="px-4 py-3 text-slate-500">{row.range}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              row.status === 'Normal' ? 'bg-success-50 text-success-700' :
                              row.status === 'Critical' ? 'bg-critical-50 text-critical-700' :
                              'bg-warning-50 text-warning-700'
                            }`}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No structured parameters were detected.</p>
                  <p className="text-sm text-slate-400 mt-1">The report has been saved. You can view the raw OCR text in the report detail.</p>
                </div>
              )}

              <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100">
                <button onClick={() => { setStep('upload'); setExtractedReport(null); }} className="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Upload Another
                </button>
                <button
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit3 className="w-4 h-4 mr-2" />}
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