import { collection, doc, getDocs, writeBatch, type Firestore } from 'firebase/firestore';
import type { EventItem, ServiceActivityType, Submission } from '../types';

const MAX_BATCH_WRITES = 500;

async function preserveApprovedTypes(
  database: Firestore,
  event: EventItem
): Promise<{ submissions: Submission[]; error?: string }> {
  const snapshot = await getDocs(collection(database, 'submissions'));
  const matchingSubmissions = snapshot.docs
    .map(document => ({ id: document.id, data: document.data() as Submission }))
    .filter(({ data }) => data.status === 'Approved'
      && !data.activityType
      && data.category.trim().toLowerCase() === event.name.trim().toLowerCase());

  if (matchingSubmissions.length + 1 > MAX_BATCH_WRITES) {
    return { submissions: [], error: 'Too many existing submissions to safely update this category in one operation.' };
  }

  return { submissions: matchingSubmissions.map(({ id, data }) => ({ ...data, id })) };
}

export async function updateEventCategory(
  database: Firestore,
  event: EventItem,
  type: ServiceActivityType,
  description: string
): Promise<{ success: boolean; preserved: number; error?: string }> {
  const legacy = type === event.type ? { submissions: [] as Submission[] } : await preserveApprovedTypes(database, event);
  if (legacy.error) return { success: false, preserved: 0, error: legacy.error };

  const batch = writeBatch(database);
  if (type !== event.type) {
    legacy.submissions.forEach(submission => {
      batch.update(doc(database, 'submissions', submission.id), { activityType: event.type });
    });
  }
  batch.update(doc(database, 'events', event.id), { type, description: description.trim() });

  try {
    await batch.commit();
    return { success: true, preserved: legacy.submissions.length };
  } catch {
    return { success: false, preserved: 0, error: 'The category update failed. No points or submissions were changed.' };
  }
}

export async function deleteEventCategory(
  database: Firestore,
  event: EventItem
): Promise<{ success: boolean; preserved: number; error?: string }> {
  const legacy = await preserveApprovedTypes(database, event);
  if (legacy.error) return { success: false, preserved: 0, error: legacy.error };

  const batch = writeBatch(database);
  legacy.submissions.forEach(submission => {
    batch.update(doc(database, 'submissions', submission.id), { activityType: event.type });
  });
  batch.delete(doc(database, 'events', event.id));

  try {
    await batch.commit();
    return { success: true, preserved: legacy.submissions.length };
  } catch {
    return { success: false, preserved: 0, error: 'The category could not be deleted. No points or submissions were changed.' };
  }
}