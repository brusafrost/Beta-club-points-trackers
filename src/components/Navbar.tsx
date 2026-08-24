import React from 'react';
import { AuthSession, AppConfig } from '../types';
import { Award, LogOut, Settings, ShieldCheck, User, FileCode, PlusCircle, CheckCircle2, BarChart3, Users, Table } from 'lucide-react';

interface NavbarProps {
  session: AuthSession | null;
  config: AppConfig;
  activeSection: string;
  onSelectSection: (sec: string) => void;
  onOpenSettings: () => void;
  onOpenGasCode: () => void;
  onLogout: () => void;
  pendingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  config,
  activeSection,
  onSelectSection,
  onOpenSettings,
  onOpenGasCode,
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
              type="button"
              onClick={() => onSelectSection('officer-dash')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSection === 'officer-dash'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>Officer Portal</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-zinc-900 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('roster')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeSection === 'roster'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Roster
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('tracker')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeSection === 'tracker'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Points Matrix
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('analytics')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                activeSection === 'analytics'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dive Charts</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelectSection('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeSection === 'dashboard'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('submit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                activeSection === 'submit'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Hours</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('roster')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeSection === 'roster'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Standings
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('tracker')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeSection === 'tracker'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Matrix
            </button>
          </>
        )}
      </nav>

      {/* User Actions & Session Info */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenGasCode}
          className="p-2 text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors text-xs font-mono flex items-center gap-1.5"
          title="GAS Backend Code & Architecture"
        >
          <FileCode className="w-3.5 h-3.5 text-zinc-700" />
          <span className="hidden sm:inline font-mono">GAS/Sheets</span>
        </button>

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
