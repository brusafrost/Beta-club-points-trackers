import { doc, setDoc, type Firestore } from 'firebase/firestore';
import type { Member, Submission } from '../types';

export async function saveOfficerPointEntry(
  database: Firestore,
  member: Member,
  category: string,
  points: number,
  notes: string
): Promise<{ success: boolean; submission?: Submission; error?: string }> {
  const categoryName = category.trim();
  if (!Number.isFinite(points) || points <= 0 || !categoryName) {
    return { success: false, error: 'Student, event, and positive points are required.' };
  }

  const submission: Submission = {
    id: `officer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentName: member.name,
    studentId: member.studentId,
    studentEmail: member.email,
    category: categoryName,
    activityType: 'BETA',
    hours: 0,
    points: Math.round(points * 10) / 10,
    date: new Date().toISOString().split('T')[0],
    assignedTo: 'Officer',
    proofUrl: '',
    status: 'Approved',
    timestamp: new Date().toISOString(),
    officerNotes: notes.trim() || 'Entered by officer'
  };

  try {
    await setDoc(doc(database, 'submissions', submission.id), submission);
    return { success: true, submission };
  } catch {
    return { success: false, error: 'Could not save this point entry.' };
  }
}
