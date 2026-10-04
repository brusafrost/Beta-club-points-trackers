import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  terminate
} from 'firebase/firestore';
import { awardBulkMeetingPoints } from './src/services/bulkMeetingPoints.ts';
import { submissionBelongsToMember } from './src/utils/submissionBelongsToMember.ts';
import { resolveServiceActivityType } from './src/utils/serviceActivityType.ts';
import { deleteEventCategory, updateEventCategory } from './src/services/eventCatalog.ts';
import type { EventItem, Member, Submission } from './src/types/index.ts';

const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorAddress) throw new Error('Run this test through the Firestore emulator; refusing to use a non-emulator database.');

const separatorIndex = emulatorAddress.lastIndexOf(':');
if (separatorIndex <= 0) throw new Error(`Invalid Firestore emulator address: ${emulatorAddress}`);

const app = initializeApp({ projectId: 'demo-beta-club' }, `bulk-award-test-${Date.now()}`);
const database = getFirestore(app);
connectFirestoreEmulator(database, emulatorAddress.slice(0, separatorIndex), Number(emulatorAddress.slice(separatorIndex + 1)));

const firstMember: Member = {
  id: `bulk-award-test-a-${Date.now()}`,
  firstName: 'Test',
  lastName: 'Alpha',
  name: 'Test Alpha',
  email: 'test-alpha@example.invalid',
  studentId: '999999991',
  totalPoints: 5,
  manualPointAdjustment: 0.5
};
const secondMember: Member = {
  id: `bulk-award-test-b-${Date.now()}`,
  firstName: 'Test',
  lastName: 'Beta',
  name: 'Test Beta',
  email: 'test-beta@example.invalid',
  studentId: '999999992',
  totalPoints: 8,
  manualPointAdjustment: 1
};
const meetingName = `Emulator Meeting ${Date.now()}`;
const meetingKey = meetingName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const memberRefs = [doc(database, 'members', firstMember.id), doc(database, 'members', secondMember.id)];
const firstReceiptRef = doc(database, 'meetingPointAwards', `${meetingKey}-${encodeURIComponent(firstMember.id)}`);
const secondReceiptRef = doc(database, 'meetingPointAwards', `${meetingKey}-${encodeURIComponent(secondMember.id)}`);
const legacyMeetingName = `Legacy Emulator Meeting ${Date.now()}`;
const legacyMeetingKey = legacyMeetingName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
const legacyAuditRef = doc(database, 'auditLogs', `meeting-award-${legacyMeetingKey}`);
const legacyReceiptRef = doc(database, 'meetingPointAwards', `${legacyMeetingKey}-${encodeURIComponent(secondMember.id)}`);
const preservedEvent: EventItem = { id: `event-test-${Date.now()}`, name: 'Preserved Test Category', type: 'NONBETA', description: 'Before edit' };
const preservedEventRef = doc(database, 'events', preservedEvent.id);

const testSubmission = {
  id: 'submission-test',
  studentName: firstMember.name,
  studentId: firstMember.studentId,
  studentEmail: firstMember.email,
  category: 'Test Activity',
  hours: 1,
  points: 1,
  date: '2026-10-01',
  assignedTo: 'Officer',
  proofUrl: '',
  status: 'Approved' as const,
  timestamp: new Date().toISOString()
};
const approvedLegacySubmission: Submission = { ...testSubmission, id: `approved-category-test-${Date.now()}`, category: preservedEvent.name, points: 4, hours: 4 };
const pendingLegacySubmission: Submission = { ...approvedLegacySubmission, id: `pending-category-test-${Date.now()}`, status: 'Pending', points: 4 };
const categorySubmissionRefs = [doc(database, 'submissions', approvedLegacySubmission.id), doc(database, 'submissions', pendingLegacySubmission.id)];

assert.equal(submissionBelongsToMember(testSubmission, firstMember), true);
assert.equal(submissionBelongsToMember({ ...testSubmission, studentEmail: secondMember.email }, firstMember), false);
assert.equal(submissionBelongsToMember({ ...testSubmission, studentId: undefined }, firstMember), true);
assert.equal(submissionBelongsToMember({ ...testSubmission, studentId: undefined, studentEmail: secondMember.email }, firstMember), false);
assert.equal(resolveServiceActivityType(testSubmission, [{ id: 'beta', name: 'Test Activity', type: 'BETA', description: '' }]), 'BETA');
assert.equal(resolveServiceActivityType({ ...testSubmission, category: 'Unlisted Activity' }, []), null);
assert.equal(resolveServiceActivityType({ ...testSubmission, activityType: 'NONBETA' }, [{ id: 'beta', name: 'Test Activity', type: 'BETA', description: '' }]), 'NONBETA');

