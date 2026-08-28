import React, { useState, useMemo } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import {
  Bell,
  Calendar,
  Check,
  Clock,
  Plus,
  AlertCircle,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  MapPin,
  Hospital,
  Stethoscope,
  Navigation,
  Phone,
  ShieldAlert,
  Loader2,
  Mail
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Alert } from '../lib/mockData';
import { toast } from 'sonner';

interface Facility {
  id: number | string;
  name: string;
  category: string;
  priority: number;
  distance_km: number;
  latitude: number;
  longitude: number;
  directions_url: string;
  phone?: string | null;
  emergency?: boolean;
}

export function Alerts() {
  const { activeMember, members, reports, alerts, addAlert, updateAlert, deleteAlert, markAlertRead, auth } = useFamily();
  const [activeTab, setActiveTab] = useState<'Active' | 'Upcoming' | 'History'>('Active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  // Geolocation & Nearby Care State
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

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

  // Calculate PostgreSQL Critical Items for Active Member or All Members
  const criticalItems = useMemo(() => {
    const list: Array<{ memberName: string; title: string; param: string; value: string; unit: string; date: string }> = [];

    // 1. Check alerts in state
    const filteredAlerts = alerts.filter((a) => {
      const mId = a.memberId || (a as any).member_id;
      if (activeMember && String(mId) !== String(activeMember.id)) return false;
      return a.severity === 'Critical' && a.status !== 'History';
    });

    for (const a of filteredAlerts) {
      const m = members.find((mem) => String(mem.id) === String(a.memberId || (a as any).member_id));
      list.push({
        memberName: m ? m.name : 'Primary User',
        title: a.title,
        param: a.title,
        value: a.description,
        unit: '',
        date: a.date
      });
    }

    // 2. Check lab parameters in reports
    const filteredReports = reports.filter((r) => {
      const mId = typeof r.memberId === 'object' ? (r.memberId as any)?.id : r.memberId;
      if (activeMember && String(mId) !== String(activeMember.id)) return false;
      return true;
    });

    for (const r of filteredReports) {
      const m = members.find((mem) => String(mem.id) === String(r.memberId || (r as any).member_id));
      for (const item of (r.labValues || [])) {
        if (item.status === 'Critical') {
          list.push({
            memberName: m ? m.name : 'Primary User',
            title: r.title,
            param: item.parameter,
            value: String(item.value),
            unit: item.unit || '',
            date: r.date
          });
        }
      }
    }

    return list;
  }, [alerts, reports, activeMember, members]);

  const hasCritical = criticalItems.length > 0;

  // Request Browser Location & Fetch Real Backend Nearby Care Facilities
  const handleFindNearbyCare = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Browser does not support geolocation.");
      toast.error("Browser does not support geolocation.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`${API_BASE}/api/alerts/nearby_care/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.token}`
            },
            body: JSON.stringify({
              latitude,
              longitude,
              radius_km: 5.0
            })
          });

          const data = await res.json();
          if (res.ok) {
            setFacilities(data.facilities || []);
            setHasSearched(true);
            toast.success(`Found ${data.facilities_count || 0} nearby medical facilities`);
          } else {
            setLocationError(data.error || "Failed to search nearby medical facilities.");
            toast.error(data.error || "Failed to search nearby facilities");
          }
        } catch (err: any) {
          setLocationError("Unable to retrieve nearby medical facilities right now. Please try again.");
          toast.error("Nearby medical care search failed");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location access was not granted. Enable location permission to find nearby medical facilities.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out. Please try again.");
        } else {
          setLocationError("Location unavailable. Please ensure location services are enabled.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-[#FDF2F2] border-[#FCE4E4] text-[#C25252]';
      case 'Borderline':
        return 'bg-[#FDF8ED] border-[#FBF0D8] text-[#D4A050]';
      default:
        return 'bg-[#EBF8F4] border-[#D6F2E9] text-[#48A383]';
    }
  };

  const getIcon = (type: string, severity: string) => {
    if (type === 'Alert')
      return (
        <AlertCircle
          className={`w-5 h-5 ${severity === 'Critical' ? 'text-[#D96C6C]' : 'text-[#E8B86A]'}`} />
      );
    return <Calendar className="w-5 h-5 text-[#55BFC2]" />;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18313A]">
            Health Alerts & Reminders
          </h1>
          <p className="text-[#64777C] text-xs sm:text-sm mt-0.5">
            Stay informed on clinical follow-ups and vital alerts.
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center justify-center px-4 py-2.5 bg-[#55BFC2] text-white rounded-xl font-bold text-xs hover:bg-[#3AAFA9] transition-colors shadow-2xs">
          <Plus className="w-4 h-4 mr-1.5" />
          New Reminder
        </button>
      </div>

      {/* 1. Dynamic Critical Alert Banner (Triggers ONLY when real Critical values exist in PostgreSQL) */}
      {hasCritical && (
        <div className="bg-[#FDF2F2] border border-[#FCE4E4] rounded-3xl p-6 shadow-2xs animate-fade-in-up space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D96C6C] text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#C25252] tracking-wider uppercase block">
                  Critical Health Alert
                </span>
                <h2 className="text-base font-bold text-[#18313A] mt-0.5">
                  {criticalItems.length > 1
                    ? `Multiple critical health alerts detected (${criticalItems.length})`
                    : `${criticalItems[0].memberName} — ${criticalItems[0].param}`}
                </h2>
                <p className="text-xs text-[#64777C] mt-1 leading-relaxed">
                  {criticalItems.length > 1
                    ? `Multiple critical parameters have been detected across stored reports. Consider seeking prompt medical evaluation.`
                    : `${criticalItems[0].param} reading (${criticalItems[0].value} ${criticalItems[0].unit}) is classified as Critical based on clinical reference ranges.`}
                </p>
              </div>
            </div>

            <button
              onClick={handleFindNearbyCare}
              disabled={isLocating}
              className="px-4 py-2.5 bg-[#D96C6C] hover:bg-[#C25252] text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center shrink-0 disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding care...
                </>
              ) : (
                <>
                  <Hospital className="w-4 h-4 mr-2" />
                  Find Nearby Medical Care
                </>
              )}
            </button>
          </div>

          {locationError && (
            <div className="p-3 bg-white/80 rounded-xl border border-[#FCE4E4] text-xs text-[#C25252] flex items-center justify-between">
              <span>{locationError}</span>
              <button onClick={handleFindNearbyCare} className="font-bold underline ml-2 hover:text-[#18313A]">
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Real Nearby Medical Care Results Section */}
      {hasSearched && (
        <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs p-6 space-y-6 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3EEEE] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#18313A] flex items-center">
                <Hospital className="w-5 h-5 mr-2 text-[#55BFC2]" />
                Nearby Medical Care
              </h2>
              <p className="text-xs text-[#64777C] mt-0.5">Based on your current location coordinates</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-[#F5F8F8] text-[#18313A] rounded-full border border-[#E3EEEE]">
              {facilities.length} facility{facilities.length !== 1 ? 'ies' : ''} found
            </span>
          </div>

          {/* Emergency Safety Disclaimer */}
          <div className="bg-[#FDF8ED] border border-[#FBF0D8] rounded-2xl p-3.5 flex items-start text-xs text-[#D4A050]">
            <ShieldAlert className="w-4 h-4 mr-2.5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Emergency Notice:</strong> If you are experiencing severe or life-threatening symptoms, contact your local emergency services immediately rather than relying on this application.
            </p>
          </div>

          {facilities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {facilities.map((fac) => (
                <div key={fac.id} className="p-4 rounded-2xl border border-[#E3EEEE] bg-[#F5F8F8] hover:bg-white hover:border-[#55BFC2] transition-all space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#DDF2F1] text-[#3AAFA9] flex items-center justify-center shrink-0">
                          {fac.category === 'Hospital' ? (
                            <Hospital className="w-4 h-4" />
                          ) : fac.category === 'Clinic' ? (
                            <Stethoscope className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-[#18313A] text-sm leading-snug">{fac.name}</h3>
                          <span className="text-[10px] font-semibold text-[#64777C]">{fac.category}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white text-[#1C696D] border border-[#E3EEEE] rounded-lg text-xs font-bold shrink-0">
                        {fac.distance_km < 1.0 ? `${Math.round(fac.distance_km * 1000)} m away` : `${fac.distance_km} km away`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#E3EEEE] text-xs">
                    {fac.phone ? (
                      <a href={`tel:${fac.phone}`} className="flex items-center font-semibold text-[#64777C] hover:text-[#18313A]">
                        <Phone className="w-3.5 h-3.5 mr-1 text-[#55BFC2]" />
                        {fac.phone}
                      </a>
                    ) : (
                      <span className="text-[#64777C]">Location Verified</span>
                    )}

                    <a
                      href={fac.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 bg-[#55BFC2] text-white rounded-xl font-bold hover:bg-[#3AAFA9] transition-colors text-xs"
                    >
                      <Navigation className="w-3.5 h-3.5 mr-1" />
                      Get Directions
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-[#64777C]">
              No nearby medical facilities were found within the selected search radius.
            </div>
          )}
        </div>
      )}

      {/* Main Alerts List Card (100% Preserved) */}
      <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden">
        <div className="flex border-b border-[#E3EEEE]">
          {['Active', 'Upcoming', 'History'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 ${
                activeTab === tab 
                  ? 'border-[#55BFC2] text-[#1C696D] bg-[#DDF2F1]/50' 
                  : 'border-transparent text-[#64777C] hover:text-[#18313A] hover:bg-[#F5F8F8]'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {displayAlerts.length > 0 ? (
            <div className="space-y-4">
              {displayAlerts.map((alert) => {
                const member = members.find((m) => String(m.id) === String(alert.memberId || (alert as any).member_id));
                const isEmailSent = (alert as any).emailSent || (alert as any).email_sent;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border ${getSeverityStyle(alert.severity)} flex flex-col sm:flex-row gap-4`}>
                    
                    <div className="flex items-start flex-1">
                      <div className="mt-0.5 mr-3.5 shrink-0">
                        {getIcon(alert.type, alert.severity)}
                      </div>
                      <div>
                        <div className="flex items-center mb-1 flex-wrap gap-2">
                          <h3 className="font-bold text-[#18313A] text-sm">
                            {alert.title}
                          </h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-current opacity-80">
                            {alert.type}
                          </span>
                        </div>
                        <p className="text-xs opacity-90 mb-2.5 leading-relaxed font-medium">
                          {alert.description}
                        </p>
                        <div className="flex items-center text-xs font-semibold opacity-80 space-x-4 flex-wrap gap-y-1">
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {new Date(alert.date).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              }
                            )}
                          </span>
                          {!activeMember && member && (
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

                          {/* Subtle Email Notification Status Badge */}
                          {isEmailSent && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-[#3AAFA9] bg-[#EAF6F5] px-2 py-0.5 rounded-md border border-[#B8DEDE]">
                              <Mail className="w-3 h-3 mr-1 text-[#55BFC2]" />
                              Email sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {activeTab !== 'History' && (
                      <div className="flex sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-current/10 sm:pl-4">
                        <button onClick={() => markAlertRead(alert.id.toString())} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 bg-white rounded-xl text-xs font-semibold hover:bg-[#F5F8F8] transition-colors shadow-2xs border border-[#E3EEEE] text-[#18313A]">
                          <Check className="w-3.5 h-3.5 mr-1 text-[#5DBB9A]" />
                          Mark Done
                        </button>
                        <button onClick={() => setEditingAlert(alert)} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 bg-white rounded-xl text-xs font-semibold hover:bg-[#F5F8F8] transition-colors shadow-2xs border border-[#E3EEEE] text-[#18313A]">
                          <Edit2 className="w-3.5 h-3.5 mr-1 text-[#55BFC2]" />
                          Edit
                        </button>
                        <button onClick={() => handleDelete(alert.id.toString())} className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 bg-white rounded-xl text-xs font-semibold hover:bg-rose-50 transition-colors shadow-2xs border border-[#E3EEEE] text-[#D96C6C]">
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-[#DDF2F1] text-[#3AAFA9] flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#18313A]">No alerts in this view</h3>
              <p className="text-xs text-[#64777C] mt-1">You are up to date on your health notifications.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Alert Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18313A]/30 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[#E3EEEE]">
            <div className="px-6 py-4 border-b border-[#E3EEEE] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#18313A]">Create Health Reminder</h2>
                <p className="text-xs text-[#64777C]">Set a follow-up date or medical alert</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#64777C] hover:text-[#18313A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get('title') as string;
                const description = formData.get('description') as string;
                const type = formData.get('type') as any;
                const severity = formData.get('severity') as any;
                const date = formData.get('date') as string;
                const memberId = formData.get('memberId') as string;

                try {
                  await addAlert({
                    title,
                    description,
                    type,
                    severity,
                    date,
                    memberId: memberId || (activeMember ? activeMember.id.toString() : members[0]?.id.toString() || '1')
                  });
                  setIsAddModalOpen(false);
                  toast.success('Reminder added');
                } catch (err: any) {
                  toast.error(`Failed to add reminder: ${err.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#18313A] mb-1">Title</label>
                <input
                  required
                  name="title"
                  type="text"
                  placeholder="e.g. Annual Blood Pressure Checkup"
                  className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18313A] mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Details for this reminder..."
                  className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Type</label>
                  <select
                    name="type"
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Reminder">Reminder</option>
                    <option value="Alert">Alert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Severity</label>
                  <select
                    name="severity"
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Borderline">Borderline</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Target Date</label>
                  <input
                    required
                    name="date"
                    type="date"
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Assign to Member</label>
                  <select
                    name="memberId"
                    defaultValue={activeMember ? activeMember.id : members[0]?.id}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Alert Modal */}
      {editingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18313A]/30 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[#E3EEEE]">
            <div className="px-6 py-4 border-b border-[#E3EEEE] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#18313A]">Edit Reminder</h2>
                <p className="text-xs text-[#64777C]">Update reminder details</p>
              </div>
              <button onClick={() => setEditingAlert(null)} className="text-[#64777C] hover:text-[#18313A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const title = formData.get('title') as string;
                const description = formData.get('description') as string;
                const type = formData.get('type') as any;
                const severity = formData.get('severity') as any;
                const date = formData.get('date') as string;

                try {
                  await updateAlert(editingAlert.id.toString(), {
                    title,
                    description,
                    type,
                    severity,
                    date,
                  });
                  setEditingAlert(null);
                  toast.success('Reminder updated');
                } catch (err: any) {
                  toast.error(`Failed to update reminder: ${err.message}`);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#18313A] mb-1">Title</label>
                <input
                  required
                  name="title"
                  type="text"
                  defaultValue={editingAlert.title}
                  className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18313A] mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingAlert.description}
                  className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Type</label>
                  <select
                    name="type"
                    defaultValue={editingAlert.type}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Reminder">Reminder</option>
                    <option value="Alert">Alert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18313A] mb-1">Severity</label>
                  <select
                    name="severity"
                    defaultValue={editingAlert.severity}
                    className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Borderline">Borderline</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18313A] mb-1">Target Date</label>
                <input
                  required
                  name="date"
                  type="date"
                  defaultValue={editingAlert.date}
                  className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-[#E3EEEE]">
                <button
                  type="button"
                  onClick={() => setEditingAlert(null)}
                  className="px-4 py-2.5 text-[#64777C] font-semibold text-xs hover:bg-[#F5F8F8] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#55BFC2] text-white font-bold text-xs hover:bg-[#3AAFA9] rounded-xl transition-colors shadow-2xs"
                >
                  Update Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}