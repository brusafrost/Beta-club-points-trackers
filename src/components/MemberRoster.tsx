import React, { useState, useMemo } from 'react';
import { Member, AppConfig } from '../types';
import { BetaStorage } from '../services/storage';
import { useToast } from '../context/ToastContext';
import { 
  Users, 
  Search, 
  Download, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  History, 
  Filter, 
  X, 
  RotateCcw,
  Check,
  AlertCircle,
  Award
} from 'lucide-react';

interface MemberRosterProps {
  members: Member[];
  config: AppConfig;
  isOfficer: boolean;
  onRefresh: () => void;
  onSelectMember?: (member: Member) => void;
  onViewHistory?: (member: Member) => void;
}

export type StatusFilterType = 'ALL' | 'CAPPED' | 'IN_PROGRESS' | 'NEAR_CAP' | 'NO_HOURS';

export const MemberRoster: React.FC<MemberRosterProps> = ({
  members,
  config,
  isOfficer,
  onRefresh,
  onViewHistory
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [sortField, setSortField] = useState<'name' | 'points' | 'grade' | 'id'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState<string>('');
  const [editLastName, setEditLastName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editGrade, setEditGrade] = useState<number>(11);

  // Bulk import modal state
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkResult, setBulkResult] = useState<{ added: number; updated: number; merged: number } | null>(null);

  const cap = config.pointCap || 40;
  const nearCapThreshold = cap * 0.75;

  // Compute roster overview counts for quick filter pills
  const statusCounts = useMemo(() => {
    let cappedCount = 0;
    let inProgressCount = 0;
    let nearCapCount = 0;
    let noHoursCount = 0;

    members.forEach(m => {
      const pts = m.totalPoints || 0;
      if (pts >= cap) {
        cappedCount++;
      } else {
        inProgressCount++;
        if (pts >= nearCapThreshold) {
          nearCapCount++;
        } else if (pts === 0) {
          noHoursCount++;
        }
      }
    });

    return {
      total: members.length,
      capped: cappedCount,
      inProgress: inProgressCount,
      nearCap: nearCapCount,
      noHours: noHoursCount
    };
  }, [members, cap, nearCapThreshold]);

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Grade filter
    if (gradeFilter !== 'ALL') {
      result = result.filter(m => String(m.gradeLevel || 11) === gradeFilter);
    }

    // Status filter
    if (statusFilter === 'CAPPED') {
      result = result.filter(m => (m.totalPoints || 0) >= cap);
    } else if (statusFilter === 'IN_PROGRESS') {
      result = result.filter(m => (m.totalPoints || 0) < cap);
    } else if (statusFilter === 'NEAR_CAP') {
      result = result.filter(m => {
        const pts = m.totalPoints || 0;
        return pts >= nearCapThreshold && pts < cap;
      });
    } else if (statusFilter === 'NO_HOURS') {
      result = result.filter(m => (m.totalPoints || 0) === 0);
    }

    // Search query (name, email, student ID)
    if (search.trim()) {
      const tokens = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
      result = result.filter(m => {
        const fullName = (m.name || '').toLowerCase();
        const firstName = (m.firstName || '').toLowerCase();
        const lastName = (m.lastName || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const studentId = (m.studentId || '').toLowerCase();

        // Check if every token matches at least one attribute
        return tokens.every(token => 
          fullName.includes(token) ||
          firstName.includes(token) ||
          lastName.includes(token) ||
          email.includes(token) ||
          studentId.includes(token)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'name') {
        const comp = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comp : -comp;
      } else if (sortField === 'grade') {
        const comp = (a.gradeLevel || 11) - (b.gradeLevel || 11);
        return sortOrder === 'asc' ? comp : -comp;
      } else if (sortField === 'id') {
        const comp = (a.studentId || '').localeCompare(b.studentId || '');
        return sortOrder === 'asc' ? comp : -comp;
      } else {
        const comp = (b.totalPoints || 0) - (a.totalPoints || 0);
        return sortOrder === 'asc' ? -comp : comp;
      }
    });

    return result;
  }, [members, gradeFilter, statusFilter, search, sortField, sortOrder, cap, nearCapThreshold]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, page, pageSize]);

  const hasActiveFilters = search.trim() !== '' || gradeFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetAllFilters = () => {
    setSearch('');
    setGradeFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditFirstName(m.firstName || m.name.split(' ')[0] || '');
    setEditLastName(m.lastName || m.name.split(' ').slice(1).join(' ') || '');
    setEditEmail(m.email);
    setEditGrade(m.gradeLevel || 11);
  };

  const saveEdit = (id: string) => {
    const res = BetaStorage.updateProfile(id, editFirstName, editLastName, editEmail, editGrade);
    setEditingId(null);
    if (res.success) {
      showToast({
        title: 'Member Updated',
        message: `Successfully updated profile for ${editFirstName} ${editLastName}.`,
        type: 'success'
      });
    } else {
      showToast({
        title: 'Update Error',
        message: res.error || 'Failed to update member.',
        type: 'error'
      });
    }
    onRefresh();
  };

  const deleteMember = (id: string) => {
    const mem = members.find(m => m.id === id);
    BetaStorage.removeMember(id);
    showToast({
      title: 'Member Removed',
      message: `Removed ${mem?.name || 'student'} from active chapter roster.`,
      type: 'info'
    });
    onRefresh();
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const res = BetaStorage.bulkImportMembers(bulkText);
    setBulkResult(res);
    setBulkText('');
    showToast({
      title: 'Roster Import Complete',
      message: `Added ${res.added} new members, updated ${res.updated} existing records.`,
      type: 'success'
    });
    onRefresh();
  };

  const exportRosterCSV = () => {
    const headers = ['Student ID', 'First Name', 'Last Name', 'Full Name', 'Email', 'Grade Level', 'Total Points', 'Cap Status'];
    const rows = filteredMembers.map(m => [
      m.studentId || '',
      `"${(m.firstName || '').replace(/"/g, '""')}"`,
      `"${(m.lastName || '').replace(/"/g, '""')}"`,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.email.replace(/"/g, '""')}"`,
      m.gradeLevel || 11,
      (m.totalPoints || 0).toFixed(1),
      (m.totalPoints || 0) >= cap ? 'Completed' : 'In Progress'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `beta_club_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      title: 'Roster CSV Exported',
      message: `Downloaded chapter roster with ${filteredMembers.length} members.`,
      type: 'success'
    });
  };

  const toggleSort = (field: 'name' | 'points' | 'grade' | 'id') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'points' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[11px] font-mono font-semibold uppercase border border-zinc-200">
              Member Directory
            </span>
            <span className="text-xs font-mono text-zinc-500">
              {filteredMembers.length} of {members.length} Members &bull; Chapter Cap: {cap} pts
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-zinc-700 hidden sm:inline" />
            <span>Beta Club Member Roster</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-mono mt-0.5">
            Official roster directory with live point tallies, service histories, and membership standing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOfficer && (
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-mono font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-200 shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportRosterCSV}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Status Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <button
          type="button"
          onClick={() => { setStatusFilter('ALL'); setPage(1); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
              : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
          }`}
        >
          <div className="text-[11px] opacity-70">Total Roster</div>
          <div className="text-lg font-bold mt-0.5 flex items-center justify-between">
            <span>{statusCounts.total}</span>
            <Users className="w-4 h-4 opacity-50" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('CAPPED'); setPage(1); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'CAPPED'
              ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
              : 'bg-white hover:bg-emerald-50/40 text-emerald-900 border-zinc-200'
          }`}
        >
          <div className="text-[11px] opacity-80">Cap Met (≥ {cap} pts)</div>
          <div className="text-lg font-bold mt-0.5 flex items-center justify-between">
            <span>{statusCounts.capped}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('IN_PROGRESS'); setPage(1); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-zinc-800 text-white border-zinc-800 shadow-xs'
              : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
          }`}
        >
          <div className="text-[11px] opacity-70">In Progress (&lt; {cap} pts)</div>
          <div className="text-lg font-bold mt-0.5 flex items-center justify-between">
            <span>{statusCounts.inProgress}</span>
            <Award className="w-4 h-4 opacity-50" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter('NO_HOURS'); setPage(1); }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'NO_HOURS'
              ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
              : 'bg-white hover:bg-amber-50/40 text-zinc-700 border-zinc-200'
          }`}
        >
          <div className="text-[11px] opacity-70">Zero Hours (0 pts)</div>
          <div className="text-lg font-bold mt-0.5 flex items-center justify-between">
            <span>{statusCounts.noHours}</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
        </button>
      </div>

      {/* Search & Filter Controls Panel */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs space-y-3.5">
        
        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          
          {/* Search Bar (6 cols) */}
          <div className="sm:col-span-5 relative">
            <label className="block text-[11px] font-mono font-semibold text-zinc-600 mb-1">
              Search Members
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, student ID..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500 focus:bg-white transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-700 p-0.5 rounded-full hover:bg-zinc-200 transition-colors"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Dropdown (3 cols) */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-mono font-semibold text-zinc-600 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-zinc-500" />
              <span>Status Filter</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilterType);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500 focus:bg-white transition-all"
            >
              <option value="ALL">All Statuses ({members.length})</option>
              <option value="CAPPED">Completed / Cap Met ({statusCounts.capped})</option>
              <option value="IN_PROGRESS">In Progress ({statusCounts.inProgress})</option>
              <option value="NEAR_CAP">Near Cap (≥ 75%) ({statusCounts.nearCap})</option>
              <option value="NO_HOURS">Zero Hours (0 pts) ({statusCounts.noHours})</option>
            </select>
          </div>

          {/* Grade Filter Dropdown (2 cols) */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono font-semibold text-zinc-600 mb-1">
              Grade Cohort
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500 focus:bg-white transition-all"
            >
              <option value="ALL">All Grades (9-12)</option>
              <option value="9">9th Grade (Freshman)</option>
              <option value="10">10th Grade (Sophomore)</option>
              <option value="11">11th Grade (Junior)</option>
              <option value="12">12th Grade (Senior)</option>
            </select>
          </div>

          {/* Sort By Dropdown (2 cols) */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono font-semibold text-zinc-600 mb-1 flex items-center justify-between">
              <span>Sort Order</span>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-[10px] text-zinc-500 hover:text-zinc-900 font-mono underline"
                title="Toggle Ascending/Descending"
              >
                {sortOrder === 'asc' ? 'Asc ↑' : 'Desc ↓'}
              </button>
            </label>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500 focus:bg-white transition-all"
            >
              <option value="points">Points ({sortOrder === 'desc' ? 'High to Low' : 'Low to High'})</option>
              <option value="name">Name ({sortOrder === 'asc' ? 'A to Z' : 'Z to A'})</option>
              <option value="grade">Grade Level</option>
              <option value="id">Student ID</option>
            </select>
          </div>

        </div>

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-400 text-[11px]">Active Filters:</span>
              
              {search.trim() && (
                <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] flex items-center gap-1">
                  <span>Search: &ldquo;{search}&rdquo;</span>
                  <button type="button" onClick={() => { setSearch(''); setPage(1); }} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] flex items-center gap-1">
                  <span>
                    Status: {
                      statusFilter === 'CAPPED' ? 'Cap Met' :
                      statusFilter === 'IN_PROGRESS' ? 'In Progress' :
                      statusFilter === 'NEAR_CAP' ? 'Near Cap (≥75%)' : 'Zero Hours'
                    }
                  </span>
                  <button type="button" onClick={() => { setStatusFilter('ALL'); setPage(1); }} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {gradeFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] flex items-center gap-1">
                  <span>Grade: {gradeFilter}th</span>
                  <button type="button" onClick={() => { setGradeFilter('ALL'); setPage(1); }} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-mono transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

      </div>

      {/* Roster Table Container */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-100/80 text-zinc-700 font-mono text-[11px] uppercase border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4 min-w-[80px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('id')}
                    className="flex items-center gap-1 font-bold text-zinc-800 hover:text-zinc-950 cursor-pointer"
                  >
                    <span>ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 font-bold text-zinc-800 hover:text-zinc-950 cursor-pointer"
                  >
                    <span>Student Name & School Email</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[90px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('grade')}
                    className="flex items-center gap-1 font-bold text-zinc-800 hover:text-zinc-950 cursor-pointer"
                  >
                    <span>Grade</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => toggleSort('points')}
                    className="flex items-center gap-1 font-bold text-zinc-800 hover:text-zinc-950 cursor-pointer"
                  >
                    <span>Total Points</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[130px]">Cap Standing</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans text-xs">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-zinc-800">No members found</p>
                      <p className="text-zinc-400 font-mono text-[11px]">
                        No roster entries match the current search keyword or status filter.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="mt-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-mono font-semibold transition-colors"
                        >
                          Clear Filters & Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m, idx) => {
                  const pts = m.totalPoints || 0;
                  const isCapped = pts >= cap;
                  const isNearCap = !isCapped && pts >= nearCapThreshold;
                  const isEditing = editingId === m.id;

                  return (
                    <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Student ID */}
                      <td className="py-2.5 px-4 text-zinc-500 text-[11px]">
                        {m.studentId || `STU${1000 + (page - 1) * pageSize + idx + 1}`}
                      </td>
                      
                      {/* Name & Email */}
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 font-sans">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editFirstName}
                                onChange={e => setEditFirstName(e.target.value)}
                                placeholder="First"
                                className="px-2 py-1 bg-white border border-zinc-300 rounded text-xs w-24"
                              />
                              <input
                                type="text"
                                value={editLastName}
                                onChange={e => setEditLastName(e.target.value)}
                                placeholder="Last"
                                className="px-2 py-1 bg-white border border-zinc-300 rounded text-xs w-28"
                              />
                            </div>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              className="px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-mono"
                            />
                          </div>
                        ) : (
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onViewHistory) onViewHistory(m);
                              }}
                              className="font-sans font-bold text-zinc-900 hover:underline text-left block"
                              title="Click to view full service history"
                            >
                              {m.name}
                            </button>
                            <div className="text-[11px] text-zinc-400">{m.email}</div>
                          </div>
                        )}
                      </td>

                      {/* Grade */}
                      <td className="py-2.5 px-4 text-zinc-700">
                        {isEditing ? (
                          <select
                            value={editGrade}
                            onChange={e => setEditGrade(Number(e.target.value))}
                            className="px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-mono"
                          >
                            <option value={9}>9th</option>
                            <option value={10}>10th</option>
                            <option value={11}>11th</option>
                            <option value={12}>12th</option>
                          </select>
                        ) : (
                          <span>{m.gradeLevel || 11}th</span>
                        )}
                      </td>

                      {/* Points */}
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>{pts.toFixed(1)}</span>
                          <span className="text-[10px] text-zinc-400 font-normal">/ {cap} pts</span>
                        </div>
                      </td>

                      {/* Standing / Cap Status */}
                      <td className="py-2.5 px-4">
                        {isCapped ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Met ({cap})</span>
                          </span>
                        ) : isNearCap ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {(cap - pts).toFixed(1)} pts to cap
                          </span>
                        ) : pts === 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
                            0 pts (No activity)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {(cap - pts).toFixed(1)} pts to go
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => saveEdit(m.id)}
                              className="px-2.5 py-1 bg-zinc-900 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 font-sans">
                            {onViewHistory && (
                              <button
                                type="button"
                                onClick={() => onViewHistory(m)}
                                className="px-2 py-1 text-zinc-600 hover:text-zinc-950 rounded hover:bg-zinc-100 flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                                title="View member service history transcript"
                              >
                                <History className="w-3 h-3 text-zinc-500" />
                                <span className="hidden sm:inline">History</span>
                              </button>
                            )}
                            {isOfficer && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(m)}
                                  className="p-1 text-zinc-500 hover:text-zinc-900 rounded hover:bg-zinc-100 cursor-pointer"
                                  title="Edit Member"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteMember(m.id)}
                                  className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs font-mono text-zinc-500">
          <div>
            {filteredMembers.length > 0 ? (
              <span>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredMembers.length)} of {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
              </span>
            ) : (
              <span>0 members matching criteria</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xl max-w-xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900">
                Bulk Import Members
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkResult(null);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-700 font-mono cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-zinc-500 font-mono">
              Paste names and emails (one student per line). Handles CSV, tab-delimited sheets, or &ldquo;First Last email@school.edu&rdquo;.
            </p>

            <textarea
              rows={6}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"Jane Doe, jane.doe@school.edu\nJohn Smith, john.smith@school.edu\nPatel, Maya\t maya.patel@school.edu"}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-500"
            />

            {bulkResult && (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-800">
                Processed: <strong>{bulkResult.added}</strong> added, <strong>{bulkResult.updated}</strong> updated, <strong>{bulkResult.merged}</strong> merged.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkResult(null);
                }}
                className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Import Members
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
