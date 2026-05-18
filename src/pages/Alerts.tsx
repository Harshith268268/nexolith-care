import React, { useState } from 'react';
import { useFamily } from '../lib/FamilyContext';
import { Bell, Calendar, Check, Clock, Plus, AlertCircle, X, Edit2, Trash2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Alert } from '../lib/mockData';
import { toast } from 'sonner';
export function Alerts() {
  const { activeMember, members, alerts, addAlert, updateAlert, deleteAlert, markAlertRead } = useFamily();
  const [activeTab, setActiveTab] = useState<'Active' | 'Upcoming' | 'History'>('Active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        await deleteAlert(id);
        toast.success('Alert deleted');
      } catch (err: any) {
        toast.error(`Failed to delete: ${err.message}`);
      }
    }
  };
  const displayAlerts = alerts.filter((a) => {
    const mId = a.memberId || (a as any).member_id;
    if (activeMember && String(mId) !== String(activeMember.id)) return false;
    return a.status === activeTab;
  });
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-critical-50 border-critical-200 text-critical-700';
      case 'Borderline':
        return 'bg-warning-50 border-warning-200 text-warning-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };
  const getIcon = (type: string, severity: string) => {
    if (type === 'Alert')
    return (
      <AlertCircle
        className={`w-5 h-5 ${severity === 'Critical' ? 'text-critical-500' : 'text-warning-500'}`} />);


    return <Calendar className="w-5 h-5 text-slate-500" />;
  };
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Alerts & Reminders
          </h1>
          <p className="text-slate-500">
            Stay on top of follow-ups and critical health events.
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm">
          <Plus className="w-5 h-5 mr-2" />
          New Reminder
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          {['Active', 'Upcoming', 'History'].map((tab) =>
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary-500 text-primary-600 bg-primary-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            
              {tab}
            </button>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {displayAlerts.length > 0 ?
          <div className="space-y-4">
              {displayAlerts.map((alert) => {
              const member = members.find((m) => String(m.id) === String(alert.memberId || (alert as any).member_id));
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border ${getSeverityStyle(alert.severity)} flex flex-col sm:flex-row gap-4`}>
                  
                    <div className="flex items-start flex-1">
                      <div className="mt-1 mr-4 shrink-0">
                        {getIcon(alert.type, alert.severity)}
                      </div>
                      <div>
                        <div className="flex items-center mb-1">
                          <h3 className="font-bold text-slate-900 mr-3">
                            {alert.title}
                          </h3>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 border border-current opacity-80">
                            {alert.type}
                          </span>
                        </div>
                        <p className="text-sm opacity-90 mb-3">
                          {alert.description}
                        </p>
                        <div className="flex items-center text-xs font-medium opacity-75 space-x-4">
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {new Date(alert.date).toLocaleDateString(
                            undefined,
                            {
                              month: 'long',
                              day: 'numeric'
                            }
                          )}
                          </span>
                          {!activeMember && member &&
                        <span className="flex items-center">
                              <Avatar
                            name={member.name}
                            src={member.avatarUrl}
                            size="sm"
                            className="w-4 h-4 mr-1.5" />
                          
                              {member.name}
                            </span>
                        }
                        </div>
                      </div>
                    </div>

                    {activeTab !== 'History' &&
                  <div className="flex sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-current/10 sm:pl-4">
                        <button onClick={() => markAlertRead(alert.id.toString())} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm border border-slate-200 text-slate-700">
                          <Check className="w-4 h-4 mr-1.5 text-success-500" />{' '}
                          Mark Done
                        </button>
                        <button onClick={() => setEditingAlert(alert)} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm border border-slate-200 text-slate-700">
                          <Edit2 className="w-4 h-4 mr-1.5 text-primary-500" />{' '}
                          Edit
                        </button>
                        <button onClick={() => handleDelete(alert.id.toString())} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm border border-slate-200 text-slate-700">
                          <Trash2 className="w-4 h-4 mr-1.5 text-critical-500" />{' '}
                          Delete
                        </button>
                      </div>
                  }
                  </div>);

            })}
            </div> :

          <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">
                No {activeTab.toLowerCase()} alerts
              </h3>
              <p className="text-slate-500">You're all caught up!</p>
            </div>
          }
        </div>
      </div>

      {/* Add Reminder Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add Reminder</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newAlert = {
                  memberId: formData.get('memberId'),
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  date: formData.get('date') as string,
                  severity: 'Normal',
                  type: 'Reminder',
                  status: 'Active'
                };
                try {
                  await addAlert(newAlert);
                  setIsAddModalOpen(false);
                } catch (error) {
                  console.error("Failed to add alert:", error);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Family Member</label>
                <select required name="memberId" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none">
                  <option value="">Select a member...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reminder Title</label>
                <input required name="title" type="text" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" placeholder="e.g. Annual Checkup" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input required name="date" type="date" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea name="description" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none h-24 resize-none" placeholder="Add any extra details..."></textarea>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors">Add Reminder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reminder Modal */}
      {editingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Reminder</h2>
              <button onClick={() => setEditingAlert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedAlert = {
                  memberId: formData.get('memberId'),
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  date: formData.get('date') as string,
                };
                try {
                  await updateAlert(editingAlert.id.toString(), updatedAlert);
                  setEditingAlert(null);
                  toast.success('Alert updated successfully!');
                } catch (error: any) {
                  console.error("Failed to update alert:", error);
                  toast.error(`Failed to update alert: ${error.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Family Member</label>
                 <select required name="memberId" defaultValue={editingAlert.memberId || (editingAlert as any).member_id} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none">
                  <option value="">Select a member...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reminder Title</label>
                <input required name="title" type="text" defaultValue={editingAlert.title} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input required name="date" type="date" defaultValue={editingAlert.date.split('T')[0]} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea name="description" defaultValue={editingAlert.description} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none h-24 resize-none"></textarea>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditingAlert(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}