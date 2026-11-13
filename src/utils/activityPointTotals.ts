import type { EventItem, MeetingPointAward, Member, OldTranscriptEntry, Submission } from '../types';
import { BetaStorage } from '../services/storage';
import { resolveServiceActivityType } from './serviceActivityType';
import { submissionBelongsToMember } from './submissionBelongsToMember';

const BETA_SPECIFIC_POINT_LIMIT = 5;

export interface ActivityPointTotals {
  betaSpecific: number;
  nonBeta: number;
}

export function getActivityPointTotals(
  member: Member,
  submissions: Submission[],
  meetingPointAwards: MeetingPointAward[],
  events: EventItem[],
  oldTranscriptEntries?: OldTranscriptEntry[]
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

  const oldTranscriptCarryover = (oldTranscriptEntries || BetaStorage.getOldTranscriptEntriesForMember(member.id))
    .filter(entry => entry.memberId === member.id)
    .reduce((sum, entry) => sum + (entry.points || 0), 0);

  totals.betaSpecific += memberAwards;
  totals.betaSpecific += (Number(member.manualPointAdjustment) || 0) - memberAwards;
  totals.betaSpecific += oldTranscriptCarryover;
  totals.betaSpecific = Math.max(0, totals.betaSpecific);
  if (totals.betaSpecific > BETA_SPECIFIC_POINT_LIMIT) {
    totals.nonBeta += totals.betaSpecific - BETA_SPECIFIC_POINT_LIMIT;
    totals.betaSpecific = BETA_SPECIFIC_POINT_LIMIT;
  }

  return totals;
}
