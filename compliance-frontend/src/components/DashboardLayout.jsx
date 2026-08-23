import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Stethoscope, LayoutDashboard, PlusCircle, ClipboardList, Activity, ShieldAlert, Users, LogOut } from 'lucide-react';
import { getUserRole, clearTokens } from '../api';

const ROLE_TABS = {
  FARMER: [
    { path: '/', label: 'My Livestock', icon: LayoutDashboard },
    { path: '/log', label: 'Add Treatment', icon: PlusCircle },
    { path: '/history', label: 'Compliance Status', icon: ClipboardList },
  ],
  VET: [
    { path: '/', label: 'Pending AI Reviews', icon: ClipboardList },
    { path: '/clinical-history', label: 'Clinical History', icon: Activity },
    { path: '/share', label: 'Share Decisions', icon: Stethoscope },
  ],
  ADMIN: [
    { path: '/', label: 'System Overview', icon: LayoutDashboard },
    { path: '/mrl-alerts', label: 'MRL Violations Alert', icon: ShieldAlert },
    { path: '/users', label: 'User Management', icon: Users },
  ],
};

export default function DashboardLayout({ onLogout }) {
  const role = getUserRole();
  const tabs = ROLE_TABS[role] || ROLE_TABS.FARMER;
  const navigate = useNavigate();

  const handleLogout = () => {
    clearTokens();
    if (onLogout) onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Sticky Top Navigation Bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between py-2" aria-label="Main navigation">
            
            <div className="flex items-center">
              {/* App brand mark */}
              <div className="flex items-center gap-2 mr-4 pr-4 border-r border-slate-800">
                <Stethoscope size={18} className="text-brand-400" />
                <span className="text-sm font-bold text-slate-200 hidden sm:block">
                  LiveStock Comply
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono ml-2 border border-slate-700">
                  {role}
                </span>
              </div>

              {/* Main tab buttons */}
              <div className="flex gap-1">
                {tabs.map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                      }`}
                  >
                    <Icon size={15} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </nav>
        </div>
      </div>

      {/* ── Page Content ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </div>
    </div>
  );
}
