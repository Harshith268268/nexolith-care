import React, { useEffect, useState, useRef } from 'react';
import { Menu, Search, Bell, ChevronDown, Plus, Wifi } from 'lucide-react';
import { useFamily } from '../lib/FamilyContext';
import { Avatar } from './Avatar';
import { useNavigate } from 'react-router-dom';
interface TopbarProps {
  onMenuClick: () => void;
}
export function Topbar({ onMenuClick }: TopbarProps) {
  const { members, activeMember, setActiveMember } = useFamily();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node))
      {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
      <div className="flex items-center flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden">
          
          <Menu className="w-5 h-5" />
        </button>

        {/* Member Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 p-1.5 pr-3 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
            
            {activeMember ?
            <>
                <Avatar
                name={activeMember.name}
                src={activeMember.avatarUrl}
                size="sm" />
              
                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                  {activeMember.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </> :

            <span className="text-sm font-medium text-slate-700 px-2">
                All Members
              </span>
            }
          </button>

          {isDropdownOpen &&
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Family Members
              </div>
              <button
              onClick={() => {
                setActiveMember(null);
                setIsDropdownOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-3 hover:bg-slate-50 ${!activeMember ? 'bg-primary-50 text-primary-700' : 'text-slate-700'}`}>
              
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-slate-500" />
                </div>
                <span className="font-medium">All Members</span>
              </button>
              {members.map((member) =>
            <button
              key={member.id}
              onClick={() => {
                setActiveMember(member);
                setIsDropdownOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-3 hover:bg-slate-50 ${activeMember?.id === member.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700'}`}>
              
                  <Avatar name={member.name} src={member.avatarUrl} size="sm" />
                  <div className="flex flex-col">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-slate-500">
                      {member.relation}
                    </span>
                  </div>
                </button>
            )}
              <div className="border-t border-slate-100 mt-2 pt-2">
                <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/family');
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center space-x-3 text-primary-600 hover:bg-primary-50">
                
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Add Member</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="hidden md:flex items-center px-3 py-1.5 bg-success-50 text-success-700 rounded-full text-xs font-medium border border-success-100">
          <Wifi className="w-3 h-3 mr-1.5" />
          Online & Synced
        </div>

        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reports, terms..."
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 rounded-lg text-sm w-48 lg:w-64 transition-all" />
          
        </div>

        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>);

}
// Need to import Users for the "All Members" icon
import { Users } from 'lucide-react';