async function run(): Promise<void> {
  try {
    await Promise.all([
      setDoc(memberRefs[0], firstMember),
      setDoc(memberRefs[1], secondMember)
    ]);

    const awardResult = await awardBulkMeetingPoints(database, [firstMember, firstMember], meetingName);
    assert.deepEqual(awardResult, { success: true, awarded: 1, skipped: 0 });

    const firstSaved = await getDoc(memberRefs[0]);
    const secondSaved = await getDoc(memberRefs[1]);
    assert.equal(firstSaved.data()?.totalPoints, 6);
    assert.equal(firstSaved.data()?.manualPointAdjustment, 1.5);
    assert.equal(secondSaved.data()?.totalPoints, 8, 'unchecked students must remain unchanged');

    const firstReceipt = await getDoc(firstReceiptRef);
    assert.equal(firstReceipt.exists(), true);
    assert.equal(firstReceipt.data()?.memberId, firstMember.id);
    assert.equal(firstReceipt.data()?.meetingName, meetingName);
    assert.equal(firstReceipt.data()?.points, 1);
    assert.equal(firstReceipt.data()?.awardedBy, 'Chapter officer');
    assert.equal((await getDoc(secondReceiptRef)).exists(), false, 'unchecked students must not receive an award record');

    const makeUpResult = await awardBulkMeetingPoints(database, [secondMember], meetingName);
    assert.deepEqual(makeUpResult, { success: true, awarded: 1, skipped: 0 });
    assert.equal((await getDoc(memberRefs[0])).data()?.totalPoints, 6, 'a repeated run must not re-award the first student');
    assert.equal((await getDoc(memberRefs[1])).data()?.totalPoints, 9, 'a missed student should receive their point on retry');
    assert.equal((await getDoc(memberRefs[1])).data()?.manualPointAdjustment, 2);
    assert.equal((await getDoc(secondReceiptRef)).exists(), true);

    const duplicateResult = await awardBulkMeetingPoints(database, [firstMember, secondMember], meetingName);
    assert.deepEqual(duplicateResult, {
      success: false,
      awarded: 0,
      skipped: 2,
      error: 'All selected students already received this meeting point.'
    });
    assert.equal((await getDoc(memberRefs[0])).data()?.totalPoints, 6);
    assert.equal((await getDoc(memberRefs[1])).data()?.totalPoints, 9);

    await setDoc(legacyAuditRef, {
      id: legacyAuditRef.id,
      action: 'Bulk meeting points awarded',
      target: '1 students',
      details: `${legacyMeetingName}: prior award without individual receipts.`,
      timestamp: new Date().toISOString()
    });
    const legacyResult = await awardBulkMeetingPoints(database, [secondMember], legacyMeetingName);
    assert.equal(legacyResult.success, false, 'legacy meetings without receipts must be blocked to avoid double-awarding');
    assert.equal((await getDoc(memberRefs[1])).data()?.totalPoints, 9);
    assert.equal((await getDoc(legacyReceiptRef)).exists(), false);

    const auditDocs = (await getDocs(collection(database, 'auditLogs'))).docs
      .map(snapshot => snapshot.data())
      .filter(entry => entry.action === 'Bulk meeting points awarded' && entry.details?.startsWith(`${meetingName}:`));
    assert.equal(auditDocs.length, 2, 'a make-up batch should create a separate audit entry');
    auditDocs.forEach(entry => assert.doesNotMatch(entry.details || '', /Test Alpha|Test Beta/));

    await Promise.all([
      setDoc(preservedEventRef, preservedEvent),
      setDoc(categorySubmissionRefs[0], approvedLegacySubmission),
      setDoc(categorySubmissionRefs[1], pendingLegacySubmission)
    ]);
    const updateResult = await updateEventCategory(database, preservedEvent, 'BETA', 'Edited Beta category');
    assert.deepEqual(updateResult, { success: true, preserved: 1 });
    const savedEvent = (await getDoc(preservedEventRef)).data() as EventItem;
    const savedApproved = (await getDoc(categorySubmissionRefs[0])).data() as Submission;
    const savedPending = (await getDoc(categorySubmissionRefs[1])).data() as Submission;
    assert.equal(savedEvent.type, 'BETA');
    assert.equal(savedApproved.activityType, 'NONBETA', 'already-approved service keeps its original classification');
    assert.equal(savedApproved.points, 4, 'category editing must not alter existing points');
    assert.equal(savedPending.activityType, undefined, 'pending service uses the updated catalog type when reviewed');
    assert.equal(resolveServiceActivityType(savedPending, [savedEvent]), 'BETA');

    const deleteResult = await deleteEventCategory(database, savedEvent);
    assert.deepEqual(deleteResult, { success: true, preserved: 0 });
    assert.equal((await getDoc(preservedEventRef)).exists(), false);
    assert.equal((await getDoc(categorySubmissionRefs[0])).data()?.points, 4, 'deleting a category must not delete or change approved credit');
    assert.equal((await getDoc(categorySubmissionRefs[0])).data()?.activityType, 'NONBETA');

    await Promise.all(categorySubmissionRefs.map(reference => deleteDoc(reference)));
    assert.equal((await getDocs(collection(database, 'submissions'))).size, 0);
    assert.equal((await getDocs(collection(database, 'events'))).size, 0);
    console.log('Firestore emulator test passed: identity matching, officer service-type assignment, event edit/delete preservation, selected awards, make-up batches, duplicate protection, legacy safety, audit privacy, and no submission/event loss.');
  } finally {
    const meetingAudits = (await getDocs(collection(database, 'auditLogs'))).docs
      .filter(snapshot => snapshot.data().details?.startsWith(`${meetingName}:`) || snapshot.id === legacyAuditRef.id)
      .map(snapshot => snapshot.ref);
    await Promise.all([...memberRefs, ...categorySubmissionRefs, preservedEventRef, ...meetingAudits, firstReceiptRef, secondReceiptRef, legacyReceiptRef].map(reference => deleteDoc(reference).catch(() => undefined)));
    await terminate(database);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});