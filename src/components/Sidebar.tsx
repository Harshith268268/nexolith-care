import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  Bell,
  Settings,
  Activity,
  LogOut } from
'lucide-react';
import { useFamily } from '../lib/FamilyContext';
import { useNavigate } from 'react-router-dom';
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
    icon: BrainCircuit
  },
  {
    name: 'AI Assistant',
    path: '/assistant',
    icon: MessageSquare
  },
  {
    name: 'Alerts',
    path: '/alerts',
    icon: Bell
  }];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen &&
      <div
        className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
        onClick={() => setIsOpen(false)} />

      }

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-slate-200 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <Activity className="w-6 h-6 text-primary-600 mr-2" />
          <span className="text-xl font-bold text-slate-900">Nexolith Care</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}>
                
                <Icon className="w-5 h-5 mr-3 shrink-0" />
                {item.name}
              </NavLink>);

          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => `
              flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
            `}>
            
            <Settings className="w-5 h-5 mr-3 shrink-0" />
            Settings
          </NavLink>
          
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="w-5 h-5 mr-3 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>);

}