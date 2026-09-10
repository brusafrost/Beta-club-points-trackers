import React, { useMemo, useState } from 'react';
import { Member, Submission, EventItem } from '../types';
import { Search, Download, BarChart3 } from 'lucide-react';

interface Props {
  members: Member[];
  submissions: Submission[];
  events: EventItem[];
}

export const AllStudentsMatrix: React.FC<Props> = ({ members, submissions, events }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Build map: studentEmail -> { eventName -> points }
  const { displayEvents, rows } = useMemo(() => {
    const approved = submissions.filter(s => s.status === 'Approved');
    const studentsMap: Record<string, Record<string, number>> = {};

    approved.forEach(s => {
      const email = s.studentEmail.toLowerCase().trim();
      if (!studentsMap[email]) studentsMap[email] = {};
      studentsMap[email][s.category] = (studentsMap[email][s.category] || 0) + (s.points || 0);
    });

    // Include all events plus any submission-only categories
    const submissionCats = Array.from(new Set(approved.map(s => s.category)));
    const extraCats = submissionCats.filter(cat => !events.some(e => e.name === cat));
    const allEvents = [...events.map(e => e.name), ...extraCats];

    const rows = members.map(m => {
      const email = m.email.toLowerCase().trim();
      const map = studentsMap[email] || {};
      const cells = allEvents.map(ev => ({ event: ev, points: map[ev] || 0 }));
      return { member: m, cells, total: cells.reduce((s, c) => s + c.points, 0) };
    });

    return { displayEvents: allEvents, rows };
  }, [members, submissions, events]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase().trim();
    return rows.filter(r =>
      r.member.name.toLowerCase().includes(q) ||
      (r.member.email && r.member.email.toLowerCase().includes(q)) ||
      (r.member.studentId && r.member.studentId.toLowerCase().includes(q)) ||
      String(r.member.gradeLevel || '').includes(q)
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const chartMax = Math.max(...sorted.map(row => row.total), 1);
  const chartEvents = displayEvents.slice(0, 8);
  const eventColors = [
    'bg-zinc-800', 'bg-emerald-600', 'bg-sky-600', 'bg-amber-500',
    'bg-rose-600', 'bg-indigo-600', 'bg-teal-600', 'bg-orange-500'
  ];

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Grade', 'Student ID', ...displayEvents, 'Total Points'];
    const rows = sorted.map(r => [
      `"${r.member.name.replace(/"/g, '""')}"`,
      `"${(r.member.email || '').replace(/"/g, '""')}"`,
      r.member.gradeLevel || '',
      r.member.studentId || '',
      ...r.cells.map(c => (c.points || 0).toFixed(1)),
      r.total.toFixed(1)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beta_club_students_matrix_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search students by name, email, ID, or grade..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-hidden"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-mono border border-zinc-200 flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {sorted.length > 0 && chartEvents.length > 0 && (
        <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> Points by Student and Event
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">Each bar shows the approved points that make up the student total.</p>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono shrink-0">Scale: {chartMax.toFixed(1)} pts</span>
          </div>
          <div className="space-y-2.5">
            {pageRows.slice(0, 12).map(row => (
              <div key={`chart-${row.member.id}`} className="grid grid-cols-[minmax(92px,160px)_1fr_52px] items-center gap-2 text-[11px]">
                <span className="truncate font-semibold text-zinc-800" title={row.member.name}>{row.member.name}</span>
                <div className="h-4 flex rounded-md overflow-hidden bg-zinc-200" title={`${row.total.toFixed(1)} total points`}>
                  {chartEvents.map((event, index) => {
                    const points = row.cells.find(cell => cell.event === event.name)?.points || 0;
                    return points > 0 ? (
                      <div
                        key={`${row.member.id}-${event.name}`}
                        className={`${eventColors[index % eventColors.length]} h-full`}
                        style={{ width: `${(points / chartMax) * 100}%` }}
                        title={`${event.name}: ${points.toFixed(1)} pts`}
                      />
                    ) : null;
                  })}
                </div>
                <span className="text-right font-mono font-bold text-zinc-900">{row.total.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 pt-3 border-t border-zinc-200">
            {chartEvents.map((event, index) => (
              <span key={`legend-${event.name}`} className="flex items-center gap-1 text-[10px] text-zinc-600" title={event.name}>
                <span className={`w-2 h-2 rounded-sm ${eventColors[index % eventColors.length]}`} />
                <span className="max-w-[150px] truncate">{event.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="text-zinc-700 font-mono text-[11px] uppercase border-b border-zinc-200">
            <tr>
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Student</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Grade</th>
              {displayEvents.map((ev, i) => (
                <th key={i} className="py-2 px-3 text-right min-w-[110px]">{ev}</th>
              ))}
              <th className="py-2 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pageRows.map((r, idx) => (
              <tr key={r.member.id} className="hover:bg-zinc-50 transition-colors">
                <td className="py-2 px-3">{(page - 1) * pageSize + idx + 1}</td>
                <td className="py-2 px-3 font-semibold text-zinc-900">{r.member.name}</td>
                <td className="py-2 px-3 text-zinc-600">{r.member.email}</td>
                <td className="py-2 px-3 text-zinc-600">{r.member.gradeLevel || ''}</td>
                {r.cells.map((c, i) => (
                  <td key={i} className="py-2 px-3 text-right">{c.points > 0 ? c.points.toFixed(1) : '-'}</td>
                ))}
                <td className="py-2 px-3 text-right font-bold">{r.total.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs font-mono text-zinc-600">
        <div>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length} students</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 rounded-lg border bg-white">Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 rounded-lg border bg-white">Next</button>
        </div>
      </div>
    </div>
  );
};
