import type { EventItem, MeetingPointAward, Member, Submission } from '../types';
import { resolveServiceActivityType } from './serviceActivityType';
import { submissionBelongsToMember } from './submissionBelongsToMember';

export interface ActivityPointTotals {
  betaSpecific: number;
  nonBeta: number;
}

export function getActivityPointTotals(
  member: Member,
  submissions: Submission[],
  meetingPointAwards: MeetingPointAward[],
  events: EventItem[]
): ActivityPointTotals {
  const totals: ActivityPointTotals = { betaSpecific: 0, nonBeta: 0 };

  submissions.forEach(submission => {
    if (submission.status !== 'Approved' || submission.category.toLowerCase().startsWith('bonus:')) return;
    if (!submissionBelongsToMember(submission, member)) return;

    const type = resolveServiceActivityType(submission, events);
    if (type === 'BETA' || submission.id.startsWith('officer-')) totals.betaSpecific += submission.points || 0;
    else if (type === 'NONBETA') totals.nonBeta += submission.points || 0;
  });

  const memberAwards = meetingPointAwards
    .filter(award => award.memberId === member.id)
    .reduce((sum, award) => sum + (award.points || 0), 0);

  totals.betaSpecific += memberAwards;
  totals.betaSpecific += (Number(member.manualPointAdjustment) || 0) - memberAwards;
  totals.betaSpecific = Math.max(0, totals.betaSpecific);

  return totals;
}
