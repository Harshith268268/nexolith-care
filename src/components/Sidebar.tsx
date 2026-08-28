import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Sparkles,
  HeartPulse,
  Bell,
  Settings,
  LogOut
} from 'lucide-react';
import { useFamily } from '../lib/FamilyContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { logout } = useFamily();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Family',
      path: '/family',
      icon: Users
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: FileText
    },
    {
      name: 'Trends',
      path: '/trends',
      icon: TrendingUp
    },
    {
      name: 'AI Predictions',
      path: '/predictions',
      icon: Sparkles
    },
    {
      name: 'AI Assistant',
      path: '/assistant',
      icon: HeartPulse
    },
    {
      name: 'Alerts',
      path: '/alerts',
      icon: Bell
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#18313A]/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white text-[#18313A] flex flex-col border-r border-[#E3EEEE]
        transition-transform duration-300 ease-in-out shadow-sm lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-[#E3EEEE] shrink-0 justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#DDF2F1] text-[#3AAFA9] shadow-sm">
              <HeartPulse className="w-5 h-5 text-[#55BFC2]" />
            </div>
            <div>
              <span className="text-lg font-bold text-[#18313A] tracking-tight block leading-tight">
                Nexolith <span className="text-[#55BFC2]">Care</span>
              </span>
              <span className="text-[11px] text-[#64777C] font-medium block">
                Family Healthcare
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#64777C]/80">
          Menu
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 group
                  ${
                    isActive
                      ? 'bg-[#DDF2F1]/80 text-[#1C696D] font-bold shadow-xs'
                      : 'text-[#64777C] hover:bg-[#F5F8F8] hover:text-[#18313A]'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 mr-3 shrink-0 transition-colors ${isActive ? 'text-[#3AAFA9]' : 'text-[#64777C] group-hover:text-[#18313A]'}`} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E3EEEE] space-y-1 bg-[#F5F8F8]/50">
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `
              flex items-center px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-150
              ${
                isActive
                  ? 'bg-[#DDF2F1]/80 text-[#1C696D] font-bold'
                  : 'text-[#64777C] hover:bg-white hover:text-[#18313A]'
              }
            `}
          >
            <Settings className="w-4 h-4 mr-3 shrink-0 text-[#64777C]" />
            Settings
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-2xl text-xs font-semibold transition-colors text-[#D96C6C] hover:bg-rose-50 hover:text-[#C25252]"
          >
            <LogOut className="w-4 h-4 mr-3 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}