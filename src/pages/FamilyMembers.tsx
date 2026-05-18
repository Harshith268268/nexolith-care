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
  };

  const handleMemberClick = (member: FamilyMember) => {
    setActiveMember(member);
    navigate('/dashboard');
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family Members</h1>
          <p className="text-slate-500">
            Manage profiles and view individual health summaries.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm">
          
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) =>
        <div
          key={member.id}
          onClick={() => handleMemberClick(member)}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-pointer overflow-hidden group">
          
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <Avatar name={member.name} src={member.avatarUrl} size="lg" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {member.relation} • {member.age} yrs
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={(e) => handleEditClick(e, member)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDelete(e, member.id.toString())} className="p-1.5 text-slate-400 hover:text-critical-600 hover:bg-critical-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
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
                    {new Date(member.lastReportDate).toLocaleDateString(
                    undefined,
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }
                  )}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">
                  Health Status:
                </span>
                <AbnormalityBadge level={member.overallRisk} />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
            </div>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Add Family Member
              </h2>
              <button
              onClick={() => setIsAddModalOpen(false)}
              className="text-slate-400 hover:text-slate-600">
              
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newMember = {
                name: formData.get('name') as string,
                age: parseInt(formData.get('age') as string),
                relation: formData.get('relation') as string,
                avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(formData.get('name') as string)}`
              };
              try {
                await addMember(newMember);
                setIsAddModalOpen(false);
                toast.success('Family member added!');
              } catch (error: any) {
                console.error("Failed to add member:", error);
                toast.error(`Failed to add member: ${error.message}`);
              }
            }}
            className="p-6 space-y-4">
            
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                required
                name="name"
                type="text"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                placeholder="e.g. Jane Doe" />
              
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Age
                  </label>
                  <input
                  required
                  name="age"
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none"
                  placeholder="e.g. 35" />
                
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Relation
                  </label>
                  <select
                  required
                  name="relation"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none">
                  
                    <option value="Spouse">Spouse</option>
                    <option value="Dependent">Child / Dependent</option>
                    <option value="Parent">Parent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                
                  Cancel
                </button>
                <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors">
                
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      {/* Edit Member Modal */}
      {editingMember &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Edit Family Member
              </h2>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const updatedMember = {
                name: formData.get('name') as string,
                age: parseInt(formData.get('age') as string),
                relation: formData.get('relation') as string,
              };
              try {
                await updateMember(editingMember.id.toString(), updatedMember);
                setEditingMember(null);
                toast.success('Family member updated!');
              } catch (error: any) {
                console.error("Failed to update member:", error);
                toast.error(`Failed to update member: ${error.message}`);
              }
            }}
            className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input required name="name" type="text" defaultValue={editingMember.name} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Age</label>
                  <input required name="age" type="number" min="0" defaultValue={editingMember.age} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Relation</label>
                  <select required name="relation" defaultValue={editingMember.relation} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none">
                    <option value="Spouse">Spouse</option>
                    <option value="Dependent">Child / Dependent</option>
                    <option value="Parent">Parent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditingMember(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>);
}