import React, { useState } from 'react';
import { Member } from '../types';
import { BetaStorage } from '../services/storage';
import { useToast } from '../context/ToastContext';
import { X, User, CheckCircle2, AlertCircle, Save } from 'lucide-react';

interface StudentSettingsModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const StudentSettingsModal: React.FC<StudentSettingsModalProps> = ({
  member,
  isOpen,
  onClose,
  onProfileUpdated
}) => {
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState<string>(member.firstName || '');
  const [lastName, setLastName] = useState<string>(member.lastName || '');
  const [email, setEmail] = useState<string>(member.email || '');
  const [gradeLevel, setGradeLevel] = useState<number>(member.gradeLevel || 11);

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setProfileMsg({ type: 'error', text: 'First name, last name, and email are required.' });
      showToast({ title: 'Validation Error', message: 'Name and email are required.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await BetaStorage.updateProfile(member.id, firstName, lastName, email, gradeLevel);
      if (res.success) {
        setProfileMsg({ type: 'success', text: 'Profile updated! All past submissions have been synced.' });
        showToast({
          title: 'Profile Updated',
          message: 'Your name, email, and grade level have been updated and synced.',
          type: 'success'
        });
        onProfileUpdated();
      } else {
        setProfileMsg({ type: 'error', text: res.error || 'Failed to update profile.' });
        showToast({ title: 'Update Failed', message: res.error || 'Could not update profile.', type: 'error' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setProfileMsg({ type: 'error', text: message });
      showToast({ title: 'Update Failed', message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        className="bg-white text-zinc-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-zinc-200 overflow-hidden animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-300" />
            <h2 className="font-bold text-sm">Student Profile & Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Profile Details Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-zinc-600 border-b border-zinc-100 pb-1.5 font-mono text-[11px]">
              Personal Information
            </h3>

            {profileMsg && (
              <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-sans bg-zinc-50 focus:outline-hidden focus:border-zinc-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-sans bg-zinc-50 focus:outline-hidden focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">School Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-sans bg-zinc-50 focus:outline-hidden focus:border-zinc-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-zinc-700">Grade Level</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs font-sans bg-zinc-50 focus:outline-hidden focus:border-zinc-500"
                >
                  <option value={9}>9th Grade (Freshman)</option>
                  <option value={10}>10th Grade (Sophomore)</option>
                  <option value={11}>11th Grade (Junior)</option>
                  <option value={12}>12th Grade (Senior)</option>
                </select>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>

          <p className="border-t border-zinc-100 pt-4 text-xs text-zinc-500">
            Student accounts currently sign in with a student ID. Password changes are not available.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
