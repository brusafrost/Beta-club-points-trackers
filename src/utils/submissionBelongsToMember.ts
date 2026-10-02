import type { Member, Submission } from '../types';

const normalize = (value?: string) => (value || '').trim().toLowerCase();

export function submissionBelongsToMember(submission: Submission, member: Member): boolean {
  const submissionId = normalize(submission.studentId);
  const memberId = normalize(member.studentId);
  const submissionEmail = normalize(submission.studentEmail);
  const memberEmail = normalize(member.email);

  if (submissionId && memberId && submissionId !== memberId) return false;
  if (submissionId && memberId && submissionId === memberId) {
    return !submissionEmail || !memberEmail || submissionEmail === memberEmail;
  }
  return !!submissionEmail && !!memberEmail && submissionEmail === memberEmail;
}