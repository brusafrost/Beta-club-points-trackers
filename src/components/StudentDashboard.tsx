import React, { useState, useMemo } from 'react';
import { Member, Submission, AppConfig } from '../types';
import { BetaStorage } from '../services/storage';
import { formatDate } from '../utils/dateFormatter';
import { useToast } from '../context/ToastContext';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PlusCircle,
  Calendar,
  MessageSquare,
  Award,
  Send,
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  Check,
  User
} from 'lucide-react';
import { StudentCommentModal } from './StudentCommentModal';
import { AllStudentsMatrix } from './AllStudentsMatrix';

interface StudentDashboardProps {
  member: Member;
  submissions: Submission[];
  config: AppConfig;
  onNavigateToSubmit: () => void;
  onViewProof: (sub: Submission) => void;
  onRefreshData?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  member,
  submissions,
  config,
  onNavigateToSubmit,
  onViewProof,
  onRefreshData
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'students'>('overview');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Approved' | 'Pending' | 'Rejected'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [inquiryPrefill, setInquiryPrefill] = useState<string>('');

  const officers = BetaStorage.getOfficers();
  const allMembers = BetaStorage.getMembers();
  const sortedMembers = [...allMembers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const myRank = sortedMembers.findIndex(m => m.email.toLowerCase().trim() === member.email.toLowerCase().trim()) + 1;

  const mySubs = useMemo(() => {
    return submissions.filter(
      s => s.studentEmail.toLowerCase().trim() === member.email.toLowerCase().trim()
    );
  }, [submissions, member.email]);

  const approvedSubs = useMemo(() => mySubs.filter(s => s.status === 'Approved'), [mySubs]);
  const pendingSubs = useMemo(() => mySubs.filter(s => s.status === 'Pending'), [mySubs]);
  const rejectedSubs = useMemo(() => mySubs.filter(s => s.status === 'Rejected'), [mySubs]);

  const approvedPoints = approvedSubs.reduce((sum, s) => sum + (s.points || 0), 0);
  const pendingPoints = pendingSubs.reduce((sum, s) => sum + (s.points || 0), 0);
  const cap = config.pointCap || 40;
  const progressPct = Math.min(100, (approvedPoints / cap) * 100);
  const pointsRemaining = Math.max(0, cap - approvedPoints);

  // Filtered submissions for the dedicated submissions tab
  const filteredSubs = useMemo(() => {
    let result = [...mySubs];
    if (statusFilter !== 'ALL') {
      result = result.filter(s => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s =>
        s.category.toLowerCase().includes(q) ||
        (s.comments && s.comments.toLowerCase().includes(q)) ||
        (s.officerNotes && s.officerNotes.toLowerCase().includes(q)) ||
        s.date.includes(q)
      );
    }
    return result;
  }, [mySubs, statusFilter, searchQuery]);

  // Category breakdown for student
  const categoryMap: Record<string, { hours: number; points: number; count: number }> = {};
  approvedSubs.forEach(s => {
    const cat = s.category || 'General';
    if (!categoryMap[cat]) categoryMap[cat] = { hours: 0, points: 0, count: 0 };
    categoryMap[cat].hours += s.hours || 0;
    categoryMap[cat].points += s.points || 0;
    categoryMap[cat].count += 1;
  });

  const categoryList = Object.entries(categoryMap).sort((a, b) => b[1].points - a[1].points);
  const events = BetaStorage.getEvents();

  // Export personal transcript CSV
  const handleExportTranscript = () => {
    const headers = ['Submission ID', 'Activity Category', 'Service Date', 'Hours Logged', 'Credit Points Earned', 'Status', 'Reviewer', 'My Comment', 'Officer Note'];
    const rows = mySubs.map(s => [
      s.id,
      `"${s.category.replace(/"/g, '""')}"`,
      s.date,
      s.hours,
      s.points.toFixed(1),
      s.status,
      `"${(s.assignedTo || '').replace(/"/g, '""')}"`,
      `"${(s.comments || '').replace(/"/g, '""')}"`,
      `"${(s.officerNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${member.name.replace(/\s+/g, '_')}_Beta_Service_Transcript.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      title: 'Transcript Exported',
      message: `Downloaded official service transcript for ${member.name}.`,
      type: 'success'
    });
  };

  const handleOpenInquiryForSub = (sub: Submission) => {
    setInquiryPrefill(`Regarding log #${sub.id} (${sub.category} on ${sub.date}): `);
    setIsCommentModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Hero Card with Cap Progress */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-zinc-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-mono font-semibold uppercase tracking-wider border border-zinc-200">
              Grade {member.gradeLevel || '11'} &bull; {member.studentId || 'Member'}
            </span>
            {allMembers.length > 0 && myRank > 0 && (
              <span className="text-xs text-zinc-500 font-mono">
                Class Rank #{myRank} of {allMembers.length}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            {member.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 font-mono mt-0.5">
            {member.email} &bull; {pointsRemaining <= 0 ? 'Annual 40-Point Cap Completed!' : `${pointsRemaining.toFixed(1)} pts to annual 40-point cap`}
          </p>

          {/* Progress Milestone Bar */}
          <div className="mt-4 max-w-xl space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-700 font-semibold">{approvedPoints.toFixed(1)} / {cap} pts ({progressPct.toFixed(0)}%)</span>
              <span className="text-zinc-500">{pointsRemaining <= 0 ? 'Cap Met (40.0 pts)' : `${pointsRemaining.toFixed(1)} pts needed`}</span>
            </div>
            <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
              <div
                style={{ width: `${progressPct}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  progressPct >= 100 ? 'bg-emerald-600' : 'bg-zinc-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 3 Metric Counts + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-center min-w-[85px]">
              <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500">Approved</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono mt-0.5">{approvedPoints.toFixed(1)}</div>
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-center min-w-[85px]">
              <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500">Pending</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-700 font-mono mt-0.5">{pendingPoints.toFixed(1)}</div>
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-center min-w-[85px]">
              <div className="text-[10px] font-mono font-semibold uppercase text-zinc-500">Submissions</div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 font-mono mt-0.5">{mySubs.length}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onNavigateToSubmit}
              className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Hours</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInquiryPrefill('');
                setIsCommentModalOpen(true);
              }}
              className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-200"
              title="Send inquiry directly to officers"
            >
              <MessageSquare className="w-4 h-4 text-zinc-600" />
              <span>Ask Officers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Student Sub-Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Overview & Cap Progress</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'submissions'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Submissions & Credit History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-mono">
              {mySubs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>All Students & Points</span>
          </button>
        </div>

        {mySubs.length > 0 && (
          <button
            type="button"
            onClick={handleExportTranscript}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-mono font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export Transcript (CSV)</span>
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW & PROGRESS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Recent Responses Summary (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  Recent Submissions & Status ({mySubs.length})
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  Your recent volunteer hours, approval status, and earned credit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('submissions')}
                className="text-xs font-mono text-zinc-600 hover:text-zinc-950 underline"
              >
                View all ({mySubs.length})
              </button>
            </div>

            {mySubs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-200 rounded-xl space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">No service logs submitted yet</p>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Submit your volunteer hours and proof slips to begin earning credit toward your 40.0 pt cap.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToSubmit}
                  className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Submit Your First Hours</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {mySubs.slice(0, 5).map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3.5 bg-zinc-50 hover:bg-zinc-100/80 rounded-xl border border-zinc-200 transition-colors flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-900 truncate">{sub.category}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                          sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          sub.status === 'Pending' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {sub.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                          {sub.status === 'Pending' && <Clock className="w-3 h-3 text-amber-700" />}
                          {sub.status === 'Rejected' && <XCircle className="w-3 h-3 text-red-700" />}
                          <span>{sub.status} &bull; {sub.status === 'Approved' ? `+${sub.points.toFixed(1)} pts` : `${sub.hours} hrs`}</span>
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-500 font-mono">
                        Date: {formatDate(sub.date)} &bull; {sub.hours} hrs logged {sub.assignedTo ? `&bull; Reviewer: Officer (${sub.assignedTo.replace(/@.*/, '')})` : '&bull; Reviewer: Officer'}
                      </div>

                      {sub.comments && (
                        <div className="text-[11px] text-zinc-700 font-mono bg-zinc-100 p-2 rounded-lg border border-zinc-200">
                          <span className="font-semibold text-zinc-900">Your Note:</span> {sub.comments}
                        </div>
                      )}

                      {sub.officerNotes && (
                        <div className="text-[11px] text-zinc-800 font-mono bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                          <span className="font-semibold text-blue-900">Officer Feedback:</span> {sub.officerNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {sub.proofUrl && (
                        <button
                          type="button"
                          onClick={() => onViewProof(sub)}
                          className="px-2.5 py-1 bg-white hover:bg-zinc-200 border border-zinc-200 rounded-lg text-xs font-mono font-semibold text-zinc-800 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Slip</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Personal Category Breakdown & Chapter Events (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Category Breakdown Card */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-zinc-900 flex items-center justify-between">
                <span>My Activity Distribution</span>
                <span className="text-xs font-mono text-zinc-500 font-normal">{categoryList.length} Categories</span>
              </h2>

              {categoryList.length === 0 ? (
                <p className="text-xs text-zinc-500 font-mono">No approved service categories yet.</p>
              ) : (
                <div className="space-y-3">
                  {categoryList.map(([cat, stats]) => {
                    const pct = Math.round((stats.points / (approvedPoints || 1)) * 100);

                    return (
                      <div key={cat} className="space-y-1 text-xs">
                        <div className="flex justify-between font-mono">
                          <span className="font-semibold text-zinc-800 truncate pr-2">{cat}</span>
                          <span className="text-zinc-600 font-mono shrink-0">{stats.points.toFixed(1)} pts ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-zinc-800 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Official Chapter Events */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-zinc-900">
                  Official Chapter Events
                </h2>
                <span className="text-xs font-mono text-zinc-500">{events.length} Available</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {events.slice(0, 4).map(evt => (
                  <div key={evt.id} className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-zinc-900">{evt.name}</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{evt.description}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                      evt.type === 'BETA' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {evt.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB X: ALL STUDENTS MATRIX */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">All Students — Points by Event</h2>
            <p className="text-xs text-zinc-500 font-mono">Events shown as columns; approved points per event listed per student.</p>
          </div>

          <AllStudentsMatrix members={allMembers} submissions={submissions} events={events} />
        </div>
      )}

      {/* TAB 2: DEDICATED SUBMISSIONS & CREDIT HISTORY */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-5">
          
          {/* Header & Status Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                My Responses & Credit Approval History
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Itemized review of all submitted service slips, hours approved, points awarded, and officer feedback
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportTranscript}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 rounded-xl text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToSubmit}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Hours</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                All ({mySubs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Approved')}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'Approved'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Approved ({approvedSubs.length}) &bull; {approvedPoints.toFixed(1)} pts</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Pending')}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'Pending'
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Pending ({pendingSubs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Rejected')}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'Rejected'
                    ? 'bg-red-700 text-white'
                    : 'bg-red-50 text-red-900 hover:bg-red-100 border border-red-200'
                }`}
              >
                <XCircle className="w-3 h-3" />
                <span>Rejected ({rejectedSubs.length})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search category or notes..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Detailed Itemized Submissions List */}
          {filteredSubs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-200 rounded-2xl space-y-2">
              <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
              <h3 className="font-bold text-zinc-800 text-sm">No submissions match your filter</h3>
              <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">
                {mySubs.length === 0
                  ? "You haven't submitted any service logs yet. Click 'Submit Hours' above to log your first activity."
                  : 'Try selecting a different filter pill or clearing your search term.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubs.map((sub) => (
                <div
                  key={sub.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    sub.status === 'Approved'
                      ? 'bg-white border-emerald-200 hover:border-emerald-300'
                      : sub.status === 'Pending'
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-red-50/40 border-red-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    
                    {/* Left: Main Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-zinc-900">
                          {sub.category}
                        </h3>
                        
                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase flex items-center gap-1.5 ${
                          sub.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : sub.status === 'Pending'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-red-100 text-red-900 border border-red-300'
                        }`}>
                          {sub.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                          {sub.status === 'Pending' && <Clock className="w-3.5 h-3.5 text-amber-700" />}
                          {sub.status === 'Rejected' && <XCircle className="w-3.5 h-3.5 text-red-700" />}
                          <span>{sub.status}</span>
                        </span>
                      </div>

                      {/* Meta Information Bar */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-zinc-600">
                        <span>📅 Date: <strong className="text-zinc-800">{formatDate(sub.date)}</strong></span>
                        <span>⏱️ Hours Logged: <strong className="text-zinc-800">{sub.hours} hrs</strong></span>
                        <span>🏆 Credit Awarded: <strong className={sub.status === 'Approved' ? 'text-emerald-800' : 'text-zinc-800'}>{sub.points.toFixed(1)} pts</strong></span>
                        <span>👤 Reviewer: <strong className="text-zinc-800">Officer</strong></span>
                      </div>

                      {/* Student Submitted Comment */}
                      {sub.comments && (
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700">
                          <span className="font-bold text-zinc-900 block mb-0.5">Your Submission Details:</span>
                          <p>{sub.comments}</p>
                        </div>
                      )}

                      {/* Officer Review Feedback */}
                      {sub.officerNotes && (
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs font-mono text-zinc-800">
                          <span className="font-bold text-blue-900 flex items-center gap-1 mb-0.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Officer Review Notes:</span>
                          </span>
                          <p>{sub.officerNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: Proof Slip Thumbnail & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                      {sub.proofUrl ? (
                        <button
                          type="button"
                          onClick={() => onViewProof(sub)}
                          className="group relative rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-400 transition-colors w-24 h-16 bg-zinc-100 flex items-center justify-center"
                          title="Click to view full photo proof slip"
                        >
                          <img
                            src={sub.proofUrl}
                            alt="Proof slip"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-mono font-bold">
                            View Slip
                          </div>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-zinc-400 px-2 py-1 bg-zinc-100 rounded-lg">
                          No Photo Slip
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenInquiryForSub(sub)}
                        className="px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-700 flex items-center gap-1.5 transition-colors"
                        title="Send question to officers about this log"
                      >
                        <MessageSquare className="w-3 h-3 text-zinc-500" />
                        <span>Inquire</span>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Direct Message to Officers Modal */}
      <StudentCommentModal
        member={member}
        officers={officers}
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        onSubmitted={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

    </div>
  );
};
