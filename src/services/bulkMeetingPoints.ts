import { doc, increment, runTransaction, type Firestore } from 'firebase/firestore';
import type { AuditLog, Member, MeetingPointAward } from '../types';

export async function awardBulkMeetingPoints(
  database: Firestore,
  members: Member[],
  meetingName: string
): Promise<{ success: boolean; awarded?: number; error?: string }> {
  const uniqueMembers = [...new Map(members.map(member => [member.id, member])).values()];
  if (!meetingName.trim()) return { success: false, error: 'Enter a meeting name.' };
  if (uniqueMembers.length === 0) return { success: false, error: 'No matching students were selected.' };

  const meetingKey = meetingName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  if (!meetingKey) return { success: false, error: 'Meeting label must include a letter or number.' };
  const auditEntry: AuditLog = {
    id: `meeting-award-${meetingKey}`,
    action: 'Bulk meeting points awarded',
    target: `${uniqueMembers.length} students`,
    details: `${meetingName.trim()}: 1 point added to each of ${uniqueMembers.length} matched students.`,
    timestamp: new Date().toISOString()
  };

  try {
    const awarded = await runTransaction(database, async transaction => {
      const auditRef = doc(database, 'auditLogs', auditEntry.id);
      const previousAward = await transaction.get(auditRef);
      if (previousAward.exists()) return false;
      uniqueMembers.forEach(member => {
        transaction.update(doc(database, 'members', member.id), {
          totalPoints: increment(1),
          manualPointAdjustment: increment(1)
        });
        const award: MeetingPointAward = {
          id: `${meetingKey}-${encodeURIComponent(member.id)}`,
          memberId: member.id,
          meetingName: meetingName.trim(),
          points: 1,
          awardedBy: 'Chapter officer',
          timestamp: auditEntry.timestamp
        };
        transaction.set(doc(database, 'meetingPointAwards', award.id), award);
      });
      transaction.set(auditRef, auditEntry);
      return true;
    });
    if (!awarded) return { success: false, error: 'This meeting label has already been used for a point award.' };
    return { success: true, awarded: uniqueMembers.length };
  } catch {
    return { success: false, error: 'Could not save the point awards. No students were updated.' };
  }
}