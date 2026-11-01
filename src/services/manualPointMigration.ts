import { collection, doc, getDoc, getDocs, writeBatch, type Firestore } from 'firebase/firestore';
import type { EventItem, Submission } from '../types';

const LEGACY_MANUAL_EVENT_DESCRIPTIONS = new Set([
  'Officer-entered point event',
  'Meeting point awards'
]);
const MAX_BATCH_WRITES = 450;

export async function migrateLegacyManualPoints(
  database: Firestore,
  migrationId = 'manual-points-beta-v1'
): Promise<{ success: boolean; migrated: number; removedEvents: number; error?: string }> {
  const markerRef = doc(database, 'appMigrations', migrationId);
  try {
    if ((await getDoc(markerRef)).exists()) {
      return { success: true, migrated: 0, removedEvents: 0 };
    }

    const [submissionSnapshot, eventSnapshot] = await Promise.all([
      getDocs(collection(database, 'submissions')),
      getDocs(collection(database, 'events'))
    ]);
    const legacyEvents = eventSnapshot.docs
      .map(document => ({ id: document.id, event: document.data() as EventItem }))
      .filter(({ event }) => LEGACY_MANUAL_EVENT_DESCRIPTIONS.has(event.description));
    const legacyEventTypes = new Map(
      legacyEvents.map(({ event }) => [event.name.trim().toLowerCase(), event.type])
    );
    const manualSubmissions: Array<{ id: string; submission: Submission }> = [];
    const submissionsToClassify: Array<{ id: string; type: EventItem['type'] }> = [];

    submissionSnapshot.docs.forEach(document => {
      const submission = document.data() as Submission;
      if (document.id.startsWith('officer-')) {
        if (submission.activityType !== 'BETA') manualSubmissions.push({ id: document.id, submission });
        return;
      }

      if (!submission.activityType) {
        const type = legacyEventTypes.get(submission.category.trim().toLowerCase());
        if (type) submissionsToClassify.push({ id: document.id, type });
      }
    });

    const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    manualSubmissions.forEach(({ id }) => {
      writes.push(batch => batch.update(doc(database, 'submissions', id), { activityType: 'BETA' }));
    });
    submissionsToClassify.forEach(({ id, type }) => {
      writes.push(batch => batch.update(doc(database, 'submissions', id), { activityType: type }));
    });
    legacyEvents.forEach(({ id }) => {
      writes.push(batch => batch.delete(doc(database, 'events', id)));
    });

    for (let offset = 0; offset < writes.length; offset += MAX_BATCH_WRITES) {
      const batch = writeBatch(database);
      writes.slice(offset, offset + MAX_BATCH_WRITES).forEach(write => write(batch));
      await batch.commit();
    }

    const markerBatch = writeBatch(database);
    markerBatch.set(markerRef, {
      id: migrationId,
      completedAt: new Date().toISOString(),
      migratedManualEntries: manualSubmissions.length,
      removedLegacyEvents: legacyEvents.length
    });
    await markerBatch.commit();

    return {
      success: true,
      migrated: manualSubmissions.length,
      removedEvents: legacyEvents.length
    };
  } catch (error) {
    return {
      success: false,
      migrated: 0,
      removedEvents: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
