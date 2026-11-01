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
  query,
  setDoc,
  terminate,
  where
} from 'firebase/firestore';
import { awardBulkMeetingPoints } from './src/services/bulkMeetingPoints.ts';
import { migrateLegacyManualPoints } from './src/services/manualPointMigration.ts';
import { saveOfficerPointEntry } from './src/services/officerPointEntries.ts';
import { submissionBelongsToMember } from './src/utils/submissionBelongsToMember.ts';
import { resolveServiceActivityType } from './src/utils/serviceActivityType.ts';
import { deleteEventCategory, updateEventCategory } from './src/services/eventCatalog.ts';
import { parseBulkPointEntries } from './src/utils/bulkPointEntryParser.ts';
import { getActivityPointTotals } from './src/utils/activityPointTotals.ts';
import type { EventItem, MeetingPointAward, Member, Submission } from './src/types/index.ts';
import { createBatchApprovalPlan } from './src/utils/batchApprovalPlan.ts';

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
const totalsTestMember: Member = { ...firstMember, manualPointAdjustment: 0 };
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
const bulkEntryEventName = `Bulk Entry Event ${Date.now()}`;
let bulkEntryId: string | null = null;
const migrationId = `manual-points-beta-test-${Date.now()}`;
const migrationMarkerRef = doc(database, 'appMigrations', migrationId);
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
const legacyManualEntry: Submission = {
  ...testSubmission,
  id: `officer-legacy-${Date.now()}`,
  category: 'Legacy Manual Beta Point',
  activityType: 'NONBETA',
  hours: 0,
  points: 2,
  status: 'Approved'
};
const legacyManualEvent: EventItem = {
  id: `legacy-manual-event-${Date.now()}`,
  name: legacyManualEntry.category,
  type: 'BETA',
  description: 'Officer-entered point event'
};
const legacyMeetingEvent: EventItem = {
  id: `legacy-meeting-event-${Date.now()}`,
  name: legacyMeetingName,
  type: 'BETA',
  description: 'Meeting point awards'
};
const legacyStudentSubmission: Submission = {
  ...testSubmission,
  id: `legacy-student-submission-${Date.now()}`,
  category: 'Legacy Meeting Subcategory'
};
const legacyStudentEvent: EventItem = {
  id: `legacy-student-event-${Date.now()}`,
  name: legacyStudentSubmission.category,
  type: 'NONBETA',
  description: 'Meeting point awards'
};
const legacyEntryRef = doc(database, 'submissions', legacyManualEntry.id);
const legacyStudentSubmissionRef = doc(database, 'submissions', legacyStudentSubmission.id);
const legacyEventRefs = [
  doc(database, 'events', legacyManualEvent.id),
  doc(database, 'events', legacyMeetingEvent.id),
  doc(database, 'events', legacyStudentEvent.id)
];

const parsedBulkEntries = parseBulkPointEntries([
  'Student ID,Points,Event,Note',
  '999999991,2.5,"October, Club Meeting","Verified, roster"',
  '999999992\t1\tCommunity Cleanup\t'
].join('\n'));
assert.equal(parsedBulkEntries.entries.length, 2);
assert.equal(parsedBulkEntries.entries[0].eventName, 'October, Club Meeting');
assert.equal(parsedBulkEntries.entries[0].notes, 'Verified, roster');
assert.equal(parsedBulkEntries.entries[1].studentId, '999999992');
assert.equal(parseBulkPointEntries('bad-id,0,,').invalidLines.length, 1);

assert.equal(submissionBelongsToMember(testSubmission, firstMember), true);
assert.equal(submissionBelongsToMember({ ...testSubmission, studentEmail: secondMember.email }, firstMember), false);
assert.equal(submissionBelongsToMember({ ...testSubmission, studentId: undefined }, firstMember), true);
assert.equal(submissionBelongsToMember({ ...testSubmission, studentId: undefined, studentEmail: secondMember.email }, firstMember), false);
assert.equal(resolveServiceActivityType(testSubmission, [{ id: 'beta', name: 'Test Activity', type: 'BETA', description: '' }]), 'BETA');
assert.equal(resolveServiceActivityType({ ...testSubmission, category: 'Unlisted Activity' }, []), null);
assert.equal(resolveServiceActivityType({ ...testSubmission, activityType: 'NONBETA' }, [{ id: 'beta', name: 'Test Activity', type: 'BETA', description: '' }]), 'NONBETA');

const nearCapMember = { ...firstMember, totalPoints: 38 };
const capPlan = createBatchApprovalPlan([
  { ...testSubmission, id: 'oldest', studentId: nearCapMember.studentId, studentEmail: nearCapMember.email, points: 3, status: 'Pending', timestamp: '2026-10-01T08:00:00.000Z' },
  { ...testSubmission, id: 'newer', studentId: nearCapMember.studentId, studentEmail: nearCapMember.email, points: 2, status: 'Pending', timestamp: '2026-10-01T09:00:00.000Z' },
  { ...testSubmission, id: 'unclassified', studentId: nearCapMember.studentId, studentEmail: nearCapMember.email, category: 'Unlisted', points: 5, status: 'Pending', timestamp: '2026-10-01T10:00:00.000Z' }
], [nearCapMember], [{ id: 'beta-event', name: 'Test Activity', type: 'BETA', description: '' }], 40);
assert.deepEqual(capPlan.approvals.map(approval => [approval.submissionId, approval.points]), [['oldest', 2], ['newer', 0]]);
assert.equal(capPlan.capped, 2);
assert.equal(capPlan.skipped, 1);

