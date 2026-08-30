import React, { useMemo, useState } from 'react';
import { Member, Submission, EventItem } from '../types';
import { Search, Download } from 'lucide-react';

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
