import React, { useState, useEffect } from 'react';
import { Submission } from '../types';
import { ProofImageStore } from '../services/imageStore';
import { formatDate } from '../utils/dateFormatter';
import { X, ExternalLink, Calendar, Clock, Award, User, AlertCircle, MessageSquare } from 'lucide-react';

interface ProofModalProps {
  submission: Submission | null;
  onClose: () => void;
}

export const ProofModal: React.FC<ProofModalProps> = ({ submission, onClose }) => {
  const [loadedProof, setLoadedProof] = useState<string>('');

  useEffect(() => {
    if (!submission) {
      setLoadedProof('');
      return;
    }

    if (submission.proofUrl) {
      setLoadedProof(submission.proofUrl);
    }

    // Attempt to load full high-res slip from IndexedDB if stored
    ProofImageStore.getProofImage(submission.id).then((fullImg) => {
      if (fullImg) {
        setLoadedProof(fullImg);
      }
    });
  }, [submission]);

  if (!submission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white text-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
              <span>{submission.category}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                submission.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                submission.status === 'Pending' ? 'bg-zinc-700 text-zinc-200 border border-zinc-600' :
                'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}>
                {submission.status}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Logged by {submission.studentName} ({submission.studentEmail})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-zinc-500 flex items-center gap-1 text-[11px]"><Calendar className="w-3 h-3" /> Service Date</div>
              <div className="font-bold text-zinc-900 text-xs mt-0.5">{formatDate(submission.date)}</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-zinc-500 flex items-center gap-1 text-[11px]"><Clock className="w-3 h-3" /> Hours</div>
              <div className="font-bold text-zinc-900 text-xs mt-0.5">{submission.hours} hrs</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-zinc-500 flex items-center gap-1 text-[11px]"><Award className="w-3 h-3" /> Points</div>
              <div className="font-bold text-zinc-900 text-xs mt-0.5">{submission.points.toFixed(1)} pts</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="text-zinc-500 flex items-center gap-1 text-[11px]"><User className="w-3 h-3" /> Reviewer</div>
              <div className="font-bold text-zinc-900 text-xs mt-0.5 truncate" title={submission.assignedTo}>
                {submission.assignedTo || 'Officer'}
              </div>
            </div>
          </div>

          {submission.comments && (
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-800 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-[11px]">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-700" />
                <span>Student Submission Comment / Details:</span>
              </div>
              <p className="text-zinc-800 text-xs pl-5 whitespace-pre-wrap">
                {submission.comments}
              </p>
            </div>
          )}

          {submission.officerNotes && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Officer Note: </span>
                {submission.officerNotes}
              </div>
            </div>
          )}

          {/* Proof Image */}
          <div className="border border-dashed border-zinc-200 rounded-xl p-4 bg-zinc-50 flex flex-col items-center justify-center min-h-[200px]">
            {loadedProof ? (
              <div className="w-full flex flex-col items-center">
                <img
                  src={loadedProof}
                  alt={`Proof slip for ${submission.category}`}
                  className="max-h-[360px] w-auto max-w-full object-contain rounded-lg border border-zinc-200 bg-white"
                />
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={loadedProof}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg text-xs font-mono font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open High-Res Photo</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400 font-mono">
                No proof image attached.
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