async function run(): Promise<void> {
  try {
    await Promise.all([
      setDoc(memberRefs[0], firstMember),
      setDoc(memberRefs[1], secondMember)
    ]);

    const bulkEntryResult = await saveOfficerPointEntry(
      database,
      firstMember,
      bulkEntryEventName,
      2.5,
      'Verified attendance'
    );
    assert.equal(bulkEntryResult.success, true);
    assert.ok(bulkEntryResult.submission);
    bulkEntryId = bulkEntryResult.submission.id;
    assert.equal(bulkEntryResult.submission.points, 2.5);
    assert.equal(bulkEntryResult.submission.category, bulkEntryEventName);
    assert.equal(bulkEntryResult.submission.status, 'Approved');
    assert.equal(bulkEntryResult.submission.activityType, 'BETA');
    assert.equal((await getDocs(query(collection(database, 'events'), where('name', '==', bulkEntryEventName)))).size, 0, 'student point subcategories do not create shared event categories');
    assert.equal((await getDoc(doc(database, 'submissions', bulkEntryId))).exists(), true);
    assert.deepEqual(
      getActivityPointTotals(totalsTestMember, [bulkEntryResult.submission], [], []),
      { betaSpecific: 2.5, nonBeta: 0 }
    );
    const historicalManualEntry: Submission = {
      ...bulkEntryResult.submission,
      id: `officer-historical-${Date.now()}`,
      activityType: undefined
    };
    assert.deepEqual(
      getActivityPointTotals(totalsTestMember, [historicalManualEntry], [], []),
      { betaSpecific: 2.5, nonBeta: 0 },
      'legacy officer manual entries without classification are treated as Beta-specific in student progress'
    );

    const awardResult = await awardBulkMeetingPoints(database, [firstMember, firstMember], meetingName);
    assert.deepEqual(awardResult, { success: true, awarded: 1, skipped: 0 });
    const savedMeetingEvents = await getDocs(query(collection(database, 'events'), where('name', '==', meetingName)));
    assert.equal(savedMeetingEvents.size, 0, 'awarding meeting points does not create a shared event category');
    const savedMeetingAward = (await getDoc(firstReceiptRef)).data() as MeetingPointAward;
    assert.deepEqual(
      getActivityPointTotals(
        { ...totalsTestMember, manualPointAdjustment: savedMeetingAward.points },
        [bulkEntryResult.submission],
        [savedMeetingAward],
        []
      ),
      { betaSpecific: 3.5, nonBeta: 0 }
    );
    assert.deepEqual(
      getActivityPointTotals({ ...totalsTestMember, manualPointAdjustment: 4 }, [], [], []),
      { betaSpecific: 4, nonBeta: 0 },
      'unitemized manual point adjustments are included in the Beta-specific total'
    );

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
      setDoc(categorySubmissionRefs[1], pendingLegacySubmission),
      setDoc(legacyEntryRef, legacyManualEntry),
      setDoc(legacyStudentSubmissionRef, legacyStudentSubmission),
      ...legacyEventRefs.map((reference, index) => setDoc(reference, [legacyManualEvent, legacyMeetingEvent, legacyStudentEvent][index]))
    ]);
    const migrationResult = await migrateLegacyManualPoints(database, migrationId);
    assert.deepEqual(migrationResult, { success: true, migrated: 1, removedEvents: 3 });
    assert.deepEqual(await migrateLegacyManualPoints(database, migrationId), { success: true, migrated: 0, removedEvents: 0 });
    assert.equal((await getDoc(legacyEntryRef)).data()?.activityType, 'BETA', 'previous officer-entered points migrate to the Beta-specific master category');
    assert.equal((await getDoc(legacyStudentSubmissionRef)).data()?.activityType, 'NONBETA', 'existing student service classification is retained when the generated subcategory is removed');
    assert.equal((await getDoc(legacyEventRefs[0])).exists(), false, 'legacy officer point categories are removed from the shared event catalog');
    assert.equal((await getDoc(legacyEventRefs[1])).exists(), false, 'legacy meeting labels are removed from the shared event catalog');
    assert.equal((await getDoc(legacyEventRefs[2])).exists(), false, 'generated subcategories are removed from the shared event catalog');
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
    if (bulkEntryId) await deleteDoc(doc(database, 'submissions', bulkEntryId));
    await Promise.all([legacyEntryRef, legacyStudentSubmissionRef].map(reference => deleteDoc(reference)));
    assert.equal((await getDocs(collection(database, 'submissions'))).size, 0);
    assert.equal((await getDocs(collection(database, 'events'))).size, 0, 'manual point subcategories and meeting labels do not create shared event categories');
    console.log('Firestore emulator test passed: Beta-specific point categorization, no subcategory event writes, legacy migration, parser formats, selected awards, make-up batches, duplicate protection, and category preservation.');
  } finally {
    const meetingAudits = (await getDocs(collection(database, 'auditLogs'))).docs
      .filter(snapshot => snapshot.data().details?.startsWith(`${meetingName}:`) || snapshot.id === legacyAuditRef.id)
      .map(snapshot => snapshot.ref);
    const meetingEvents = (await getDocs(collection(database, 'events'))).docs
      .filter(snapshot => [meetingName, legacyMeetingName, bulkEntryEventName, preservedEvent.name].includes(snapshot.data().name))
      .map(snapshot => snapshot.ref);
    const testSubmissionRefs = bulkEntryId ? [doc(database, 'submissions', bulkEntryId)] : [];
    await Promise.all([...memberRefs, ...categorySubmissionRefs, ...testSubmissionRefs, legacyEntryRef, legacyStudentSubmissionRef, ...legacyEventRefs, migrationMarkerRef, ...meetingEvents, ...meetingAudits, firstReceiptRef, secondReceiptRef, legacyReceiptRef].map(reference => deleteDoc(reference).catch(() => undefined)));
    await terminate(database);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});