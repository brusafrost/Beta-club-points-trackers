import React, { useState } from 'react';
import { Member, EventItem, Officer, AppConfig } from '../types';
import { BetaStorage } from '../services/storage';
import { compressProofImage } from '../utils/imageCompressor';
import { getTodayDateString } from '../utils/dateFormatter';
import { useToast } from '../context/ToastContext';
import { PlusCircle, Upload, CheckCircle2, AlertCircle, Calendar, Clock, User, FileText, Image as ImageIcon, MessageSquare } from 'lucide-react';

interface SubmissionFormProps {
  member: Member;
  events: EventItem[];
  officers: Officer[];
  config: AppConfig;
  onSubmitSuccess: () => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  member,
  events,
  officers,
  config,
  onSubmitSuccess
}) => {
  const { showToast } = useToast();
  const [category, setCategory] = useState<string>(events[0]?.name || 'General Community Service');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [hours, setHours] = useState<string>('2.0');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [assignedTo, setAssignedTo] = useState<string>('Officer');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const numHours = parseFloat(hours) || 0;
  const estimatedPoints = Math.round(numHours * (config.hoursRate || 1) * 10) / 10;

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 15MB.');
      showToast({ title: 'Upload Notice', message: 'Image must be under 15MB.', type: 'warning' });
      return;
    }

    try {
      setErrorMsg('');
      const compressedDataUrl = await compressProofImage(file);
      setPreviewDataUrl(compressedDataUrl);
      setProofUrl(compressedDataUrl);
      showToast({ title: 'Slip Attached', message: 'Verification photo compressed and ready for submission.', type: 'info' });
    } catch {
      setErrorMsg('Failed to process image. Please try a different photo.');
      showToast({ title: 'Image Error', message: 'Could not process photo file.', type: 'error' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (numHours <= 0) {
      setErrorMsg('Please enter a valid number of hours (greater than 0).');
      showToast({ title: 'Validation Error', message: 'Hours must be greater than 0.', type: 'error' });
      return;
    }
    if (numHours > 40) {
      setErrorMsg('Single submission maximum is 40 hours.');
      showToast({ title: 'Validation Error', message: 'Maximum 40 hours per submission.', type: 'error' });
      return;
    }
    if (!date) {
      setErrorMsg('Please select the service date.');
      showToast({ title: 'Validation Error', message: 'Please select a service date.', type: 'error' });
      return;
    }

    const finalCategory = category === 'OTHER' ? customCategory.trim() : category;
    if (!finalCategory) {
      setErrorMsg('Please specify the event / service category.');
      showToast({ title: 'Validation Error', message: 'Please specify the service category.', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = BetaStorage.addSubmission(
        member.name,
        member.email,
        finalCategory,
        numHours,
        date,
        assignedTo || 'Officer',
        proofUrl,
        comments
      );

      if (!result.success) {
        setErrorMsg(result.error || 'Failed to record service submission.');
        showToast({ title: 'Submission Failed', message: result.error || 'Failed to record submission.', type: 'error' });
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Successfully logged ${numHours} hours (${estimatedPoints} pts) for officer review.`);
      showToast({
        title: 'Hours Logged Successfully',
        message: `${numHours} hours (${estimatedPoints} pts) routed to Officer review queue.`,
        type: 'success'
      });

      // Reset form
      setHours('2.0');
      setDate(getTodayDateString());
      setProofUrl('');
      setPreviewDataUrl('');
      setComments('');
      setCustomCategory('');

      onSubmitSuccess();
    } catch {
      setErrorMsg('An unexpected error occurred while saving.');
      showToast({ title: 'Error', message: 'Failed to record submission.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 sm:p-7 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-zinc-900" />
            <span>Log Service Hours & Points</span>
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Submit service hours with photo slip or coordinator verification for officer approval
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        
        {/* Category Select */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-800 flex items-center justify-between">
            <span>Service Event / Project Category</span>
            <span className="text-[11px] font-mono text-zinc-400 font-normal">Approved Chapter Activities</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
          >
            <optgroup label="Official Beta Club Projects">
              {events.filter(e => e.type === 'BETA').map(e => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </optgroup>
            <optgroup label="Approved Community Partners (Non-Beta)">
              {events.filter(e => e.type === 'NONBETA').map(e => (
                <option key={e.id} value={e.name}>{e.name}</option>
              ))}
            </optgroup>
            <optgroup label="Custom / Other">
              <option value="OTHER">Other Individual Project (Specify Below)</option>
            </optgroup>
          </select>
        </div>

        {category === 'OTHER' && (
          <div className="space-y-1">
            <label className="font-semibold text-zinc-800">
              Specify Activity / Project Name
            </label>
            <input
              type="text"
              required
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="e.g. Red Cross Blood Drive Assistant"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
            />
          </div>
        )}

        {/* Hours and Date in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-zinc-800 flex items-center justify-between">
              <span>Hours Completed</span>
              <span className="font-mono text-[11px] text-zinc-500 font-normal">Rate: 1 hr = {config.hoursRate} pt</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="40"
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="2.0"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
            />
            <p className="text-[11px] text-zinc-500 font-mono">
              Calculates to: <strong>{estimatedPoints.toFixed(1)} Beta Points</strong>
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zinc-800">
              Date of Service
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Officer Routing */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-800">
            Route Verification To Officer
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500"
          >
            <option value="Officer">Officer (General Officer Review)</option>
            <option value="Faculty Sponsor">Officer (Faculty Sponsor)</option>
            <option value="President">Officer (President)</option>
            <option value="Vice President">Officer (Vice President)</option>
            <option value="Secretary">Officer (Secretary)</option>
            <option value="Treasurer">Officer (Treasurer)</option>
          </select>
        </div>

        {/* Verification Proof Image Slip */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-zinc-800 block">
              Verification Slip / Photo Evidence
            </label>
            <span className="text-[11px] font-mono text-zinc-400">Optional if details explained below</span>
          </div>
          
          <div className="border border-dashed border-zinc-200 rounded-xl p-4 bg-zinc-50 text-center space-y-3">
            {previewDataUrl ? (
              <div className="space-y-2">
                <img
                  src={previewDataUrl}
                  alt="Proof Slip Preview"
                  className="max-h-48 rounded-lg mx-auto border border-zinc-200 object-contain bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDataUrl('');
                    setProofUrl('');
                    showToast({ message: 'Proof slip removed.', type: 'info' });
                  }}
                  className="text-xs font-mono text-red-600 hover:underline"
                >
                  Remove Slip
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="text-xs text-zinc-600 font-medium">
                  Upload signed service slip, volunteer certificate, or attendance photo
                </div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold rounded-lg cursor-pointer text-xs transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photo File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Supported formats: JPG, PNG, WebP (Automatically compressed)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Student Comments / Notes */}
        <div className="space-y-1">
          <label className="font-semibold text-zinc-800 flex items-center justify-between">
            <span>Activity Description & Supervisor Details</span>
            <span className="text-[11px] font-mono text-zinc-400 font-normal">Optional</span>
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Briefly describe tasks performed or supervisor name/contact info..."
            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-mono text-xs focus:outline-hidden focus:border-zinc-500 resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording Submission...' : 'Submit Service Hours for Officer Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
