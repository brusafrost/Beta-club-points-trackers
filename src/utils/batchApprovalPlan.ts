import type { EventItem, Member, Submission } from '../types';
import { submissionBelongsToMember } from './submissionBelongsToMember';
import { resolveServiceActivityType } from './serviceActivityType';

export interface PlannedSubmissionApproval {
  submissionId: string;
  memberId: string;
  points: number;
  activityType?: Submission['activityType'];
}

export function createBatchApprovalPlan(
  pendingSubmissions: Submission[],
  members: Member[],
  events: EventItem[],
  pointCap: number
): { approvals: PlannedSubmissionApproval[]; skipped: number; capped: number } {
  const runningTotals = new Map(members.map(member => [member.id, Number(member.totalPoints) || 0]));
  const approvals: PlannedSubmissionApproval[] = [];
  let skipped = 0;
  let capped = 0;

  const oldestFirst = [...pendingSubmissions].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  oldestFirst.forEach(submission => {
    const matchingMembers = members.filter(member => submissionBelongsToMember(submission, member));
    const activityType = resolveServiceActivityType(submission, events);
    if (matchingMembers.length !== 1 || (submission.hours > 0 && !activityType)) {
      skipped++;
      return;
    }

    const member = matchingMembers[0];
    const currentTotal = runningTotals.get(member.id) || 0;
    const requested = Number.isFinite(Number(submission.points)) ? Math.max(0, Number(submission.points)) : 0;
    const available = Math.max(0, pointCap - currentTotal);
    const points = Math.round(Math.min(requested, available) * 10) / 10;
    if (points < requested) capped++;
    runningTotals.set(member.id, currentTotal + points);
    approvals.push({ submissionId: submission.id, memberId: member.id, points, activityType: activityType || undefined });
  });

  return { approvals, skipped, capped };
}