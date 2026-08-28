import React from 'react';
import { AuthSession, AppConfig } from '../types';
import { Award, LogOut, Settings, ShieldCheck, User, PlusCircle, CheckCircle2, BarChart3, Users, Table } from 'lucide-react';

interface NavbarProps {
  session: AuthSession | null;
  config: AppConfig;
  activeSection: string;
  onSelectSection: (sec: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  pendingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  config,
  activeSection,
  onSelectSection,
  onOpenSettings,
  onLogout,
  pendingCount
}) => {
  if (!session) return null;

  return (
    <header className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-xs mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {/* Brand Zone */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm sm:text-base font-bold text-zinc-900 leading-tight">
            {config.clubName}
          </h1>
          <p className="text-xs text-zinc-500 font-mono truncate max-w-[280px]">
            {config.schoolName} &bull; {config.academicYear}
          </p>
        </div>
      </div>

      {/* Navigation Zone */}
      <nav className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 overflow-x-auto">
        {session.isOfficer ? (
          <>
            <button
              onClick={() => onSelectSection('officer-dash')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'officer-dash' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Queue
              {pendingCount > 0 && (
                <span className="ml-1 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectSection('roster')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'roster' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Users className="w-4 h-4" /> Roster
            </button>
            <button
              onClick={() => onSelectSection('analytics')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'analytics' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onSelectSection('dashboard')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'dashboard' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <User className="w-4 h-4" /> My Profile
            </button>
            <button
              onClick={() => onSelectSection('submit')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'submit' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Log Hours
            </button>
          </>
        )}
        <button
          onClick={() => onSelectSection('tracker')}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeSection === 'tracker' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Table className="w-4 h-4" /> Full Tracker
        </button>
      </nav>

      {/* User Actions & Session Info */}
      <div className="flex items-center gap-2">
        {!session.isOfficer && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors"
            title="Student Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-200">
          <div className="text-right">
            <div className="text-xs font-bold text-zinc-900 truncate max-w-[140px]">
              {session.name || session.email}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              {session.isOfficer ? 'Officer Privileges' : 'Student Account'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
