import React, { useState, useMemo, useEffect } from 'react';
import { Member, Submission, EventItem, Officer, AppConfig } from '../types';
import { BetaStorage } from '../services/storage';
import { formatDate, formatDateTime, formatFriendlyTimestamp } from '../utils/dateFormatter';
import { ProofImageStore } from '../services/imageStore';
import { useToast } from '../context/ToastContext';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Plus,
  Trash2,
  Settings,
  Download,
  Search,
  AlertCircle,
  FileText,
  CheckCheck,
  Sparkles,
  Archive,
  ArchiveRestore,
  History,
  MessageSquare,
  Send,
  Eye,
  Calendar,
  User,
  ShieldCheck,
  ArrowRight,
  Filter,
  UserCheck,
  Check,
  ChevronRight,
  Database,
  HardDrive,
  Save
} from 'lucide-react';

interface OfficerDashboardProps {
  members: Member[];
  submissions: Submission[];
  events: EventItem[];
  officers: Officer[];
  config: AppConfig;
  onRefresh: () => void;
  onViewProof: (sub: Submission) => void;
  onViewMemberHistory?: (member: Member) => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  members,
  submissions,
  events,
  officers,
  config,
  onRefresh,
  onViewProof,
  onViewMemberHistory
}) => {
  const { showToast } = useToast();
  // 4-tab layout: Inbox, Student History & Transcripts, Tools/Bonus, Settings
  const [activeTab, setActiveTab] = useState<'inbox' | 'history' | 'tools' | 'settings'>('inbox');

  // Filter within Inbox tab
  const [inboxFilter, setInboxFilter] = useState<'pending' | 'comments' | 'approved' | 'archived' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Student History Tab state
  const [selectedStudentEmail, setSelectedStudentEmail] = useState<string>(members[0]?.email || '');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemFirstName, setEditMemFirstName] = useState("");
  const [editMemLastName, setEditMemLastName] = useState("");
  const [editMemEmail, setEditMemEmail] = useState("");
  const [editMemGrade, setEditMemGrade] = useState(11);
  const [editMemPoints, setEditMemPoints] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'Approved' | 'Pending' | 'Rejected'>('ALL');

  // Inline note editing state
  const [inlineNotes, setInlineNotes] = useState<{ [subId: string]: string }>({});

  // Point Adjustment modal
  const [reviewSub, setReviewSub] = useState<Submission | null>(null);
  const [customPts, setCustomPts] = useState<string>('');
  const [reviewNote, setReviewNote] = useState<string>('');

  // Event creation
  const [newEventName, setNewEventName] = useState<string>('');
  const [newEventType, setNewEventType] = useState<'BETA' | 'NONBETA'>('BETA');
  const [newEventDesc, setNewEventDesc] = useState<string>('');

  // Officer creation
  const [newOffEmail, setNewOffEmail] = useState<string>('');
  const [newOffTitle, setNewOffTitle] = useState<string>('');

  // Bonus Points
  const [bonusMemberId, setBonusMemberId] = useState<string>(members[0]?.id || '');
  const [bonusPts, setBonusPts] = useState<string>('5.0');
  const [bonusReason, setBonusReason] = useState<string>('');
  const [bonusOverCap, setBonusOverCap] = useState<boolean>(false);

  // Settings
  const [editCap, setEditCap] = useState<string>(String(config.pointCap || 40));
  const [editRate, setEditRate] = useState<string>(String(config.hoursRate || 1.0));
  const [editCode, setEditCode] = useState<string>(config.officerCode || 'beta4216');
  const [editClubName, setEditClubName] = useState<string>(config.clubName || 'National Beta Club');
  const [editSchoolName, setEditSchoolName] = useState<string>(config.schoolName || 'Westview High School');

  // Storage Stats
  const [storageEstimate, setStorageEstimate] = useState<{ usageMB: string; quotaMB: string; percent: string }>({
    usageMB: '< 1 MB',
    quotaMB: 'IndexedDB',
    percent: '< 1%'
  });

  useEffect(() => {
    ProofImageStore.getStorageEstimate().then(setStorageEstimate);
  }, [submissions]);

  // Derived datasets
  const pendingSubs = useMemo(() => submissions.filter(s => s.status === 'Pending'), [submissions]);
  const activeApprovedSubs = useMemo(
    () => submissions.filter(s => s.status === 'Approved' && !s.isArchivedFromQueue),
    [submissions]
  );
  const archivedSubs = useMemo(
    () => submissions.filter(s => s.status === 'Approved' && s.isArchivedFromQueue),
    [submissions]
  );
  const commentSubs = useMemo(
    () => submissions.filter(s => (s.comments && s.comments.trim().length > 0) || !s.proofUrl),
    [submissions]
  );

  // Selected Student for the History Tab
  const selectedStudent = useMemo(() => {
    if (!selectedStudentEmail && members.length > 0) {
      return members[0];
    }
    return members.find(m => m.email.toLowerCase().trim() === selectedStudentEmail.toLowerCase().trim()) || members[0];
  }, [members, selectedStudentEmail]);

  // Submissions for the selected student in History Tab
  const selectedStudentSubs = useMemo(() => {
    if (!selectedStudent) return [];
    let list = submissions.filter(
      s => s.studentEmail.toLowerCase().trim() === selectedStudent.email.toLowerCase().trim()
    );
    if (historyStatusFilter !== 'ALL') {
      list = list.filter(s => s.status === historyStatusFilter);
    }
    return list;
  }, [submissions, selectedStudent, historyStatusFilter]);

  // Filtered members list for Student Selector in History Tab
  const filteredStudentsList = useMemo(() => {
    if (!studentSearchQuery.trim()) return members;
    const q = studentSearchQuery.toLowerCase().trim();
    return members.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.studentId && m.studentId.toLowerCase().includes(q)) ||
        String(m.gradeLevel || '').includes(q)
    );
  }, [members, studentSearchQuery]);

  // Filtered Inbox List
  const filteredInbox = useMemo(() => {
    let list: Submission[] = [];

    if (inboxFilter === 'pending') {
      list = pendingSubs;
    } else if (inboxFilter === 'comments') {
      list = commentSubs;
    } else if (inboxFilter === 'approved') {
      list = activeApprovedSubs;
    } else if (inboxFilter === 'archived') {
      list = archivedSubs;
    } else {
      list = [...submissions];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        s =>
          s.studentName.toLowerCase().includes(q) ||
          s.studentEmail.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.comments && s.comments.toLowerCase().includes(q)) ||
          (s.officerNotes && s.officerNotes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [submissions, inboxFilter, searchQuery, pendingSubs, commentSubs, activeApprovedSubs, archivedSubs]);

  // Actions
  const handleQuickApprove = (sub: Submission) => {
    const res = BetaStorage.approveSubmission(sub.id);
    if (res.success) {
      showToast({
        title: 'Submission Approved',
        message: `Approved ${sub.category} (+${res.actualPoints.toFixed(1)} pts) for ${sub.studentName}.${res.capMsg || ''}`,
        type: 'success'
      });
      onRefresh();
    }
  };

  const handleEditMemberSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const members = BetaStorage.getMembers();
    const mem = members.find(m => m.id === editingMember.id);
    if (mem) {
      mem.firstName = editMemFirstName.trim();
      mem.lastName = editMemLastName.trim();
      mem.name = `${mem.firstName} ${mem.lastName}`.trim();
      mem.email = editMemEmail.toLowerCase().trim();
      mem.gradeLevel = editMemGrade;
      const pts = parseFloat(editMemPoints);
      if (!isNaN(pts)) mem.totalPoints = Math.round(pts * 10) / 10;
      BetaStorage.updateProfile(mem.id, mem.firstName, mem.lastName, mem.email, mem.gradeLevel);
if (mem.totalPoints !== undefined) BetaStorage.updateMemberInline(mem.id, 'totalPoints', mem.totalPoints);
      showToast({ title: 'Member Updated', message: `Profile updated for ${mem.name}`, type: 'success' });
      setEditingMember(null);
      onRefresh();
    }
  };

  const handleRemoveSubmission = (sub: Submission) => {
    if (sub.status === 'Approved') {
      BetaStorage.archiveApprovedSubmissions([sub.id]);
      showToast({ title: 'Removed', message: 'Item archived and removed from queue. Points kept.', type: 'info' });
    } else {
      BetaStorage.deleteSubmission(sub.id);
      showToast({ title: 'Removed', message: 'Item permanently deleted from queue.', type: 'info' });
    }
    onRefresh();
  };

  const handleApproveAllPending = () => {
    if (pendingSubs.length === 0) {
      showToast({ title: 'Notice', message: 'No pending submissions in queue.', type: 'info' });
      return;
    }
    const res = BetaStorage.batchApproveAllPending();
    if (res.success) {
      showToast({
        title: 'Batch Approval Complete',
        message: `Approved all ${res.count} pending submissions. Member points calculated and capped at ${config.pointCap || 40}.`,
        type: 'success'
      });
      onRefresh();
    }
  };

  const handleClearApprovedQueue = () => {
    if (activeApprovedSubs.length === 0) {
      showToast({ title: 'Notice', message: 'No active approved submissions to archive.', type: 'info' });
      return;
    }
    const res = BetaStorage.archiveApprovedSubmissions();
    if (res.success) {
      showToast({
        title: 'Queue Archived',
        message: `Moved ${res.count} approved submissions to archive. All points remain intact.`,
        type: 'success'
      });
      onRefresh();
    }
  };

  const handleSaveInlineNote = (subId: string) => {
    const note = inlineNotes[subId] || '';
    BetaStorage.updateSubmissionOfficerNotes(subId, note);
    showToast({
      title: 'Feedback Note Saved',
      message: 'Officer review note saved and visible to student.',
      type: 'success'
    });
    onRefresh();
  };

  const handleSaveReviewModal = () => {
    if (!reviewSub) return;
    const pts = parseFloat(customPts);
    const validPts = isNaN(pts) ? reviewSub.points : pts;
    const res = BetaStorage.approveSubmission(reviewSub.id, validPts, reviewNote);
    if (res.success) {
      showToast({
        title: 'Submission Approved',
        message: `Approved for ${res.actualPoints.toFixed(1)} points.${res.capMsg || ''}`,
        type: 'success'
      });
      setReviewSub(null);
      onRefresh();
    }
  };

  const handleRejectReviewModal = () => {
    if (!reviewSub) return;
    const res = BetaStorage.rejectSubmission(reviewSub.id, reviewNote);
    if (res.success) {
      showToast({
        title: 'Submission Rejected',
        message: `Marked submission as rejected for ${reviewSub.studentName}.`,
        type: 'info'
      });
      setReviewSub(null);
      onRefresh();
    }
  };

  const handleAwardBonus = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseFloat(bonusPts);
    if (isNaN(pts) || pts <= 0) {
      showToast({ title: 'Validation Error', message: 'Please enter a valid positive bonus amount.', type: 'error' });
      return;
    }
    if (!bonusMemberId) {
      showToast({ title: 'Validation Error', message: 'Please select a student.', type: 'error' });
      return;
    }

    const res = BetaStorage.awardBonusPoints(
      bonusMemberId,
      pts,
      bonusReason || 'Officer Discretionary Bonus',
      bonusOverCap
    );

    if (res.success) {
      const mem = BetaStorage.getMemberById(bonusMemberId);
      showToast({
        title: 'Bonus Points Awarded',
        message: `Credited ${res.actualPoints.toFixed(1)} bonus pts to ${mem?.name || 'student'}.${res.capMsg || ''}`,
        type: 'success'
      });
      setBonusReason('');
      onRefresh();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    BetaStorage.updateConfig({
      pointCap: Number(editCap) || 40,
      hoursRate: Number(editRate) || 1.0,
      officerCode: editCode.trim() || 'beta4216',
      clubName: editClubName.trim() || 'National Beta Club',
      schoolName: editSchoolName.trim() || 'Westview High School'
    });
    showToast({
      title: 'Configuration Saved',
      message: 'Chapter point cap and security settings successfully updated.',
      type: 'success'
    });
    onRefresh();
  };

  const handleDownloadStudentTranscript = (student: Member) => {
    const studentSubs = submissions.filter(
      s => s.studentEmail.toLowerCase().trim() === student.email.toLowerCase().trim()
    );
    const headers = ['Submission ID', 'Activity Category', 'Service Date', 'Hours Logged', 'Credit Points Earned', 'Status', 'Reviewer', 'Student Comment', 'Officer Notes'];
    const rows = studentSubs.map(s => [
      s.id,
      `"${s.category.replace(/"/g, '""')}"`,
      s.date,
      s.hours,
      s.points.toFixed(1),
      s.status,
      `"${(s.assignedTo || 'Officer').replace(/"/g, '""')}"`,
      `"${(s.comments || '').replace(/"/g, '""')}"`,
      `"${(s.officerNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${student.name.replace(/\s+/g, '_')}_Official_Transcript.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      title: 'Transcript Exported',
      message: `Downloaded official transcript CSV for ${student.name}.`,
      type: 'success'
    });
  };

  const handleExportAllSubmissionsCSV = () => {
    const headers = ['ID', 'Student Name', 'Student Email', 'Category', 'Hours', 'Points', 'Date', 'Status', 'Reviewer', 'Student Comments', 'Officer Notes', 'Timestamp'];
    const rows = submissions.map(s => [
      s.id,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.studentEmail.replace(/"/g, '""')}"`,
      `"${s.category.replace(/"/g, '""')}"`,
      s.hours,
      s.points.toFixed(1),
      s.date,
      s.status,
      `"${(s.assignedTo || 'Officer').replace(/"/g, '""')}"`,
      `"${(s.comments || '').replace(/"/g, '""')}"`,
      `"${(s.officerNotes || '').replace(/"/g, '""')}"`,
      s.timestamp
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BetaClub_All_Submissions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      title: 'Submissions Exported',
      message: `Exported ${submissions.length} total submission records to CSV.`,
      type: 'success'
    });
  };

  const cap = config.pointCap || 40;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-zinc-900 text-white text-[11px] font-mono font-bold uppercase tracking-wider">
              Officer Portal
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {config.schoolName} &bull; {members.length} Registered Members
            </span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight mt-1">
            Service Hour Approvals & Chapter Management
          </h1>
        </div>

        {/* 4 Main Tabs */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-semibold overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'inbox'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Queue</span>
            {pendingSubs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono font-bold">
                {pendingSubs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Student History & Transcripts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tools'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bonus & Events</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings & Database</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REVIEW QUEUE & INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          
          {/* Action Bar: Filters + Search + Batch Approvals */}
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium pb-1 lg:pb-0">
              <button
                type="button"
                onClick={() => setInboxFilter('pending')}
                className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  inboxFilter === 'pending'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <span>Pending Reviews</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  inboxFilter === 'pending' ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-200 text-zinc-800'
                }`}>
                  {pendingSubs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInboxFilter('comments')}
                className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  inboxFilter === 'comments'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Comments / Inquiries</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-zinc-200 text-zinc-800">
                  {commentSubs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInboxFilter('approved')}
                className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  inboxFilter === 'approved'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <span>Active Approved</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-zinc-200 text-zinc-800">
                  {activeApprovedSubs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInboxFilter('archived')}
                className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  inboxFilter === 'archived'
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <Archive className="w-3 h-3" />
                <span>Archived</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-zinc-200 text-zinc-800">
                  {archivedSubs.length}
                </span>
              </button>
            </div>

            {/* Right: Search & Bulk Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search name, category, note..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                />
              </div>

              {inboxFilter === 'pending' && (
                <button
                  type="button"
                  onClick={handleApproveAllPending}
                  disabled={pendingSubs.length === 0}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Batch Approve All ({pendingSubs.length})</span>
                </button>
              )}

              {inboxFilter === 'approved' && (
                <button
                  type="button"
                  onClick={handleClearApprovedQueue}
                  disabled={activeApprovedSubs.length === 0}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-mono font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors"
                  title="Archive approved items to clear active queue while keeping student points"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Approved Queue</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportAllSubmissionsCSV}
                className="p-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl text-zinc-700 transition-colors"
                title="Export all submissions to CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Submissions List */}
          {filteredInbox.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-zinc-200 shadow-xs text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-zinc-900 text-sm">Inbox Queue is Clear</h3>
              <p className="text-xs text-zinc-500 font-mono">
                No submissions matching the current filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInbox.map((sub) => {
                const member = members.find(m => m.email.toLowerCase().trim() === sub.studentEmail.toLowerCase().trim());
                const currentPts = member ? member.totalPoints : 0;
                const pointsAfterApprove = Math.min(cap, currentPts + (sub.points || 0));

                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                      sub.status === 'Pending'
                        ? 'border-zinc-300 hover:border-zinc-400'
                        : sub.status === 'Approved'
                        ? 'border-emerald-200 bg-white'
                        : 'border-red-200 bg-red-50/20'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      
                      {/* Left: Student & Service Details */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        
                        {/* Student Bar */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (member && onViewMemberHistory) {
                                onViewMemberHistory(member);
                              } else {
                                setSelectedStudentEmail(sub.studentEmail);
                                setActiveTab('history');
                              }
                            }}
                            className="font-bold text-base text-zinc-900 hover:text-zinc-600 hover:underline flex items-center gap-1.5"
                          >
                            <span>{sub.studentName}</span>
                            <span className="text-xs font-normal text-zinc-400 font-mono">
                              ({sub.studentEmail})
                            </span>
                          </button>

                          {/* Member Grade & Points Badge */}
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-mono font-semibold border border-zinc-200">
                            Grade {member?.gradeLevel || 11} &bull; Current: {currentPts.toFixed(1)} / {cap} pts
                            {sub.status === 'Pending' && (
                              <span className="text-emerald-700 font-bold ml-1">
                                &rarr; {pointsAfterApprove.toFixed(1)} pts after approval
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-zinc-600">
                          <span>🎯 Category: <strong className="text-zinc-800">{sub.category}</strong></span>
                          <span>📅 Service Date: <strong className="text-zinc-800">{formatDate(sub.date)}</strong></span>
                          <span>⏱️ Hours: <strong className="text-zinc-800">{sub.hours} hrs</strong></span>
                          <span>🏆 Points: <strong className="text-zinc-800">{sub.points.toFixed(1)} pts</strong></span>
                          <span>👤 Reviewer: <strong className="text-zinc-800">Officer</strong></span>
                          {sub.timestamp && <span>🕒 Logged: <strong className="text-zinc-800">{formatFriendlyTimestamp(sub.timestamp)}</strong></span>}
                        </div>

                        {/* Student Comments or Notes */}
                        {sub.comments && (
                          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-800">
                            <span className="font-bold text-zinc-900 flex items-center gap-1 mb-0.5">
                              <MessageSquare className="w-3.5 h-3.5 text-zinc-700" />
                              <span>Student Note / Inquiries:</span>
                            </span>
                            <p>{sub.comments}</p>
                          </div>
                        )}

                        {/* Officer Notes or Quick Response Input */}
                        <div className="space-y-1 pt-1">
                          <label className="text-[11px] font-mono font-semibold text-zinc-500 flex items-center justify-between">
                            <span>Officer Review Notes (visible to student):</span>
                            {sub.officerNotes && (
                              <span className="text-emerald-700 font-bold">Saved</span>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="e.g., Verified supervisor signature. Excellent work!"
                              defaultValue={sub.officerNotes || ''}
                              onChange={e => setInlineNotes({ ...inlineNotes, [sub.id]: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveInlineNote(sub.id);
                              }}
                              className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineNote(sub.id)}
                              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-mono font-semibold shrink-0 transition-colors"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Right: Slip Photo & Review Action Buttons */}
                      <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
                        
                        {/* Photo Thumbnail */}
                        {sub.proofUrl ? (
                          <button
                            type="button"
                            onClick={() => onViewProof(sub)}
                            className="group relative rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-400 transition-colors w-28 h-18 bg-zinc-100 flex items-center justify-center shadow-2xs"
                            title="Click to view slip photo"
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
                          <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1.5 bg-zinc-100 rounded-lg">
                            No Photo Slip
                          </span>
                        )}

                        {/* Action Buttons */}
                        {sub.status === 'Pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(sub)}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewSub(sub);
                                setCustomPts(String(sub.points));
                                setReviewNote(sub.officerNotes || '');
                              }}
                              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-mono transition-colors"
                              title="Adjust points or reject"
                            >
                              Edit / Reject
                            </button>
                          </div>
                        )}

                        {sub.status === 'Approved' && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-mono font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Approved (+{sub.points.toFixed(1)} pts)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubmission(sub)}
                              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl text-xs font-mono transition-colors"
                              title="Archive from queue"
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {sub.status === 'Rejected' && (
                          <span className="px-2.5 py-1 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs font-mono font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-red-700" />
                            <span>Rejected</span>
                          </span>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: STUDENT HISTORY & TRANSCRIPTS */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Student Selector Sidebar (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Chapter Member Directory
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Select student to audit full history and export transcripts
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search member name or ID..."
                value={studentSearchQuery}
                onChange={e => setStudentSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500"
              />
            </div>

            {/* Member List */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredStudentsList.map((m) => {
                const isSelected = selectedStudent?.email.toLowerCase().trim() === m.email.toLowerCase().trim();
                const memSubs = submissions.filter(s => s.studentEmail.toLowerCase().trim() === m.email.toLowerCase().trim());
                const pendingCount = memSubs.filter(s => s.status === 'Pending').length;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedStudentEmail(m.email)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold truncate flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {pendingCount > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                            isSelected ? 'bg-amber-400 text-zinc-950' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {pendingCount} Pending
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] font-mono truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {m.email} &bull; Gr {m.gradeLevel || 11}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold shrink-0">
                      <div>{(m.totalPoints || 0).toFixed(1)} / {cap}</div>
                      <div className={`text-[10px] font-normal ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {Math.round(((m.totalPoints || 0) / cap) * 100)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Student History Detail (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedStudent ? (
              <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-5">
                
                {/* Student Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-zinc-900">
                        {selectedStudent.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-mono font-semibold border border-zinc-200">
                        Grade {selectedStudent.gradeLevel || 11} &bull; {selectedStudent.studentId}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {selectedStudent.email} &bull; Registered: {formatDate(selectedStudent.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(selectedStudent);
                        const parts = selectedStudent.name.split(' ');
                        setEditMemFirstName(selectedStudent.firstName || parts[0]);
                        setEditMemLastName(selectedStudent.lastName || parts.slice(1).join(' '));
                        setEditMemEmail(selectedStudent.email);
                        setEditMemGrade(selectedStudent.gradeLevel || 11);
                        setEditMemPoints(String(selectedStudent.totalPoints || 0));
                      }}
                      className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadStudentTranscript(selectedStudent)}
                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Official Transcript</span>
                    </button>
                  </div>
                </div>

                {/* Points Progress */}
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-semibold text-zinc-700">Annual Point Progress</span>
                    <span className="font-bold text-zinc-900">
                      {(selectedStudent.totalPoints || 0).toFixed(1)} / {cap} Points ({Math.min(100, Math.round(((selectedStudent.totalPoints || 0) / cap) * 100))}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, ((selectedStudent.totalPoints || 0) / cap) * 100)}%` }}
                      className="h-full bg-zinc-900 rounded-full"
                    />
                  </div>
                </div>

                {/* Submissions List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-zinc-900 text-xs font-mono uppercase tracking-wider">
                      Itemized Service Logs ({selectedStudentSubs.length})
                    </h3>
                    <div className="flex gap-1 text-xs">
                      {(['ALL', 'Approved', 'Pending', 'Rejected'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setHistoryStatusFilter(st)}
                          className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                            historyStatusFilter === st
                              ? 'bg-zinc-900 text-white font-bold'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedStudentSubs.length === 0 ? (
                    <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-400 text-xs font-mono">
                      No service logs recorded for this member under selected filter.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedStudentSubs.map(sub => (
                        <div
                          key={sub.id}
                          className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 text-sm">{sub.category}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                sub.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {sub.status} &bull; {sub.points.toFixed(1)} pts
                              </span>
                            </div>

                            <div className="text-[11px] text-zinc-500 font-mono">
                              Date of Service: <strong className="text-zinc-700">{formatDate(sub.date)}</strong> &bull; {sub.hours} hrs logged &bull; Reviewer: Officer
                            </div>

                            {sub.comments && (
                              <div className="p-2.5 bg-zinc-100 rounded-lg border border-zinc-200 text-[11px] font-mono text-zinc-800">
                                <span className="font-bold text-zinc-900">Student Comment:</span> {sub.comments}
                              </div>
                            )}

                            {sub.officerNotes && (
                              <div className="p-2.5 bg-white rounded-lg border border-zinc-200 text-[11px] font-mono text-zinc-700">
                                <span className="font-bold text-zinc-900">Officer Note:</span> {sub.officerNotes}
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
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

                            <button
                              type="button"
                              onClick={() => {
                                setReviewSub(sub);
                                setCustomPts(String(sub.points));
                                setReviewNote(sub.officerNotes || '');
                              }}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-mono text-[11px] text-zinc-700"
                            >
                              Edit / Notes
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border border-zinc-200 text-center text-zinc-400 font-mono text-xs">
                Select a member from the directory.
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: BONUS POINTS & CHAPTER EVENTS */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Award Discretionary Bonus Points (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Award Discretionary Bonus Points
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Credit extra points for convention leads, club officers, or special chapter awards
              </p>
            </div>

            <form onSubmit={handleAwardBonus} className="space-y-3.5 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Select Member</label>
                <select
                  value={bonusMemberId}
                  onChange={e => setBonusMemberId(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500 text-xs"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email}) - Current: {(m.totalPoints || 0).toFixed(1)} pts
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Bonus Points</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="40"
                    required
                    value={bonusPts}
                    onChange={e => setBonusPts(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Cap Enforcement</label>
                  <label className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bonusOverCap}
                      onChange={e => setBonusOverCap(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-[11px] font-mono text-zinc-700">Override 40pt Cap</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Reason / Description</label>
                <input
                  type="text"
                  required
                  value={bonusReason}
                  onChange={e => setBonusReason(e.target.value)}
                  placeholder="e.g., State Convention planning committee lead"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={members.length === 0}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Credit Bonus Points</span>
              </button>
            </form>
          </div>

          {/* Chapter Event Category Manager (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  Chapter Event Categories ({events.length})
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  Manage categories students can choose during submission
                </p>
              </div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newEventName.trim()) return;
                BetaStorage.addEvent({
                  name: newEventName.trim(),
                  type: newEventType,
                  description: newEventDesc.trim() || 'Official chapter service activity'
                });
                setNewEventName('');
                setNewEventDesc('');
                showToast({ title: 'Event Created', message: `Added category: ${newEventName}`, type: 'success' });
                onRefresh();
              }}
              className="space-y-2.5 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs"
            >
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Event Category Name..."
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  className="col-span-2 p-2 bg-white border border-zinc-200 rounded-lg text-xs"
                />
                <select
                  value={newEventType}
                  onChange={e => setNewEventType(e.target.value as 'BETA' | 'NONBETA')}
                  className="p-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold"
                >
                  <option value="BETA">BETA</option>
                  <option value="NONBETA">NON-BETA</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Short description..."
                  value={newEventDesc}
                  onChange={e => setNewEventDesc(e.target.value)}
                  className="flex-1 p-2 bg-white border border-zinc-200 rounded-lg text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-zinc-900 text-white rounded-lg font-semibold text-xs flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {events.map(evt => (
                <div
                  key={evt.id}
                  className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-zinc-900 truncate block">{evt.name}</span>
                    <span className="text-[11px] text-zinc-400 font-mono truncate block">{evt.description}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      evt.type === 'BETA' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {evt.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        BetaStorage.deleteEvent(evt.id);
                        showToast({ title: 'Event Removed', message: `Deleted ${evt.name}.`, type: 'info' });
                        onRefresh();
                      }}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: SETTINGS & DATABASE MANAGEMENT */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Chapter Rules & Passcode (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Chapter Configuration & Security
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Control the annual point cap, hours-to-points multiplier, and officer passcode
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-800">
                    Annual Point Cap (Standard: 40.0)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="100"
                    required
                    value={editCap}
                    onChange={e => setEditCap(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 font-bold focus:outline-hidden focus:border-zinc-500"
                  />
                  <p className="text-[11px] text-zinc-400 font-mono">
                    All single logs and bulk approvals cap strictly at this value.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-800">
                    Hours-to-Points Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    required
                    value={editRate}
                    onChange={e => setEditRate(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 font-bold focus:outline-hidden focus:border-zinc-500"
                  />
                  <p className="text-[11px] text-zinc-400 font-mono">
                    1.0 hr = {editRate} Beta Points
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-800">Officer Master Passcode</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={e => setEditCode(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 font-bold focus:outline-hidden focus:border-zinc-500"
                />
                <p className="text-[11px] text-zinc-400 font-mono">
                  Used by chapter sponsors and student officers to unlock this portal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-800">Chapter / Club Name</label>
                  <input
                    type="text"
                    required
                    value={editClubName}
                    onChange={e => setEditClubName(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-800">School / Organization</label>
                  <input
                    type="text"
                    required
                    value={editSchoolName}
                    onChange={e => setEditSchoolName(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Chapter Settings</span>
              </button>
            </form>
          </div>

          {/* Database Control & Longevity Health (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Storage & Database Longevity
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Multi-year storage health status and database initialization
              </p>
            </div>

            {/* Storage Health Card */}
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-700" />
                  <span>Storage Engine Health</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Optimized
                </span>
              </div>
              <p className="text-emerald-900 text-[11px] font-mono leading-relaxed">
                Verification photo slips are compressed and archived into <strong>IndexedDB</strong>, preventing browser localStorage limits from exhausting over 2 weeks, 7 months, or multiple academic years.
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-900 pt-1 border-t border-emerald-200/60">
                <span>IndexedDB Allocated: <strong>{storageEstimate.usageMB}</strong></span>
                <span>Storage Quota: <strong>{storageEstimate.quotaMB}</strong></span>
              </div>
            </div>

            {/* Option A: Start Fresh with 0 Members */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
              <h3 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-zinc-700" />
                <span>Start Fresh with 0 Members</span>
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                Clears all sample test submissions so you can launch for your official school chapter.
              </p>
              <button
                type="button"
                onClick={() => {
                  BetaStorage.clearToZeroState();
                  showToast({ title: 'Zero State Ready', message: 'Chapter initialized with 0 members for official launch.', type: 'warning' });
                  onRefresh();
                }}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-mono text-xs font-semibold shadow-xs transition-colors"
              >
                Clear All to 0 Members
              </button>
            </div>

            {/* Option B: Load Sample Members */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
              <h3 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                <span>Load Sample Chapter Data</span>
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                Populate sample students, logs, and queue for evaluation or demonstration.
              </p>
              <button
                type="button"
                onClick={() => {
                  BetaStorage.resetToSeedData();
                  showToast({ title: 'Sample Data Loaded', message: 'Populated sample member roster and submissions.', type: 'info' });
                  onRefresh();
                }}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-xl font-mono text-xs font-semibold transition-colors cursor-pointer"
              >
                Load Sample Chapter Data
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Point Adjustment & Review Modal */}
      {reviewSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-[10px] font-mono font-bold uppercase">
                  Slip #{reviewSub.id}
                </span>
                <h3 className="text-base font-bold text-zinc-900 mt-1">
                  Adjust & Review Submission
                </h3>
                <p className="text-xs text-zinc-500 font-mono">
                  {reviewSub.studentName} &bull; {reviewSub.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewSub(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 text-base font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 font-mono space-y-1">
                <div>Date of Service: <strong>{formatDate(reviewSub.date)}</strong></div>
                <div>Hours Claimed: <strong>{reviewSub.hours} hrs</strong></div>
                {reviewSub.comments && <div>Student Note: <span className="text-zinc-600">{reviewSub.comments}</span></div>}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Points to Credit</label>
                <input
                  type="number"
                  step="0.1"
                  value={customPts}
                  onChange={e => setCustomPts(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 font-bold focus:outline-hidden focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Officer Feedback / Note to Student</label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="e.g., Verified supervisor contact. Excellent dedication!"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleRejectReviewModal}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-mono font-semibold transition-colors"
              >
                Reject Slip
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewSub(null)}
                  className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReviewModal}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Save & Approve
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-zinc-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 bg-zinc-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5"><User className="w-4 h-4" /> Edit Roster Member</h3>
              <button onClick={() => setEditingMember(null)} className="text-zinc-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditMemberSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">First Name</label>
                  <input type="text" value={editMemFirstName} onChange={e => setEditMemFirstName(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Last Name</label>
                  <input type="text" value={editMemLastName} onChange={e => setEditMemLastName(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden" />
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-zinc-700">Email Address</label>
                <input type="email" value={editMemEmail} onChange={e => setEditMemEmail(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Grade Level</label>
                  <select value={editMemGrade} onChange={e => setEditMemGrade(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden">
                    <option value={9}>9th Grade</option>
                    <option value={10}>10th Grade</option>
                    <option value={11}>11th Grade</option>
                    <option value={12}>12th Grade</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-700">Total Points Override</label>
                  <input type="number" step="0.1" value={editMemPoints} onChange={e => setEditMemPoints(e.target.value)} required className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:border-zinc-500 focus:outline-hidden font-bold" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingMember(null)} className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
