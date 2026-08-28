import React, { useEffect, useState, useRef } from 'react';
import { Menu, Search, Bell, ChevronDown, Plus, Wifi, Users } from 'lucide-react';
import { useFamily } from '../lib/FamilyContext';
import { Avatar } from './Avatar';
import { useNavigate } from 'react-router-dom';
interface TopbarProps {
  onMenuClick: () => void;
}
export function Topbar({ onMenuClick }: TopbarProps) {
  const { members, activeMember, setActiveMember, alerts, auth } = useFamily();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const activeAlertsCount = alerts.filter(a => a.status === 'Active' || a.status === 'Upcoming').length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="h-20 bg-white border-b border-[#E3EEEE] flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 mr-3 text-[#64777C] hover:bg-[#F5F8F8] rounded-xl lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Member Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2.5 p-2 pr-3 rounded-2xl hover:bg-[#F5F8F8] border border-[#E3EEEE] bg-[#F5F8F8]/50 transition-all shadow-2xs"
          >
            {activeMember ? (
              <>
                <Avatar
                  name={activeMember.name}
                  src={activeMember.avatarUrl || activeMember.profile_image}
                  size="sm"
                />
                <div className="text-left hidden sm:block leading-none">
                  <span className="text-xs font-bold text-[#18313A] block">
                    {activeMember.name}
                  </span>
                  <span className="text-[10px] text-[#64777C] font-medium block mt-0.5">
                    {activeMember.relation}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#64777C]" />
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-[#DDF2F1] text-[#3AAFA9] flex items-center justify-center font-bold text-xs">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block leading-none">
                  <span className="text-xs font-bold text-[#18313A] block">
                    All Family Members
                  </span>
                  <span className="text-[10px] text-[#64777C] font-medium block mt-0.5">
                    {members.length} members tracked
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#64777C]" />
              </>
            )}
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E3EEEE] py-2 z-50 animate-fade-in-up">
              <div className="px-4 py-2 text-[10px] font-semibold text-[#64777C] uppercase tracking-wider">
                Select Patient Profile
              </div>

              <button
                onClick={() => {
                  setActiveMember(null);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs flex items-center space-x-3 transition-colors ${
                  !activeMember ? 'bg-[#DDF2F1]/70 text-[#1C696D] font-bold border-l-4 border-[#3AAFA9]' : 'text-[#18313A] hover:bg-[#F5F8F8]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#DDF2F1] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-[#3AAFA9]" />
                </div>
                <div>
                  <span className="font-bold block">All Members</span>
                  <span className="text-[10px] text-[#64777C]">Combined family view</span>
                </div>
              </button>

              <div className="my-1 border-t border-[#E3EEEE]" />

              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setActiveMember(member);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs flex items-center space-x-3 transition-colors ${
                    activeMember?.id === member.id ? 'bg-[#DDF2F1]/70 text-[#1C696D] font-bold border-l-4 border-[#3AAFA9]' : 'text-[#18313A] hover:bg-[#F5F8F8]'
                  }`}
                >
                  <Avatar name={member.name} src={member.avatarUrl || member.profile_image} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-bold">{member.name}</span>
                    <span className="text-[10px] text-[#64777C] font-medium">
                      {member.relation} • {member.age} yrs
                    </span>
                  </div>
                </button>
              ))}

              <div className="border-t border-[#E3EEEE] mt-2 pt-2 px-2">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/family');
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center space-x-2 text-[#3AAFA9] hover:bg-[#DDF2F1]/50 rounded-xl font-semibold transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[#DDF2F1] flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5 text-[#3AAFA9]" />
                  </div>
                  <span>Add Family Member</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Sync Status Badge */}
        {isOnline ? (
          <div className="hidden md:flex items-center px-3 py-1 bg-[#EBF8F4] text-[#48A383] rounded-full text-xs font-semibold border border-[#D6F2E9]">
            <span className="w-2 h-2 rounded-full bg-[#5DBB9A] mr-2" />
            Synced
          </div>
        ) : (
          <div className="hidden md:flex items-center px-3 py-1 bg-[#FDF8ED] text-[#D4A050] rounded-full text-xs font-semibold border border-[#FBF0D8]">
            <span className="w-2 h-2 rounded-full bg-[#E8B86A] mr-2" />
            Offline Mode
          </div>
        )}

        {/* Notifications Icon Button */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 text-[#64777C] hover:bg-[#F5F8F8] rounded-xl transition-colors"
          title="Clinical Alerts"
        >
          <Bell className="w-5 h-5" />
          {activeAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#D96C6C] rounded-full border-2 border-white" />
          )}
        </button>

        {/* Account User Profile */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center space-x-2 p-1 pl-2 pr-3 rounded-full hover:bg-[#F5F8F8] border border-[#E3EEEE] transition-all bg-[#F5F8F8]/50"
          title="Account Settings"
        >
          <Avatar name={auth.username || 'User'} size="sm" />
          {auth.username && (
            <span className="text-xs font-bold text-[#18313A] hidden lg:inline-block">
              {auth.username}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}