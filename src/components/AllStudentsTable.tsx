import React, { useMemo, useState } from 'react';
import { Member } from '../types';
import { Search, Download } from 'lucide-react';

interface Props {
  members: Member[];
  onViewMemberHistory?: (m: Member) => void;
}

export const AllStudentsTable: React.FC<Props> = ({ members, onViewMemberHistory }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filtered = useMemo(() => {
    if (!query.trim()) return [...members];
    const q = query.toLowerCase().trim();
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.studentId && m.studentId.toLowerCase().includes(q)) ||
      String(m.gradeLevel || '').includes(q)
    );
  }, [members, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Grade', 'Student ID', 'Total Points'];
    const rows = sorted.map(m => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${(m.email || '').replace(/"/g, '""')}"`,
      m.gradeLevel || '',
      m.studentId || '',
      (m.totalPoints || 0).toFixed(1)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beta_club_all_students_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="relative flex-1 max-w-md">
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
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-700 font-mono text-[11px] uppercase border-b border-zinc-200">
            <tr>
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Student Name</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Grade</th>
              <th className="py-2 px-3 text-right">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pageRows.map((m, idx) => (
              <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                <td className="py-2 px-3">{(page - 1) * pageSize + idx + 1}</td>
                <td className="py-2 px-3">
                  <button onClick={() => onViewMemberHistory && onViewMemberHistory(m)} className="text-zinc-900 font-semibold hover:underline">
                    {m.name}
                  </button>
                </td>
                <td className="py-2 px-3 text-zinc-600">{m.email}</td>
                <td className="py-2 px-3 text-zinc-600">{m.gradeLevel || ''}</td>
                <td className="py-2 px-3 text-right font-bold">{(m.totalPoints || 0).toFixed(1)}</td>
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
