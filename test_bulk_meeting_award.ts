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
import type { Member } from './src/types/index.ts';

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
const auditRef = doc(database, 'auditLogs', `meeting-award-${meetingKey}`);
const firstReceiptRef = doc(database, 'meetingPointAwards', `${meetingKey}-${encodeURIComponent(firstMember.id)}`);
const secondReceiptRef = doc(database, 'meetingPointAwards', `${meetingKey}-${encodeURIComponent(secondMember.id)}`);

async function run(): Promise<void> {
  try {
    await Promise.all([
      setDoc(memberRefs[0], firstMember),
      setDoc(memberRefs[1], secondMember)
    ]);

    const awardResult = await awardBulkMeetingPoints(database, [firstMember, firstMember], meetingName);
    assert.deepEqual(awardResult, { success: true, awarded: 1 });

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

    const audit = await getDoc(auditRef);
    assert.equal(audit.exists(), true);
    assert.equal(audit.data()?.target, '1 students');
    assert.doesNotMatch(audit.data()?.details || '', /Test Alpha|Test Beta/);

    const duplicateResult = await awardBulkMeetingPoints(database, [firstMember, secondMember], meetingName);
    assert.equal(duplicateResult.success, false);
    assert.equal((await getDoc(memberRefs[0])).data()?.totalPoints, 6);
    assert.equal((await getDoc(memberRefs[1])).data()?.totalPoints, 8);

    assert.equal((await getDocs(collection(database, 'submissions'))).size, 0);
    assert.equal((await getDocs(collection(database, 'events'))).size, 0);
    console.log('Firestore emulator test passed: selected points, personal award receipts, duplicate protection, audit privacy, and no submissions/events.');
  } finally {
    await Promise.all([...memberRefs, auditRef, firstReceiptRef, secondReceiptRef].map(reference => deleteDoc(reference).catch(() => undefined)));
    await terminate(database);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});