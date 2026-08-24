import React, { useMemo } from 'react';
import { Member, Submission, AppConfig } from '../types';
import { formatDate } from '../utils/dateFormatter';
import { useToast } from '../context/ToastContext';
import { X, Calendar, Clock, Award, CheckCircle2, AlertCircle, Clock3, Download, ExternalLink, User, ShieldCheck } from 'lucide-react';

interface MemberHistoryModalProps {
  member: Member | null;
  submissions: Submission[];
  config: AppConfig;
  isOpen: boolean;
  onClose: () => void;
  onViewProof?: (sub: Submission) => void;
}

export const MemberHistoryModal: React.FC<MemberHistoryModalProps> = ({
  member,
  submissions,
  config,
  isOpen,
  onClose,
  onViewProof
}) => {
  const { showToast } = useToast();

  if (!isOpen || !member) return null;

  const cap = config.pointCap || 40;

  const memberSubs = useMemo(() => {
    return submissions
      .filter(s => s.studentEmail.toLowerCase().trim() === member.email.toLowerCase().trim())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [submissions, member.email]);

  const stats = useMemo(() => {
    let approvedPts = 0;
    let approvedHrs = 0;
    let pendingPts = 0;
    let pendingHrs = 0;
    let rejectedCount = 0;
    let betaPoints = 0;
    let nonBetaPoints = 0;
    let bonusPoints = 0;

    memberSubs.forEach(s => {
      if (s.status === 'Approved') {
        approvedPts += s.points || 0;
        approvedHrs += s.hours || 0;
        if (s.category.startsWith('Bonus:')) {
          bonusPoints += s.points || 0;
        } else {
          betaPoints += s.points || 0;
        }
      } else if (s.status === 'Pending') {
        pendingPts += s.points || 0;
        pendingHrs += s.hours || 0;
      } else if (s.status === 'Rejected') {
        rejectedCount++;
      }
    });

    return {
      approvedPts,
      approvedHrs,
      pendingPts,
      pendingHrs,
      rejectedCount,
      betaPoints,
      nonBetaPoints,
      bonusPoints,
      totalEntries: memberSubs.length
    };
  }, [memberSubs]);

  const progressPercent = Math.min(100, Math.round(((member.totalPoints || 0) / cap) * 100));
  const isCapped = (member.totalPoints || 0) >= cap;

  const exportStudentHistoryCSV = () => {
    const headers = ['Submission ID', 'Service Date', 'Category/Event', 'Hours', 'Points', 'Status', 'Reviewer', 'Student Comments', 'Officer Notes', 'Timestamp'];
    const rows = memberSubs.map(s => [
      s.id,
      s.date,
      `"${s.category.replace(/"/g, '""')}"`,
      s.hours,
      (s.points || 0).toFixed(1),
      s.status,
      `"Officer"`,
      `"${(s.comments || '').replace(/"/g, '""')}"`,
      `"${(s.officerNotes || '').replace(/"/g, '""')}"`,
      s.timestamp
    ]);

    const csvContent = [
      `"Beta Club Member Service History - ${member.name} (${member.email})"`,
      `"Student ID: ${member.studentId || 'N/A'} | Grade: ${member.gradeLevel || 11}th | Total Approved Points: ${(member.totalPoints || 0).toFixed(1)} / ${cap}"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BetaHistory_${member.name.replace(/\s+/g, '_')}_${member.gradeLevel}th.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast({
      title: 'History Exported',
      message: `Downloaded official service history CSV for ${member.name}.`,
      type: 'success'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white text-zinc-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl border border-zinc-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-100 flex items-center justify-center font-bold text-sm">
              {member.firstName ? member.firstName[0] : member.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm leading-tight">{member.name}</h2>
                <span className="px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-semibold border border-zinc-700">
                  Grade {member.gradeLevel || 11}
                </span>
                {isCapped && (
                  <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                    Cap Met
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {member.email} &bull; {member.studentId || 'ID Pending'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportStudentHistoryCSV}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
              title="Download Student Transcript CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export History</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* Quick Metrics Bar */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-xs">Total Approved Points</span>
                <div className="text-xl font-bold text-zinc-900 mt-0.5">
                  {(member.totalPoints || 0).toFixed(1)} <span className="text-xs font-normal text-zinc-400">/ {cap} pts</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 text-xs">Progress Toward Cap</span>
                <div className="text-xl font-bold text-zinc-900 mt-0.5">
                  {progressPercent}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-zinc-900 rounded-full transition-all"
              />
            </div>

            {/* Breakdown stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 bg-white rounded-lg border border-zinc-200">
                <span className="text-zinc-400 block text-[10px]">Approved Hours</span>
                <strong className="text-zinc-900 text-xs">{stats.approvedHrs.toFixed(1)} hrs</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-zinc-200">
                <span className="text-zinc-400 block text-[10px]">Total Submissions</span>
                <strong className="text-zinc-900 text-xs">{stats.totalEntries} slips</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-zinc-200">
                <span className="text-zinc-400 block text-[10px]">Pending Slips</span>
                <strong className="text-zinc-900 text-xs">{stats.pendingPts.toFixed(1)} pts</strong>
              </div>
              <div className="p-2 bg-white rounded-lg border border-zinc-200">
                <span className="text-zinc-400 block text-[10px]">Bonus Points</span>
                <strong className="text-zinc-900 text-xs">{stats.bonusPoints.toFixed(1)} pts</strong>
              </div>
            </div>
          </div>

          {/* Submission History Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-900">
                Service History & Activity Log ({memberSubs.length})
              </h3>
              <span className="text-[11px] font-mono text-zinc-400">
                All records stored in student history
              </span>
            </div>

            {memberSubs.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-500 font-mono text-xs">
                No volunteer hours or submissions recorded yet for this member.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white">
                {memberSubs.map((sub) => {
                  return (
                    <div key={sub.id} className="p-3.5 hover:bg-zinc-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-zinc-900 font-sans">{sub.category}</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                            sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            sub.status === 'Pending' ? 'bg-zinc-100 text-zinc-800 border border-zinc-200' :
                            'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {sub.status}
                          </span>
                          {sub.isArchivedFromQueue && (
                            <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 font-mono text-[9px]">
                              Archived from queue
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            {formatDate(sub.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {sub.hours} hrs
                          </span>
                          <span className="flex items-center gap-1 font-bold text-zinc-800">
                            <Award className="w-3 h-3 text-zinc-400" />
                            {(sub.points || 0).toFixed(1)} pts
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-zinc-400" />
                            Officer
                          </span>
                        </div>

                        {sub.comments && (
                          <div className="p-1.5 bg-zinc-50 rounded border border-zinc-200 text-[11px] font-mono text-zinc-700">
                            <strong className="text-zinc-900">Student Comment:</strong> {sub.comments}
                          </div>
                        )}

                        {sub.officerNotes && (
                          <div className="p-1.5 bg-zinc-50 rounded border border-zinc-200 text-[11px] font-mono text-zinc-600">
                            <strong>Officer Note:</strong> {sub.officerNotes}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sub.proofUrl && onViewProof && (
                          <button
                            type="button"
                            onClick={() => onViewProof(sub)}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-mono font-semibold transition-colors"
                          >
                            View Slip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
