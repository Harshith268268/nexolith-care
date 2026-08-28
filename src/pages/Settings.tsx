import React, { useState, useEffect, useRef } from 'react';
import { useFamily, API_BASE } from '../lib/FamilyContext';
import { 
  User, 
  Users, 
  Bell, 
  Shield, 
  Wifi, 
  Info, 
  Save, 
  Upload, 
  Trash2, 
  Edit3, 
  Plus, 
  Download, 
  Lock, 
  HeartPulse, 
  Cpu, 
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const { auth, members, refreshFamilyData } = useFamily();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [profileLoading, setProfileLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Notification Preference States
  const [alertNotifs, setAlertNotifs] = useState(true);
  const [medReminders, setMedReminders] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [aiWarnings, setAiWarnings] = useState(true);
  const [uploadConfirm, setUploadConfirm] = useState(true);

  // Security Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);

  // Family Management Modals & Forms
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberName, setMemberName] = useState('');
  const [memberAge, setMemberAge] = useState('');
  const [memberRelation, setMemberRelation] = useState('Dependent');
  const [familyLoading, setFamilyLoading] = useState(false);

  // Fetch full User Details on load
  const loadUserSettings = async () => {
    if (!auth.token) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/profile/`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmail(data.email || '');
        if (data.profile) {
          setFullName(data.profile.fullName || data.profile.full_name || '');
          setPhoneNumber(data.profile.phoneNumber || data.profile.phone_number || '');
          const photoPath = data.profile.profilePhotoUrl || data.profile.profile_photo_url;
          if (photoPath) {
            setPhotoUrl(photoPath.startsWith('http') 
              ? photoPath 
              : `${API_BASE}${photoPath}`);
          }
        }
        
        const prefs = data.notificationPreferences || data.notification_preferences;
        if (prefs) {
          setAlertNotifs(prefs.alertNotifications ?? prefs.alert_notifications ?? true);
          setMedReminders(prefs.medicationReminders ?? prefs.medication_reminders ?? true);
          setEmailNotifs(prefs.emailNotifications ?? prefs.email_notifications ?? true);
          setAiWarnings(prefs.aiHealthWarnings ?? prefs.ai_health_warnings ?? true);
          setUploadConfirm(prefs.reportUploadConfirmations ?? prefs.report_upload_confirmations ?? true);
        }
      }
    } catch (err) {
      console.error("Error loading user profiles", err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadUserSettings();
  }, [auth.token]);

  const handleSaveProfile = async () => {
    if (!auth.token) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/profile/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          email,
          profile: {
            fullName: fullName,
            full_name: fullName,
            phoneNumber: phoneNumber,
            phone_number: phoneNumber
          }
        })
      });
      if (res.ok) {
        toast.success("Profile details updated successfully!");
        loadUserSettings();
      } else {
        const errorData = await res.json();
        let errorMsg = "Failed to update profile details.";
        if (errorData && typeof errorData === 'object') {
          const errorsList: string[] = [];
          for (const key in errorData) {
            if (key === 'profile' && typeof errorData.profile === 'object') {
              for (const pKey in errorData.profile) {
                const pErr = errorData.profile[pKey];
                errorsList.push(`Profile ${pKey}: ${Array.isArray(pErr) ? pErr.join(', ') : pErr}`);
              }
            } else if (Array.isArray(errorData[key])) {
              errorsList.push(`${key}: ${errorData[key].join(', ')}`);
            } else if (typeof errorData[key] === 'string') {
              errorsList.push(errorData[key]);
            }
          }
          if (errorsList.length > 0) {
            errorMsg = errorsList.join(' | ');
          }
        }
        toast.error(errorMsg);
      }
    } catch (e: any) {
      toast.error(`Connection error: ${e.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !auth.token) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be 5 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append('profile_photo', file);

    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/profile/photo/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Profile picture updated!");
        const photoPath = data.profilePhotoUrl || data.profile_photo_url;
        if (photoPath) {
          setPhotoUrl(photoPath.startsWith('http') 
            ? photoPath 
            : `${API_BASE}${photoPath}`);
        }
        await loadUserSettings();
        await refreshFamilyData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to upload image.");
      }
    } catch (err: any) {
      toast.error(`Upload error: ${err.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleTogglePreference = async (key: string, currentValue: boolean) => {
    if (!auth.token) return;
    try {
      const nextValue = !currentValue;
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      
      const res = await fetch(`${API_BASE}/api/accounts/profile/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          notification_preferences: {
            [key]: nextValue,
            [camelKey]: nextValue
          }
        })
      });
      if (res.ok) {
        if (key === 'alert_notifications') setAlertNotifs(nextValue);
        if (key === 'medication_reminders') setMedReminders(nextValue);
        if (key === 'email_notifications') setEmailNotifs(nextValue);
        if (key === 'ai_health_warnings') setAiWarnings(nextValue);
        if (key === 'report_upload_confirmations') setUploadConfirm(nextValue);
        toast.success("Preferences updated.");
      } else {
        toast.error("Failed to update preference.");
      }
    } catch (e: any) {
      toast.error(`Preference error: ${e.message}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password fields must match.");
      return;
    }
    setSecurityLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });
      if (res.ok) {
        toast.success("Your password has been changed successfully!");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await res.json();
        let errorMsg = "Failed to update password.";
        if (errorData && typeof errorData === 'object') {
          const errorsList: string[] = [];
          for (const key in errorData) {
            if (Array.isArray(errorData[key])) {
              errorsList.push(`${key}: ${errorData[key].join(', ')}`);
            } else if (typeof errorData[key] === 'string') {
              errorsList.push(errorData[key]);
            }
          }
          if (errorsList.length > 0) {
            errorMsg = errorsList.join(' | ');
          }
        }
        toast.error(errorMsg);
      }
    } catch (err: any) {
      toast.error(`Security error: ${err.message}`);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!auth.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/accounts/export-data/`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "nexolith_care_health_record.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Health records exported successfully!");
      }
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const handleLogoutAll = async () => {
    if (!auth.token) return;
    setSecurityLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/logout-all/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      if (res.ok) {
        toast.success("Logged out from all other sessions.");
      } else {
        toast.error("Failed to revoke sessions.");
      }
    } catch (err: any) {
      toast.error(`Session revocation failed: ${err.message}`);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleOpenFamilyModal = (member = null) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.name);
      setMemberAge(String(member.age));
      setMemberRelation(member.relation);
    } else {
      setEditingMember(null);
      setMemberName('');
      setMemberAge('');
      setMemberRelation('Dependent');
    }
    setIsFamilyModalOpen(true);
  };

  const handleSaveFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;
    setFamilyLoading(true);

    const url = editingMember 
      ? `${API_BASE}/api/family/members/${editingMember.id}/` 
      : `${API_BASE}/api/family/members/`;
    const method = editingMember ? 'PATCH' : 'POST';

    const payload: any = {
      name: memberName,
      age: parseInt(memberAge),
      relation: memberRelation,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingMember ? "Family member updated!" : "New family member added!");
        setIsFamilyModalOpen(false);
        refreshFamilyData();
      } else {
        toast.error("Failed to save member details.");
      }
    } catch (err: any) {
      toast.error(`Family update failure: ${err.message}`);
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleDeleteFamilyMember = async (id: number) => {
    if (!auth.token || !window.confirm("Are you sure you want to remove this family member?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/family/members/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      if (res.ok) {
        toast.success("Family member removed.");
        refreshFamilyData();
      }
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  const handleSyncNow = () => {
    toast.promise(
      refreshFamilyData(),
      {
        loading: 'Syncing local storage cache...',
        success: 'Sync complete!',
        error: 'Sync failed.'
      }
    );
  };

  const tabs = [
    { id: 'profile', label: 'Account Profile', icon: User },
    { id: 'family', label: 'Family Management', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'offline', label: 'Offline & Sync', icon: Wifi },
    { id: 'about', label: 'About Nexolith Care', icon: Info }
  ];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up pb-12">
      <h1 className="text-2xl font-bold text-[#18313A] mb-6">Account Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sub-navigation Bar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs overflow-hidden">
            <nav className="flex flex-col p-2.5 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-3 rounded-2xl text-xs font-semibold transition-colors ${
                      isActive ? 'bg-[#DDF2F1] text-[#1C696D] font-bold' : 'text-[#64777C] hover:bg-[#F5F8F8] hover:text-[#18313A]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-[#3AAFA9]' : 'text-[#64777C]'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dynamic Content Frame */}
        <div className="flex-1">
          <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-2xs p-6 sm:p-8 min-h-[480px] flex flex-col justify-between">
            
            {/* TAB 1: Profile Information */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#18313A] mb-1">Profile Information</h2>
                  <p className="text-xs text-[#64777C]">Update your profile details and picture.</p>
                </div>

                <div className="flex items-center space-x-6 pb-6 border-b border-[#E3EEEE]">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-[#DDF2F1] text-[#2A8F93] flex items-center justify-center font-bold text-2xl overflow-hidden border border-[#B8DEDE]">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        fullName ? fullName[0] : (auth.username ? auth.username[0].toUpperCase() : 'U')
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-[#18313A]/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                      accept="image/*"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#18313A]">Profile Photo</h3>
                    <p className="text-[11px] text-[#64777C] mt-0.5">Supports PNG, JPG up to 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#18313A] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#18313A] mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@example.com"
                      className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#18313A] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-[#E3EEEE] flex justify-end">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className="inline-flex items-center px-5 py-2.5 bg-[#55BFC2] hover:bg-[#3AAFA9] disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-colors shadow-2xs"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Family Management */}
            {activeTab === 'family' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#18313A] mb-1">Family Management</h2>
                    <p className="text-xs text-[#64777C]">Configure family member patient profiles.</p>
                  </div>
                  <button
                    onClick={() => handleOpenFamilyModal()}
                    className="inline-flex items-center px-3.5 py-2 bg-[#DDF2F1] text-[#1C696D] hover:bg-[#B8DEDE]/60 rounded-xl font-bold text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-[#3AAFA9]" /> Add Member
                  </button>
                </div>

                <div className="border border-[#E3EEEE] rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F5F8F8] border-b border-[#E3EEEE] text-[#64777C] font-semibold">
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Relation</th>
                        <th className="px-4 py-3">Age</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3EEEE]">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-[#F5F8F8]">
                          <td className="px-4 py-3 flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-full bg-[#DDF2F1] text-[#2A8F93] flex items-center justify-center font-bold text-xs shrink-0">
                              {member.name[0]}
                            </div>
                            <span className="font-bold text-[#18313A]">{member.name}</span>
                          </td>
                          <td className="px-4 py-3 text-[#64777C] font-medium">{member.relation}</td>
                          <td className="px-4 py-3 text-[#64777C]">{member.age} yrs</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button 
                              onClick={() => handleOpenFamilyModal(member)}
                              className="p-1 hover:bg-[#F5F8F8] rounded text-[#64777C] hover:text-[#18313A]"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteFamilyMember(member.id)}
                              className="p-1 hover:bg-rose-50 rounded text-[#64777C] hover:text-[#D96C6C]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isFamilyModalOpen && (
                  <div className="fixed inset-0 bg-[#18313A]/30 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl border border-[#E3EEEE] shadow-xl max-w-md w-full p-6 space-y-4">
                      <h3 className="text-base font-bold text-[#18313A]">
                        {editingMember ? "Edit Family Member" : "Add Family Member"}
                      </h3>
                      <form onSubmit={handleSaveFamilyMember} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-[#18313A] mb-1">Name</label>
                          <input
                            type="text"
                            required
                            value={memberName}
                            onChange={(e) => setMemberName(e.target.value)}
                            placeholder="Sarah Jenkins"
                            className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[#18313A] mb-1">Age</label>
                            <input
                              type="number"
                              required
                              value={memberAge}
                              onChange={(e) => setMemberAge(e.target.value)}
                              placeholder="41"
                              className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#18313A] mb-1">Relation</label>
                            <select
                              value={memberRelation}
                              onChange={(e) => setMemberRelation(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] outline-none"
                            >
                              <option value="Primary">Primary</option>
                              <option value="Dependent">Dependent</option>
                              <option value="Spouse">Spouse</option>
                              <option value="Parent">Parent</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="pt-4 flex justify-end space-x-2.5 border-t border-[#E3EEEE]">
                          <button
                            type="button"
                            onClick={() => setIsFamilyModalOpen(false)}
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#64777C] hover:bg-[#F5F8F8]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={familyLoading}
                            className="px-5 py-2.5 bg-[#55BFC2] hover:bg-[#3AAFA9] disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                          >
                            {familyLoading ? "Saving..." : "Save Member"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#18313A] mb-1">Notification Preferences</h2>
                  <p className="text-xs text-[#64777C]">Configure clinical alert and reminder notifications.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Abnormal Alert Notifications', desc: 'Trigger warnings for critical lab values.', key: 'alert_notifications', state: alertNotifs },
                    { label: 'Medication Reminders', desc: 'Recurrent warnings for diagnostic checks.', key: 'medication_reminders', state: medReminders },
                    { label: 'Email Reports Summaries', desc: 'Receive AI generated plain summaries via email.', key: 'email_notifications', state: emailNotifs },
                    { label: 'AI Health Warnings', desc: 'Enable trend warning indicators.', key: 'ai_health_warnings', state: aiWarnings }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[#F5F8F8] rounded-2xl border border-[#E3EEEE]">
                      <div>
                        <h4 className="text-xs font-bold text-[#18313A]">{item.label}</h4>
                        <p className="text-[11px] text-[#64777C] mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={() => handleTogglePreference(item.key, item.state)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#E3EEEE] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#55BFC2]" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Privacy & Security */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#18313A] mb-1">Privacy & Security</h2>
                  <p className="text-xs text-[#64777C]">Manage account password and security sessions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#E3EEEE]">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <h3 className="text-xs font-bold text-[#18313A] flex items-center">
                      <Lock className="w-3.5 h-3.5 mr-1.5 text-[#55BFC2]" /> Update Password
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current Password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                      />
                      <input
                        type="password"
                        placeholder="New Password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                      />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F5F8F8] border border-[#E3EEEE] rounded-xl text-xs text-[#18313A] focus:bg-white focus:border-[#55BFC2] outline-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={securityLoading}
                      className="px-4 py-2.5 bg-[#18313A] text-white rounded-xl text-xs font-bold hover:bg-[#2A8F93] transition-colors disabled:opacity-50"
                    >
                      {securityLoading ? "Saving..." : "Change Password"}
                    </button>
                  </form>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#18313A] flex items-center">
                      <Shield className="w-3.5 h-3.5 mr-1.5 text-[#55BFC2]" /> Export Health Records
                    </h3>
                    <p className="text-xs text-[#64777C] leading-relaxed">
                      Download a JSON file containing all family medical records.
                    </p>
                    <button
                      onClick={handleExportData}
                      className="inline-flex items-center px-4 py-2.5 border border-[#E3EEEE] hover:bg-[#F5F8F8] text-[#18313A] rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5 text-[#55BFC2]" /> Export Records
                    </button>
                  </div>
                </div>

                <div className="bg-[#FDF2F2] border border-[#FCE4E4] rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#C25252]">Revoke All Sessions</h4>
                    <p className="text-[11px] text-[#C25252] mt-0.5">Log out from all other active web sessions.</p>
                  </div>
                  <button 
                    onClick={handleLogoutAll}
                    className="px-3.5 py-2 bg-[#D96C6C] hover:bg-[#C25252] text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    Logout All
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: Offline & Sync */}
            {activeTab === 'offline' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#18313A] mb-1">Offline Storage & Sync</h2>
                  <p className="text-xs text-[#64777C]">Manage local device cache synchronization.</p>
                </div>

                <div className="bg-[#F5F8F8] border border-[#E3EEEE] rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[#EBF8F4] text-[#48A383] rounded-full flex items-center justify-center mr-4">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#18313A] text-xs">Sync Connected</h3>
                      <p className="text-[11px] text-[#64777C] mt-0.5">PostgreSQL Database Synced</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSyncNow}
                    className="px-4 py-2 bg-white border border-[#E3EEEE] hover:bg-[#F5F8F8] rounded-xl text-xs font-bold text-[#18313A] transition-colors shadow-2xs"
                  >
                    Sync Now
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: About Nexolith Care */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3.5 pb-4 border-b border-[#E3EEEE]">
                  <div className="w-12 h-12 bg-[#DDF2F1] text-[#3AAFA9] rounded-2xl flex items-center justify-center shrink-0">
                    <HeartPulse className="w-6 h-6 text-[#55BFC2]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#18313A]">Nexolith Care</h2>
                    <p className="text-xs text-[#64777C]">Family Healthcare & Insights Platform</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Version', value: 'v1.2.0-prod', desc: 'Calm Healthcare UI release', icon: Info },
                    { label: 'Database Active', value: 'PostgreSQL Engine', desc: 'Relational data storage', icon: Database },
                    { label: 'AI Assistant', value: 'Ollama Clinical Engine', desc: 'Local medical intelligence', icon: Cpu },
                    { label: 'Security Standard', value: 'HIPAA Compliant', desc: 'Encrypted profile vault', icon: Shield }
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="p-4 rounded-2xl border border-[#E3EEEE] bg-[#F5F8F8] space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-[#55BFC2]" />
                          <h4 className="text-xs font-bold text-[#18313A]">{stat.label}</h4>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#18313A]">{stat.value}</p>
                          <p className="text-[10px] text-[#64777C]">{stat.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-[#E3EEEE] text-xs text-[#64777C]">
                  <span>© 2026 Nexolith Care. All rights reserved.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}