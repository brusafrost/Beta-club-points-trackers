import React, { useState } from 'react';
import { Member, Officer } from '../types';
import { BetaStorage } from '../services/storage';
import { useToast } from '../context/ToastContext';
import { X, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface StudentCommentModalProps {
  member: Member;
  officers: Officer[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const StudentCommentModal: React.FC<StudentCommentModalProps> = ({
  member,
  isOpen,
  onClose,
  onSubmitted
}) => {
  const { showToast } = useToast();
  const [topic, setTopic] = useState<string>('Hour Verification Inquiry');
  const [assignedOfficer, setAssignedOfficer] = useState<string>('Officer Team');
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setError('Please enter your comment or question.');
      showToast({ title: 'Notice', message: 'Please enter a message before sending.', type: 'warning' });
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = BetaStorage.addDirectCommentToOfficers(
        member.name,
        member.email,
        topic,
        commentText.trim(),
        assignedOfficer
      );

      if (res.success) {
        setSuccess(true);
        showToast({
          title: 'Message Sent to Officers',
          message: 'Your inquiry has been placed in the Officer review inbox.',
          type: 'success'
        });
        setTimeout(() => {
          setSuccess(false);
          setCommentText('');
          onSubmitted();
          onClose();
        }, 1200);
      } else {
        setError(res.error || 'Failed to send comment.');
        showToast({ title: 'Send Error', message: res.error || 'Failed to send comment.', type: 'error' });
      }
    } catch {
      setError('An unexpected error occurred.');
      showToast({ title: 'Error', message: 'Could not deliver message.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-white border border-zinc-700">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">Send Direct Comment to Officers</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Delivered straight to the reviewing officers' Comments tab
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs font-sans">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Comment sent directly to the Officer Comments & Inquiries tab!</span>
            </div>
          )}

          {/* Inquiry Topic */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 block">Inquiry Topic</label>
            <select
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500"
            >
              <option value="Hour Verification Inquiry">Hour Verification Inquiry</option>
              <option value="No-Photo Slip Explanation">No-Photo Slip Explanation</option>
              <option value="Event Cap / Exemption Question">Event Cap / Exemption Question</option>
              <option value="Supervisor Contact Follow-up">Supervisor Contact Follow-up</option>
              <option value="General Chapter Question">General Chapter Question</option>
            </select>
          </div>

          {/* Officer Recipient */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 block">Direct to Officer (Optional)</label>
            <select
              value={assignedOfficer}
              onChange={e => setAssignedOfficer(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-900 focus:outline-hidden focus:border-zinc-500"
            >
              <option value="Officer Team">All Officers / Chapter Officer Review</option>
              <option value="Faculty Sponsor">Officer (Faculty Sponsor)</option>
              <option value="President">Officer (President)</option>
              <option value="Vice President">Officer (Vice President)</option>
              <option value="Secretary">Officer (Secretary)</option>
              <option value="Treasurer">Officer (Treasurer)</option>
            </select>
          </div>

          {/* Comment text */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-800 block">
              Your Comment, Question, or Verification Details:
            </label>
            <textarea
              rows={4}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="e.g. Hi officers, I completed 4 hours at the animal shelter on Saturday with Ms. Watson. I didn't get a printed slip, could you verify with her at 555-0199? Thanks!"
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-900 focus:outline-hidden focus:border-zinc-500 resize-none"
            />
            <p className="text-[11px] text-zinc-500 font-mono">
              Officers can reply with inline response notes and verify your hours directly from their Comments desk.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending...' : 'Send to Officers'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
