import React, { useState } from 'react';
import { useFamily } from '../lib/FamilyContext';
import { Avatar } from '../components/Avatar';
import { AbnormalityBadge } from '../components/AbnormalityBadge';
import {
  Plus,
  FileText,
  Activity,
  Calendar,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  Ruler,
  Scale,
  Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FamilyMember } from '../lib/mockData';
import { toast } from 'sonner';

export function FamilyMembers() {
  const { members, setActiveMember, addMember, updateMember, deleteMember } = useFamily();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // State for live BMI preview in form
  const [addHeight, setAddHeight] = useState<string>('');
  const [addWeight, setAddWeight] = useState<string>('');
  const [editHeight, setEditHeight] = useState<string>('');
  const [editWeight, setEditWeight] = useState<string>('');

  const calculateBmiInfo = (heightCmStr: string, weightKgStr: string) => {
    const h = parseFloat(heightCmStr);
    const w = parseFloat(weightKgStr);
    if (h > 0 && w > 0) {
      const hM = h / 100.0;
      const bmiVal = (w / (hM * hM)).toFixed(1);
      const bmiNum = parseFloat(bmiVal);
      let status = 'Normal Weight';
      let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';

      if (bmiNum < 18.5) {
        status = 'Underweight';
        colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
      } else if (bmiNum >= 25 && bmiNum < 30) {
        status = 'Overweight';
        colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
      } else if (bmiNum >= 30) {
        status = 'Obese';
        colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
      }
      return { bmi: bmiVal, status, colorClass };
    }
    return null;
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this family member? All their reports will be deleted too.')) {
      try {
        await deleteMember(id);
        toast.success('Family member deleted');
      } catch (err: any) {
        toast.error(`Failed to delete: ${err.message}`);
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent, member: FamilyMember) => {
    e.stopPropagation();
    setEditingMember(member);
    setEditHeight(member.height_cm ? member.height_cm.toString() : (member.heightCm ? member.heightCm.toString() : ''));
    setEditWeight(member.weight_kg ? member.weight_kg.toString() : (member.weightKg ? member.weightKg.toString() : ''));
  };

  const handleMemberClick = (member: FamilyMember) => {
    setActiveMember(member);
    navigate('/dashboard');
  };

  const addBmiPreview = calculateBmiInfo(addHeight, addWeight);
  const editBmiPreview = calculateBmiInfo(editHeight, editWeight);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Members</h1>
          <p className="text-slate-500">
            Manage health profiles, physical metrics (Height, Weight, BMI), and lab reports.
          </p>
        </div>
        <button
          onClick={() => {
            setAddHeight('');
            setAddWeight('');
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8">
          <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No family members yet</h3>
          <p className="text-slate-500 mb-6">
            Add a family member to start managing their health profile and medical records.
          </p>
          <button
            onClick={() => {
              setAddHeight('');
              setAddWeight('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => {
            const hCm = member.height_cm || member.heightCm;
            const wKg = member.weight_kg || member.weightKg;
            const computedBmi = member.bmi || (hCm && wKg ? calculateBmiInfo(hCm.toString(), wKg.toString())?.bmi : null);
            const bmiCategory = hCm && wKg ? calculateBmiInfo(hCm.toString(), wKg.toString()) : null;

            return (
              <div
                key={member.id}
                onClick={() => handleMemberClick(member)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-pointer overflow-hidden group flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      <Avatar name={member.name} src={member.avatarUrl} size="lg" />
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                          {member.name}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium">
                          {member.relation} • {member.gender || 'Male'} • {member.age} yrs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => handleEditClick(e, member)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit Health Profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, member.id.toString())}
                        className="p-1.5 text-slate-400 hover:text-critical-600 hover:bg-critical-50 rounded-lg transition-colors"
                        title="Delete Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Physical Health Metrics Badge Grid */}
                  <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Height</span>
                      <span className="text-xs font-bold text-slate-800">{hCm ? `${hCm} cm` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Weight</span>
                      <span className="text-xs font-bold text-slate-800">{wKg ? `${wKg} kg` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">BMI</span>
                      <span className="text-xs font-bold text-primary-700">{computedBmi ? `${computedBmi}` : '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1" /> Reports
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {member.reportCount} stored
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" /> Last Update
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {member.lastReportDate ? new Date(member.lastReportDate).toLocaleDateString(
                          undefined,
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        ) : 'No reports'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-medium">Health Status:</span>
                    <AbnormalityBadge level={member.overallRisk} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add Family Member</h2>
                <p className="text-xs text-slate-500">Enter personal & health metrics for personalized insights</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const gender = formData.get('gender') as string;
                const age = parseInt(formData.get('age') as string);
                const heightStr = formData.get('height_cm') as string;
                const weightStr = formData.get('weight_kg') as string;
                const relation = formData.get('relation') as string;

                const height_cm = heightStr ? parseFloat(heightStr) : undefined;
                const weight_kg = weightStr ? parseFloat(weightStr) : undefined;

                try {
                  await addMember({ name, gender, age, height_cm, weight_kg, relation });
                  setIsAddModalOpen(false);
                  toast.success('Family member added successfully!');
                } catch (error: any) {
                  console.error("Failed to add member:", error);
                  toast.error(`Failed to add member: ${error.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  required
                  name="name"
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    required
                    name="gender"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input
                    required
                    name="age"
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                    placeholder="e.g. 28"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
                  <input
                    name="height_cm"
                    type="number"
                    step="0.1"
                    min="1"
                    value={addHeight}
                    onChange={(e) => setAddHeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                    placeholder="e.g. 165"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                  <input
                    name="weight_kg"
                    type="number"
                    step="0.1"
                    min="1"
                    value={addWeight}
                    onChange={(e) => setAddWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                    placeholder="e.g. 60"
                  />
                </div>
              </div>

              {/* Calculated BMI Preview Display */}
              {addBmiPreview && (
                <div className={`p-3 rounded-xl border text-sm flex items-center justify-between ${addBmiPreview.colorClass}`}>
                  <span className="font-semibold flex items-center">
                    <Activity className="w-4 h-4 mr-1.5" /> Automatically Calculated BMI:
                  </span>
                  <span className="font-bold">{addBmiPreview.bmi} kg/m² ({addBmiPreview.status})</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                <select
                  required
                  name="relation"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Dependent">Child / Dependent</option>
                  <option value="Parent">Parent</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Health Profile</h2>
                <p className="text-xs text-slate-500">Update parameters for {editingMember.name}</p>
              </div>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const gender = formData.get('gender') as string;
                const age = parseInt(formData.get('age') as string);
                const heightStr = formData.get('height_cm') as string;
                const weightStr = formData.get('weight_kg') as string;
                const relation = formData.get('relation') as string;

                const height_cm = heightStr ? parseFloat(heightStr) : undefined;
                const weight_kg = weightStr ? parseFloat(weightStr) : undefined;

                try {
                  await updateMember(editingMember.id.toString(), { name, gender, age, height_cm, weight_kg, relation });
                  setEditingMember(null);
                  toast.success('Health profile updated!');
                } catch (error: any) {
                  console.error("Failed to update member:", error);
                  toast.error(`Failed to update member: ${error.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  required
                  name="name"
                  type="text"
                  defaultValue={editingMember.name}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    required
                    name="gender"
                    defaultValue={editingMember.gender || 'Male'}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input
                    required
                    name="age"
                    type="number"
                    min="1"
                    defaultValue={editingMember.age}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
                  <input
                    name="height_cm"
                    type="number"
                    step="0.1"
                    min="1"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                    placeholder="e.g. 175"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                  <input
                    name="weight_kg"
                    type="number"
                    step="0.1"
                    min="1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                    placeholder="e.g. 70"
                  />
                </div>
              </div>

              {/* Calculated BMI Preview Display */}
              {editBmiPreview && (
                <div className={`p-3 rounded-xl border text-sm flex items-center justify-between ${editBmiPreview.colorClass}`}>
                  <span className="font-semibold flex items-center">
                    <Activity className="w-4 h-4 mr-1.5" /> Calculated BMI:
                  </span>
                  <span className="font-bold">{editBmiPreview.bmi} kg/m² ({editBmiPreview.status})</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                <select
                  required
                  name="relation"
                  defaultValue={editingMember.relation}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Dependent">Child / Dependent</option>
                  <option value="Parent">Parent</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}