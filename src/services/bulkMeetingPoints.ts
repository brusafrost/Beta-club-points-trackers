import { collection, doc, getDocs, increment, query, runTransaction, where, type Firestore } from 'firebase/firestore';
import type { AuditLog, Member, MeetingPointAward } from '../types';

export async function awardBulkMeetingPoints(
  database: Firestore,
  members: Member[],
  meetingName: string
): Promise<{ success: boolean; awarded?: number; skipped?: number; error?: string }> {
  const uniqueMembers = [...new Map(members.map(member => [member.id, member])).values()];
  if (!meetingName.trim()) return { success: false, error: 'Enter a meeting name.' };
  if (uniqueMembers.length === 0) return { success: false, error: 'No matching students were selected.' };

  const meetingKey = meetingName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  if (!meetingKey) return { success: false, error: 'Meeting label must include a letter or number.' };
  const timestamp = new Date().toISOString();
  const receiptRefs = uniqueMembers.map(member => doc(database, 'meetingPointAwards', `${meetingKey}-${encodeURIComponent(member.id)}`));
  const legacyAuditRef = doc(database, 'auditLogs', `meeting-award-${meetingKey}`);

  try {
    const meetingReceipts = await getDocs(query(
      collection(database, 'meetingPointAwards'),
      where('meetingName', '==', meetingName.trim())
    ));
    const result = await runTransaction(database, async transaction => {
      const [legacyAudit, ...existingReceipts] = await Promise.all([
        transaction.get(legacyAuditRef),
        ...receiptRefs.map(reference => transaction.get(reference))
      ]);
      if (legacyAudit.exists() && meetingReceipts.empty) {
        return { awarded: 0, skipped: uniqueMembers.length, legacyUntracked: true };
      }

      const membersToAward = uniqueMembers.filter((_, index) => !existingReceipts[index].exists());
      if (membersToAward.length === 0) return { awarded: 0, skipped: uniqueMembers.length, legacyUntracked: false };

      membersToAward.forEach(member => {
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
          timestamp
        };
        transaction.set(doc(database, 'meetingPointAwards', award.id), award);
      });
      const auditEntry: AuditLog = {
        id: `meeting-award-${meetingKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        action: 'Bulk meeting points awarded',
        target: `${membersToAward.length} students`,
        details: `${meetingName.trim()}: 1 point added to each of ${membersToAward.length} newly selected students.`,
        timestamp
      };
      transaction.set(doc(database, 'auditLogs', auditEntry.id), auditEntry);
      return { awarded: membersToAward.length, skipped: uniqueMembers.length - membersToAward.length, legacyUntracked: false };
    });
    if (result.legacyUntracked) {
      return { success: false, awarded: 0, skipped: result.skipped, error: 'This meeting was awarded before individual student receipts were available. Review the old award records before retrying to avoid duplicate points.' };
    }
    if (result.awarded === 0) return { success: false, awarded: 0, skipped: result.skipped, error: 'All selected students already received this meeting point.' };
    return { success: true, awarded: result.awarded, skipped: result.skipped };
  } catch {
    return { success: false, error: 'Could not save the point awards. No students were updated.' };
  }
}