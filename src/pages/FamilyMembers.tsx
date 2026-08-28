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
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FamilyMember } from '../lib/mockData';
import { toast } from 'sonner';

export function FamilyMembers() {
  const { members, setActiveMember, addMember, updateMember, deleteMember } = useFamily();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

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
      let colorClass = 'text-[#48A383] bg-[#EBF8F4] border-[#D6F2E9]';

      if (bmiNum < 18.5) {
        status = 'Underweight';
        colorClass = 'text-[#D4A050] bg-[#FDF8ED] border-[#FBF0D8]';
      } else if (bmiNum >= 25 && bmiNum < 30) {
        status = 'Overweight';
        colorClass = 'text-[#D4A050] bg-[#FDF8ED] border-[#FBF0D8]';
      } else if (bmiNum >= 30) {
        status = 'Obese';
        colorClass = 'text-[#C25252] bg-[#FDF2F2] border-[#FCE4E4]';
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
    <div className="space-y-6 animate-fade-in-up pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18313A]">Family Health Profiles</h1>
          <p className="text-[#64777C] text-xs sm:text-sm mt-0.5">
            {members.length === 0 ? '0 members tracked' : `${members.length} member${members.length !== 1 ? 's' : ''} tracked • Manage family medical profiles, physical vitals, and lab record assignments.`}
          </p>
        </div>
        <button
          onClick={() => {
            setAddHeight('');
            setAddWeight('');
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E3EEEE] p-12 text-center max-w-lg mx-auto my-8 shadow-2xs">
          <div className="w-14 h-14 bg-[#DDF2F1] text-[#3AAFA9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#18313A] mb-1">No family members added yet</h3>
          <p className="text-[#64777C] text-xs mb-6">
            Add a family member to start managing their health profile and medical records.
          </p>
          <button
            onClick={() => {
              setAddHeight('');
              setAddWeight('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => {
            const photo = member.profile_image || member.avatarUrl;
            const hCm = member.height_cm || member.heightCm;
            const wKg = member.weight_kg || member.weightKg;
            const computedBmi = member.bmi || (hCm && wKg ? calculateBmiInfo(hCm.toString(), wKg.toString())?.bmi : null);

            return (
              <div
                key={member.id}
                onClick={() => handleMemberClick(member)}
                className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs hover:shadow-sm medical-card-hover transition-all cursor-pointer overflow-hidden group flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      <Avatar name={member.name} src={photo} size="lg" />
                      <div>
                        <h3 className="text-base font-bold text-[#18313A] group-hover:text-[#3AAFA9] transition-colors">
                          {member.name}
                        </h3>
                        <p className="text-xs text-[#64777C] font-medium">
                          {member.relation} • {member.gender || 'Unspecified'} • {member.age} yrs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEditClick(e, member)}
                        className="p-1.5 text-[#64777C] hover:text-[#55BFC2] hover:bg-[#F5F8F8] rounded-lg transition-colors"
                        title="Edit profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, member.id.toString())}
                        className="p-1.5 text-[#64777C] hover:text-[#D96C6C] hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-[#F5F8F8] rounded-2xl border border-[#E3EEEE] text-center my-4">
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
                      <span className="text-xs font-bold text-[#18313A]">{computedBmi ? computedBmi : '—'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-center justify-between text-[#64777C]">
                      <span className="flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-[#55BFC2]" />
                        Reports Stored
                      </span>
                      <span className="font-bold text-[#18313A]">{member.reportCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#64777C]">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#55BFC2]" />
                        Last Activity
                      </span>
                      <span className="font-medium text-[#18313A]">
                        {member.lastReportDate ? new Date(member.lastReportDate).toLocaleDateString() : 'No reports'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3.5 bg-[#F5F8F8] border-t border-[#E3EEEE] flex items-center justify-between text-xs font-bold text-[#3AAFA9] group-hover:bg-[#EAF6F5] transition-colors">
                  <span>View Full Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18313A]/30 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[#E3EEEE] animate-fade-in-up">
            <div className="px-6 py-4 border-b border-[#E3EEEE] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#18313A]">Add Family Member</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#64777C] hover:text-[#18313A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const relation = formData.get('relation') as any;
                const gender = formData.get('gender') as any;
                const age = parseInt(formData.get('age') as string, 10);
                const height_cm = formData.get('height_cm') ? parseFloat(formData.get('height_cm') as string) : undefined;
                const weight_kg = formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : undefined;

                try {
                  await addMember({
                    name,
                    relation,
                    gender,
                    age,
                    height_cm,
                    weight_kg,
                  });
                  setIsAddModalOpen(false);
                  toast.success(`${name} added to family profiles`);
                } catch (err: any) {
                  toast.error(`Failed to add member: ${err.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#18313A] mb-1">Full Name</label>
                <input
                  required
                  name="name"
                  type="text"
                  placeholder="e.g. Eleanor Jenkins"
                  className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Relationship</label>
                  <select
                    name="relation"
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Dependent">Dependent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Gender</label>
                  <select
                    name="gender"
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Age (Years)</label>
                  <input
                    required
                    name="age"
                    type="number"
                    min="0"
                    max="120"
                    placeholder="e.g. 42"
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Height (cm)</label>
                  <input
                    name="height_cm"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 168"
                    value={addHeight}
                    onChange={(e) => setAddHeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Weight (kg)</label>
                  <input
                    name="weight_kg"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 62"
                    value={addWeight}
                    onChange={(e) => setAddWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  />
                </div>
              </div>

              {addBmiPreview && (
                <div className="p-3 bg-[#F5F8F8] rounded-xl border border-[#E3EEEE] flex items-center justify-between text-xs">
                  <span className="text-[#64777C] font-semibold">Calculated BMI Preview:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${addBmiPreview.colorClass}`}>
                    {addBmiPreview.bmi} kg/m² ({addBmiPreview.status})
                  </span>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-[#E3EEEE]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-[#64777C] font-semibold text-xs hover:bg-[#F5F8F8] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#55BFC2] text-white font-bold text-xs hover:bg-[#3AAFA9] rounded-xl transition-colors shadow-2xs"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18313A]/30 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[#E3EEEE] animate-fade-in-up">
            <div className="px-6 py-4 border-b border-[#E3EEEE] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#18313A]">Edit Profile: {editingMember.name}</h2>
              <button onClick={() => setEditingMember(null)} className="text-[#64777C] hover:text-[#18313A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const relation = formData.get('relation') as any;
                const gender = formData.get('gender') as any;
                const age = parseInt(formData.get('age') as string, 10);
                const height_cm = formData.get('height_cm') ? parseFloat(formData.get('height_cm') as string) : undefined;
                const weight_kg = formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : undefined;

                try {
                  await updateMember(editingMember.id.toString(), {
                    name,
                    relation,
                    gender,
                    age,
                    height_cm,
                    weight_kg,
                  });
                  setEditingMember(null);
                  toast.success('Profile updated');
                } catch (err: any) {
                  toast.error(`Failed to update profile: ${err.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#18313A] mb-1">Full Name</label>
                <input
                  required
                  name="name"
                  type="text"
                  defaultValue={editingMember.name}
                  className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Relationship</label>
                  <select
                    name="relation"
                    defaultValue={editingMember.relation}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Dependent">Dependent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Gender</label>
                  <select
                    name="gender"
                    defaultValue={editingMember.gender || 'Female'}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Age</label>
                  <input
                    required
                    name="age"
                    type="number"
                    min="0"
                    max="120"
                    defaultValue={editingMember.age}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Height (cm)</label>
                  <input
                    name="height_cm"
                    type="number"
                    step="0.1"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Weight (kg)</label>
                  <input
                    name="weight_kg"
                    type="number"
                    step="0.1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  />
                </div>
              </div>

              {editBmiPreview && (
                <div className="p-3 bg-[#F5F8F8] rounded-xl border border-[#E3EEEE] flex items-center justify-between text-xs">
                  <span className="text-[#64777C] font-semibold">Calculated BMI Preview:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${editBmiPreview.colorClass}`}>
                    {editBmiPreview.bmi} kg/m² ({editBmiPreview.status})
                  </span>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-[#E3EEEE]">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2.5 text-[#64777C] font-semibold text-xs hover:bg-[#F5F8F8] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#55BFC2] text-white font-bold text-xs hover:bg-[#3AAFA9] rounded-xl transition-colors shadow-2xs"
                >
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}