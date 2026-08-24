import React, { useState, useMemo } from 'react';
import { Member, Submission, EventItem, AppConfig } from '../types';
import { useToast } from '../context/ToastContext';
import { Table, Search, Filter, Download, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface PointsTrackerMatrixProps {
  members: Member[];
  submissions: Submission[];
  events: EventItem[];
  config: AppConfig;
}

export const PointsTrackerMatrix: React.FC<PointsTrackerMatrixProps> = ({
  members,
  submissions,
  events,
  config
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'name' | 'points'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const cap = config.pointCap || 40;

  // Build matrix data of student email -> event -> approved points
  const { displayEvents, filteredRows } = useMemo(() => {
    const approvedSubs = submissions.filter(s => s.status === 'Approved');
    const map: Record<string, Record<string, number>> = {};

    approvedSubs.forEach(s => {
      const email = s.studentEmail.toLowerCase().trim();
      if (!map[email]) {
        map[email] = {};
      }
      map[email][s.category] = (map[email][s.category] || 0) + (s.points || 0);
    });

    const activeEvents = eventFilter === 'ALL'
      ? events
      : events.filter(e => e.name === eventFilter);

    let rows = members.map(m => {
      const email = m.email.toLowerCase().trim();
      const studentEvents = map[email] || {};
      return {
        ...m,
        eventPoints: studentEvents
      };
    });

    if (gradeFilter !== 'ALL') {
      rows = rows.filter(r => String(r.gradeLevel || 11) === gradeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.studentId && r.studentId.toLowerCase().includes(q))
      );
    }

    rows.sort((a, b) => {
      if (sortField === 'name') {
        const comp = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comp : -comp;
      } else {
        const comp = (b.totalPoints || 0) - (a.totalPoints || 0);
        return sortOrder === 'asc' ? -comp : comp;
      }
    });

    return { displayEvents: activeEvents, filteredRows: rows };
  }, [members, submissions, events, searchQuery, eventFilter, gradeFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const handleExportMatrixCSV = () => {
    const headers = ['Student Name', 'Email', 'Grade', 'Student ID', ...displayEvents.map(e => `"${e.name.replace(/"/g, '""')}"`), 'Total Points', 'Point Cap'];
    const rows = filteredRows.map(row => {
      const eventCols = displayEvents.map(e => (row.eventPoints[e.name] ? row.eventPoints[e.name].toFixed(1) : '0.0'));
      return [
        `"${row.name.replace(/"/g, '""')}"`,
        `"${row.email.replace(/"/g, '""')}"`,
        row.gradeLevel || 11,
        row.studentId || '',
        ...eventCols,
        row.totalPoints.toFixed(1),
        cap
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `beta_club_points_tracker_matrix_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      title: 'Matrix CSV Exported',
      message: `Exported cross-tabulation matrix with ${displayEvents.length} categories for ${filteredRows.length} members.`,
      type: 'success'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[11px] font-mono font-semibold uppercase border border-zinc-200">
              Cross-Tab Matrix
            </span>
            <span className="text-xs font-mono text-zinc-500">
              {filteredRows.length} of {members.length} Members
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Master Points Tracker Matrix
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-mono mt-0.5">
            Cross-tabulation of verified point accrual by event category
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportMatrixCSV}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono font-semibold rounded-xl flex items-center gap-2 transition-colors shrink-0 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Matrix CSV</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search student name, email, or ID..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
          >
            <option value="ALL">All Event Categories ({events.length})</option>
            {events.map(evt => (
              <option key={evt.id} value={evt.name}>
                {evt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
          >
            <option value="ALL">All Grades (9-12)</option>
            <option value="9">Freshmen (9th)</option>
            <option value="10">Sophomores (10th)</option>
            <option value="11">Juniors (11th)</option>
            <option value="12">Seniors (12th)</option>
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-100/80 sticky top-0 z-10 text-zinc-700 font-mono text-[11px] uppercase border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4 sticky left-0 bg-zinc-100 z-20 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortField === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortField('name'); setSortOrder('asc'); }
                    }}
                    className="flex items-center gap-1 font-bold text-zinc-800 hover:text-zinc-950"
                  >
                    <span>Student Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 min-w-[70px]">Grade</th>
                {displayEvents.map(evt => (
                  <th key={evt.id} className="py-3 px-3 min-w-[130px] truncate" title={evt.name}>
                    <div className="truncate max-w-[140px]">{evt.name}</div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortField === 'points') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortField('points'); setSortOrder('desc'); }
                    }}
                    className="flex items-center gap-1 ml-auto font-bold text-zinc-800 hover:text-zinc-950"
                  >
                    <span>Total Points</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={displayEvents.length + 3} className="py-8 text-center text-zinc-500 font-sans text-xs">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map(row => {
                  const isCapped = (row.totalPoints || 0) >= cap;

                  return (
                    <tr key={row.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-2.5 px-4 sticky left-0 bg-white group-hover:bg-zinc-50 z-10 border-r border-zinc-100">
                        <div className="font-sans font-bold text-zinc-900 truncate max-w-[170px]">{row.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[170px]">{row.email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600">
                        {row.gradeLevel || 11}th
                      </td>
                      {displayEvents.map(evt => {
                        const pts = row.eventPoints[evt.name] || 0;
                        return (
                          <td key={evt.id} className="py-2.5 px-3">
                            {pts > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-semibold text-zinc-800 text-[11px] border border-zinc-200">
                                {pts.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`font-bold ${isCapped ? 'text-emerald-700' : 'text-zinc-900'}`}>
                            {(row.totalPoints || 0).toFixed(1)}
                          </span>
                          {isCapped && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Cap Met" />
                          )}
                        </div>
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
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} students
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
