import assert from 'node:assert/strict';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, setDoc, terminate } from 'firebase/firestore';
import { db } from './src/firebase.ts';
import { BetaStorage } from './src/services/storage.ts';

const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorAddress) throw new Error('Run this test through the Firestore emulator; refusing to use a non-emulator database.');

const separatorIndex = emulatorAddress.lastIndexOf(':');
if (separatorIndex <= 0) throw new Error(`Invalid Firestore emulator address: ${emulatorAddress}`);

connectFirestoreEmulator(db, emulatorAddress.slice(0, separatorIndex), Number(emulatorAddress.slice(separatorIndex + 1)));

const localValues = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => localValues.get(key) ?? null,
    setItem: (key: string, value: string) => localValues.set(key, value),
    removeItem: (key: string) => localValues.delete(key)
  }
});

const studentId = `8${Date.now().toString().slice(-9)}`;
const accountRef = doc(db, 'members', studentId);
const legacyDuplicateRef = doc(db, 'members', `${studentId}-legacy`);
const ownSubmissionRef = doc(db, 'submissions', `scope-own-${studentId}`);
const otherSubmissionRef = doc(db, 'submissions', `scope-other-${studentId}`);

async function run(): Promise<void> {
  try {
    const registrationResults = await Promise.all([
      BetaStorage.registerMember('Test', 'Student', studentId, `test-${studentId}@example.invalid`),
      BetaStorage.registerMember('Second', 'Attempt', studentId, `other-${studentId}@example.invalid`)
    ]);
    const winningRegistrationIndex = registrationResults.findIndex(result => result.success);
    assert.notEqual(winningRegistrationIndex, -1, 'one concurrent registration must succeed');
    assert.equal(registrationResults.filter(result => result.success).length, 1, 'concurrent registrations must create only one account');
    const expectedOriginalName = winningRegistrationIndex === 0 ? 'Test Student' : 'Second Attempt';
    assert.equal((await getDoc(accountRef)).exists(), true);

    const duplicateRegistration = await BetaStorage.registerMember('Another', 'Attempt', studentId, '');
    assert.equal(duplicateRegistration.success, false, 'a duplicate ID must not create or overwrite a profile');

    const login = await BetaStorage.loginStudent(studentId);
    assert.equal(login.success, true);
    assert.equal(login.member?.id, studentId);

    const member = (await getDoc(accountRef)).data();
    assert.ok(member);
    await setDoc(legacyDuplicateRef, { ...member, id: `${studentId}-legacy` });
    const ambiguousLogin = await BetaStorage.loginStudent(studentId);
    assert.equal(ambiguousLogin.success, false);
    assert.match(ambiguousLogin.error || '', /multiple profiles/i);

    const registeredAccount = (await getDoc(accountRef)).data();
    assert.equal(registeredAccount?.name, expectedOriginalName, 'a failed duplicate registration must preserve the winning profile');

    await Promise.all([
      setDoc(ownSubmissionRef, {
        id: ownSubmissionRef.id,
        studentId,
        studentEmail: registeredAccount?.email,
        timestamp: new Date().toISOString()
      }),
      setDoc(otherSubmissionRef, {
        id: otherSubmissionRef.id,
        studentId: `${studentId}0`,
        studentEmail: `outsider-${studentId}@example.invalid`,
        timestamp: new Date().toISOString()
      })
    ]);
    BetaStorage.setSessionDataScope({
      token: 'test-token',
      email: registeredAccount?.email || '',
      isOfficer: false,
      memberId: studentId
    });

    const deadline = Date.now() + 5000;
    while (!BetaStorage.getSubmissions().some(submission => submission.id === ownSubmissionRef.id) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.deepEqual(
      BetaStorage.getSubmissions().map(submission => submission.id),
      [ownSubmissionRef.id],
      'a student submission listener must return only that student’s records'
    );

    BetaStorage.setSessionDataScope(null);
    assert.deepEqual(BetaStorage.getSubmissions(), [], 'logging out clears student-scoped submission data');
    console.log('Student account emulator test passed: concurrent duplicate registration, safe existing-profile handling, targeted sign-in, and legacy duplicate detection.');
  } finally {
    BetaStorage.setSessionDataScope(null);
    await Promise.all([
      accountRef,
      legacyDuplicateRef,
      ownSubmissionRef,
      otherSubmissionRef
    ].map(reference => deleteDoc(reference).catch(() => undefined)));
    await terminate(db);
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
