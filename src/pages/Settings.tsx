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
  Check, 
  Download, 
  Lock, 
  Activity, 
  Cpu, 
  Database,
  ExternalLink
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
        
        // Map account states supporting both camelCase and snake_case
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
      logger.error(`Error loading user profiles: ${err}`);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadUserSettings();
  }, [auth.token]);

  // Handle Save Profile Changes
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
        console.error("Profile save failed:", errorData);
        
        // Format precise backend validation messages
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

  // Handle Profile Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !auth.token) return;

    const file = files[0];
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
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err: any) {
      toast.error(`Upload error: ${err.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  // Toggle dynamic notification preferences instantly
  const handleTogglePreference = async (key: string, currentValue: boolean) => {
    if (!auth.token) return;
    try {
      const nextValue = !currentValue;
      // Convert key to camelCase for full compatibility
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
        // Update local toggle state
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

  // Change Password Action
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
        console.error("Password update failed:", errorData);
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

  // Export JSON Clinical Records
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

  // Revoke Concurrent Sessions (Logout All)
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
        toast.success("Successfully logged out all concurrent sessions.");
      } else {
        toast.error("Failed to revoke concurrent sessions.");
      }
    } catch (err: any) {
      toast.error(`Session revocation failed: ${err.message}`);
    } finally {
      setSecurityLoading(false);
    }
  };

  // Family CRUD actions
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

    // Clean payload: only include avatarUrl if it is a valid absolute URL.
    // This supports both Add Member and Edit Member flows perfectly.
    if (editingMember) {
      if (editingMember.avatarUrl && typeof editingMember.avatarUrl === 'string' && editingMember.avatarUrl.startsWith('http')) {
        payload.avatarUrl = editingMember.avatarUrl;
      }
    } else {
      const generatedAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${memberName || 'Default'}`;
      if (generatedAvatar && typeof generatedAvatar === 'string' && generatedAvatar.startsWith('http')) {
        payload.avatarUrl = generatedAvatar;
      }
    }

    console.log("Family Member save triggered:", {
      method,
      url,
      memberId: editingMember ? editingMember.id : 'NEW_NODE',
      payload
    });

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
        const errorData = await res.json();
        console.error("Update member failed:", {
          status: res.status,
          statusText: res.statusText,
          errors: errorData,
          memberId: editingMember ? editingMember.id : null,
          payload
        });

        // Format and render precise backend validation message
        let errorMsg = "Failed to save member details.";
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
      console.error("Network error during family member update:", err);
      toast.error(`Family CRUD failure: ${err.message}`);
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleDeleteFamilyMember = async (id: number) => {
    if (!auth.token || !window.confirm("Are you sure you want to remove this family member? All associated reports, lab trends, and warnings will be permanently deleted!")) return;
    try {
      const res = await fetch(`${API_BASE}/api/family/members/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      if (res.ok) {
        toast.success("Family member successfully removed.");
        refreshFamilyData();
      }
    } catch (e: any) {
      toast.error(`Delete failed: ${e.message}`);
    }
  };

  // Sync actions
  const handleSyncNow = () => {
    toast.promise(
      refreshFamilyData(),
      {
        loading: 'Syncing local storage cache with production database...',
        success: 'Sync complete! All reports and trends match the PostgreSQL master node.',
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
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sub-navigation Bar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <nav className="flex flex-col p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dynamic Content Frame */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 min-h-[500px] flex flex-col justify-between">
            
            {/* TAB 1: Profile Information */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1.5">Profile Information</h2>
                  <p className="text-xs text-slate-500">Update your account detail profile and avatar.</p>
                </div>

                <div className="flex items-center space-x-6 pb-6 border-b border-slate-100">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-2xl overflow-hidden border border-slate-200 shadow-inner">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        fullName ? fullName[0] : 'U'
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold cursor-pointer"
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
                    <h3 className="text-sm font-bold text-slate-800">Profile Image</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Supports PNG, JPG up to 5MB. Visual is dynamically synced in headers.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@example.com"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-sm text-sm"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Family Management */}
            {activeTab === 'family' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1.5">Family Management</h2>
                    <p className="text-xs text-slate-500">Add, edit, or configure active family member nodes.</p>
                  </div>
                  <button
                    onClick={() => handleOpenFamilyModal()}
                    className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200/50 rounded-xl font-semibold text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Node
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Relation</th>
                        <th className="px-4 py-3">Age</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50/50 text-sm">
                          <td className="px-4 py-3.5 flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {member.name[0]}
                            </div>
                            <span className="font-semibold text-slate-800">{member.name}</span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-medium">{member.relation}</td>
                          <td className="px-4 py-3.5 text-slate-500">{member.age} yrs</td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button 
                              onClick={() => handleOpenFamilyModal(member)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteFamilyMember(member.id)}
                              className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Family Modal overlay */}
                {isFamilyModalOpen && (
                  <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
                      <h3 className="text-base font-bold text-slate-900">
                        {editingMember ? "Edit Family Member" : "Add Family Member"}
                      </h3>
                      <form onSubmit={handleSaveFamilyMember} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                          <input
                            type="text"
                            required
                            value={memberName}
                            onChange={(e) => setMemberName(e.target.value)}
                            placeholder="John Jenkins"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Age</label>
                            <input
                              type="number"
                              required
                              value={memberAge}
                              onChange={(e) => setMemberAge(e.target.value)}
                              placeholder="42"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Relation</label>
                            <select
                              value={memberRelation}
                              onChange={(e) => setMemberRelation(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-sm"
                            >
                              <option value="Primary">Primary</option>
                              <option value="Dependent">Dependent</option>
                              <option value="Spouse">Spouse</option>
                              <option value="Parent">Parent</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="pt-4 flex justify-end space-x-2.5">
                          <button
                            type="button"
                            onClick={() => setIsFamilyModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={familyLoading}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium"
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

            {/* TAB 3: Notifications preference panel */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1.5">Notification Preferences</h2>
                  <p className="text-xs text-slate-500">Configure how you receive clinical reports updates and system diagnostics alerts.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Abnormal Alert Notifications', desc: 'Trigger high priority warning badges for critical values.', key: 'alert_notifications', state: alertNotifs },
                    { label: 'Medication Reminders', desc: 'Recurrent warnings for diagnostic checks and prescriptions.', key: 'medication_reminders', state: medReminders },
                    { label: 'Email Reports Summaries', desc: 'Receive AI generated plain English summaries in inbox.', key: 'email_notifications', state: emailNotifs },
                    { label: 'AI Health Warnings', desc: 'Enable neural trend comparing warnings and risks warnings.', key: 'ai_health_warnings', state: aiWarnings },
                    { label: 'Report Upload Confirmations', desc: 'Verify PDF upload and OCR parse triggers.', key: 'report_upload_confirmations', state: uploadConfirm }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{item.label}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={() => handleTogglePreference(item.key, item.state)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-100 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
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
                  <h2 className="text-lg font-bold text-slate-900 mb-1.5">Privacy & Security</h2>
                  <p className="text-xs text-slate-500">Secure credentials, export full data schemas, and manage permissions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                  {/* Change Password Form */}
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center">
                      <Lock className="w-4 h-4 mr-1 text-slate-400" /> Update Password
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Current Password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-xs"
                      />
                      <input
                        type="password"
                        placeholder="New Password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-xs"
                      />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-xs"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={securityLoading}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-950 transition-colors disabled:opacity-50"
                    >
                      {securityLoading ? "Saving..." : "Change Password"}
                    </button>
                  </form>

                  {/* Account Portability Tools */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center">
                      <Shield className="w-4 h-4 mr-1 text-slate-400" /> Clinical Portability
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Export your entire clinical profile, report libraries, OCR texts, and active warning alerts into a downloadable JSON file.
                    </p>
                    <button
                      onClick={handleExportData}
                      className="inline-flex items-center px-4 py-2 border border-slate-200 hover:border-primary-100 hover:bg-primary-50/20 text-slate-700 hover:text-primary-700 rounded-xl text-xs font-semibold transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Export Medical Records
                    </button>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-rose-800">Revoke Sessions</h4>
                    <p className="text-[11px] text-rose-600 mt-0.5">Logout from all other active browser or mobile devices.</p>
                  </div>
                  <button 
                    onClick={handleLogoutAll}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors"
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
                  <h2 className="text-lg font-bold text-slate-900 mb-1.5">Offline Storage & Sync</h2>
                  <p className="text-xs text-slate-500">Manage local device caches and data synchronization state.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-success-100 text-success-600 rounded-full flex items-center justify-center mr-4">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Sync Node Connected</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Last synced: Live (PostgreSQL & local cache match)</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSyncNow}
                    className="px-4 py-2 bg-white border border-slate-300 hover:border-primary-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-primary-700 transition-colors shadow-sm"
                  >
                    Sync Now
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-700">Encrypted Local Storage Used</span>
                    <span className="text-slate-500">12 MB / 500 MB</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 w-[2.4%]" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: About Nexolith Care */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Nexolith Care</h2>
                    <p className="text-xs text-slate-500">Clinical Data Intelligence System</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'App Version', value: 'v1.2.0-prod', desc: 'Stable master release node', icon: Info },
                    { label: 'Database Active', value: 'PostgreSQL / SQLite fallback', desc: 'Configured for full Railway scale', icon: Database },
                    { label: 'Neural AI Core', value: 'Gemini 2.0 Flash Vision', desc: 'Multimodal extraction prompt core', icon: Cpu },
                    { label: 'OCR Engine', value: 'Tesseract OCR System', desc: 'Direct layout text parsing', icon: Activity }
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-primary-600" />
                          <h4 className="text-xs font-bold text-slate-900">{stat.label}</h4>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{stat.value}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{stat.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>© 2026 Nexolith Care Systems. All rights reserved.</span>
                  <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center hover:text-primary-600 font-semibold">
                    Documentation <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}