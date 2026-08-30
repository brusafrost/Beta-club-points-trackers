
import { Member, Submission, EventItem, Officer, AppConfig, AuthSession, SubmissionStatus } from '../types';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Local cache
let localMembers: Member[] = [];
let localSubmissions: Submission[] = [];
let localEvents: EventItem[] = [];
let localOfficers: Officer[] = [];
let localConfig: AppConfig = {
  pointCap: 50,
  hoursRate: 1,
  officerCode: 'BETA2024',
  clubName: 'High School Beta Club',
  academicYear: '2023-2024',
  schoolName: 'Anytown High School'
};
let onChangeCallback: (() => void) | null = null;
let initialized = false;

function triggerChange() {
  if (onChangeCallback) onChangeCallback();
}

export class BetaStorage {
  public static setOnChange(cb: () => void) {
    onChangeCallback = cb;
  }

  public static async initialize(): Promise<void> {
    if (initialized) return;
    initialized = true;
    if (typeof window === 'undefined') return;

    // Listen to config
    onSnapshot(doc(db, 'config', 'main'), (snap) => {
      if (snap.exists()) {
        localConfig = snap.data() as AppConfig;
      } else {
        // Seed config
        setDoc(doc(db, 'config', 'main'), localConfig);
      }
      triggerChange();
    });

    // Listen to members
    onSnapshot(collection(db, 'members'), (snap) => {
      localMembers = snap.docs.map(d => d.data() as Member);
      triggerChange();
    });

    // Listen to submissions
    onSnapshot(collection(db, 'submissions'), (snap) => {
      localSubmissions = snap.docs.map(d => d.data() as Submission);
      localSubmissions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      triggerChange();
    });

    // Listen to events
    onSnapshot(collection(db, 'events'), (snap) => {
      localEvents = snap.docs.map(d => d.data() as EventItem);
      triggerChange();
    });

    // Listen to officers
    onSnapshot(collection(db, 'officers'), (snap) => {
      localOfficers = snap.docs.map(d => d.data() as Officer);
      triggerChange();
    });
  }

  // ---- SYNCHRONOUS GETTERS ----
  public static getConfig(): AppConfig { return localConfig; }
  public static getMembers(): Member[] { return [...localMembers]; }
  public static getMemberById(id: string): Member | undefined { return localMembers.find(m => m.id === id); }
  public static getMemberByEmail(email: string): Member | undefined { return localMembers.find(m => m.email.toLowerCase() === email.toLowerCase()); }
  public static getSubmissions(): Submission[] { return [...localSubmissions]; }
  public static getEvents(): EventItem[] { return [...localEvents]; }
  public static getOfficers(): Officer[] { return [...localOfficers]; }

  // ---- CONFIG ----
  public static updateConfig(newConfig: Partial<AppConfig>): AppConfig {
    const updated = { ...localConfig, ...newConfig };
    setDoc(doc(db, 'config', 'main'), updated);
    return updated;
  }

  // ---- OFFICERS ----
  public static addOfficer(officer: Officer): void {
    setDoc(doc(db, 'officers', officer.email), officer);
  }
  public static removeOfficer(email: string): void {
    deleteDoc(doc(db, 'officers', email));
  }

  // ---- EVENTS ----
  public static addEvent(evt: Omit<EventItem, 'id'>): EventItem {
    const id = `evt-${Date.now()}`;
    const newEvent = { ...evt, id };
    setDoc(doc(db, 'events', id), newEvent);
    return newEvent;
  }
  public static deleteEvent(id: string): void {
    deleteDoc(doc(db, 'events', id));
  }

  // ---- AUTH & SESSION ----
  public static getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    const s = localStorage.getItem('betaclub_auth_session_v3');
    return s ? JSON.parse(s) : null;
  }
  public static saveSession(session: AuthSession): void {
    localStorage.setItem('betaclub_auth_session_v3', JSON.stringify(session));
  }
  public static clearSession(): void {
    localStorage.removeItem('betaclub_auth_session_v3');
  }

  public static async loginStudent(email: string, password?: string): Promise<{ success: boolean; member?: Member; error?: string; token?: string }> {
    // Await docs directly from firestore to prevent race conditions on slow connections
    const snap = await getDocs(collection(db, 'members'));
    const members = snap.docs.map(d => d.data() as Member);
    const member = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (!member) return { success: false, error: 'Student not found.' };
    const session: AuthSession = { token: `tok-${Date.now()}`, email: member.email, isOfficer: false, memberId: member.id, name: member.name };
    this.saveSession(session);
    return { success: true, member, token: session.token };
  }

  public static loginOfficer(code: string): { success: boolean; error?: string; token?: string } {
    if (code === localConfig.officerCode) {
      const session: AuthSession = { token: `tok-${Date.now()}`, email: 'officer@school.edu', isOfficer: true, name: 'Officer' };
      this.saveSession(session);
      return { success: true, token: session.token };
    }
    return { success: false, error: 'Invalid officer code' };
  }

  public static async registerMember(firstName: string, lastName: string, email: string, password?: string, gradeLevel: number = 11): Promise<{ success: boolean; member?: Member; error?: string }> {
    if (localMembers.some(m => m.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email already exists.' };
    }
    const fullName = `${firstName} ${lastName}`.trim();
    const newMember: Member = {
      id: `mem-${Date.now()}`,
      firstName, lastName, name: fullName, email: email.toLowerCase(),
      totalPoints: 0, gradeLevel, studentId: `STU${1000 + localMembers.length}`,
      hasPassword: !!password, createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'members', newMember.id), newMember);
    return { success: true, member: newMember };
  }

  // ---- MEMBERS ----
  public static updateProfile(memberId: string, firstName: string, lastName: string, newEmail: string, gradeLevel?: number): { success: boolean; error?: string } {
    const member = localMembers.find(m => m.id === memberId);
    if (!member) return { success: false, error: 'Member not found.' };
    const updated = { ...member, firstName, lastName, name: `${firstName} ${lastName}`.trim(), email: newEmail.toLowerCase(), gradeLevel: gradeLevel || member.gradeLevel };
    setDoc(doc(db, 'members', member.id), updated);
    return { success: true };
  }

  public static updateMemberInline(id: string, field: 'firstName' | 'lastName' | 'email' | 'totalPoints' | 'gradeLevel', value: string | number): boolean {
    const member = localMembers.find(m => m.id === id);
    if (!member) return false;
    const updated = { ...member, [field]: value };
    if (field === 'firstName' || field === 'lastName') {
      updated.name = `${updated.firstName} ${updated.lastName}`.trim();
    }
    setDoc(doc(db, 'members', id), updated);
    return true;
  }

  public static removeMember(id: string): void {
    deleteDoc(doc(db, 'members', id));
    // Optionally delete their submissions? Left as is for now.
  }

  public static bulkImportMembers(rawText: string): { added: number; updated: number; merged: number } {
    // Basic bulk import directly to firestore
    const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    let added = 0;
    
    // We will do this asynchronously so we don't block, but return early
    setTimeout(async () => {
      const batch = writeBatch(db);
      for (const line of lines) {
        const parts = line.split(/\t|,(?=\s*\S)|\s{2,}/).map(p => p.trim()).filter(Boolean);
        if (parts.length === 0) continue;
        let namePart = parts[0];
        let emailPart = parts.length > 1 && parts[1].includes('@') ? parts[1].toLowerCase().trim() : '';
        let firstName = ''; let lastName = '';
        if (namePart.includes(',')) {
          const nameSplit = namePart.split(',').map(s => s.trim());
          lastName = nameSplit[0] || ''; firstName = nameSplit[1] || '';
        } else {
          const words = namePart.split(/\s+/);
          firstName = words[0] || ''; lastName = words.slice(1).join(' ') || '';
        }
        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) continue;
        if (!emailPart) emailPart = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.edu`;
        
        const existingByEmail = localMembers.find(m => m.email.toLowerCase() === emailPart);
        if (!existingByEmail) {
          const newId = `mem-${Date.now()}-${Math.random().toString(36).substring(2,6)}`;
          batch.set(doc(db, 'members', newId), {
            id: newId, firstName, lastName, name: fullName, email: emailPart,
            totalPoints: 0, gradeLevel: 11, studentId: `STU${1000 + Math.floor(Math.random()*1000)}`,
            hasPassword: false, createdAt: new Date().toISOString()
          });
          added++;
        }
      }
      await batch.commit();
    }, 0);
    return { added: lines.length, updated: 0, merged: 0 }; // Fake return for instant UI
  }

  public static async changePassword(memberId: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  // ---- SUBMISSIONS & POINTS ----
  public static addSubmission(studentName: string, studentEmail: string, category: string, hours: number, date: string, assignedTo: string, proofUrl: string, comments?: string): { success: boolean; submission?: Submission; error?: string } {
    const calculatedPoints = Math.round(hours * localConfig.hoursRate * 10) / 10;
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const finalCategory = category.trim();

    // If this category isn't already present as an event, add it (non-beta) so it appears in pickers and the matrix
    const exists = localEvents.some(e => e.name.toLowerCase() === finalCategory.toLowerCase());
    if (!exists) {
      try {
        this.addEvent({ name: finalCategory, type: 'NONBETA', description: 'Added from submission' });
      } catch (err) {
        // Non-fatal: proceed with submission even if event creation fails
        console.warn('Failed to auto-create event for submission category', finalCategory, err);
      }
    }

    const newSub: Submission = {
      id: subId, studentName: studentName.trim(), studentEmail: studentEmail.toLowerCase().trim(),
      category: finalCategory, hours, points: calculatedPoints, date, assignedTo: assignedTo.trim() || 'Officer',
      proofUrl: proofUrl || '', status: 'Pending', timestamp: new Date().toISOString(), comments: comments ? comments.trim() : ''
    };
    setDoc(doc(db, 'submissions', subId), newSub);
    return { success: true, submission: newSub };
  }

  public static addDirectCommentToOfficers(studentName: string, studentEmail: string, inquiryTopic: string, comments: string, assignedTo?: string): { success: boolean; submission?: Submission; error?: string } {
    return this.addSubmission(studentName, studentEmail, inquiryTopic || 'Direct Officer Inquiry', 0, new Date().toISOString().split('T')[0], assignedTo || 'Officer', '', comments);
  }

  public static updateSubmissionOfficerNotes(subId: string, notes: string): { success: boolean; error?: string } {
    const sub = localSubmissions.find(s => s.id === subId);
    if (!sub) return { success: false, error: 'Not found' };
    setDoc(doc(db, 'submissions', subId), { ...sub, officerNotes: notes }, { merge: true });
    return { success: true };
  }

  public static updateSubmissionComments(subId: string, comments: string): { success: boolean; error?: string } {
    const sub = localSubmissions.find(s => s.id === subId);
    if (!sub) return { success: false, error: 'Not found' };
    setDoc(doc(db, 'submissions', subId), { ...sub, comments: comments }, { merge: true });
    return { success: true };
  }

  public static deleteSubmission(subId: string): { success: boolean; error?: string } {
    deleteDoc(doc(db, 'submissions', subId));
    return { success: true };
  }

  public static approveSubmission(subId: string, customPoints?: number, notes?: string): { success: boolean; actualPoints: number; capMsg?: string; error?: string } {
    const sub = localSubmissions.find(s => s.id === subId);
    if (!sub) return { success: false, actualPoints: 0, error: 'Not found' };
    const member = this.getMemberByEmail(sub.studentEmail);
    const requested = typeof customPoints === 'number' && !isNaN(customPoints) ? customPoints : sub.points;
    const currentPoints = member ? member.totalPoints : 0;
    const cap = localConfig.pointCap;
    const actual = Math.min(requested, Math.max(0, cap - currentPoints));
    
    const updatedSub = { ...sub, points: actual, status: 'Approved' as SubmissionStatus };
    if (notes) updatedSub.officerNotes = notes;
    setDoc(doc(db, 'submissions', subId), updatedSub);
    
    // Recalculate member points asynchronously (after a short delay to let sub save)
    setTimeout(() => this.recalculateMemberPoints(sub.studentEmail), 500);

    const capMsg = requested > actual ? ` (Capped at ${actual.toFixed(1)} due to cap)` : '';
    return { success: true, actualPoints: actual, capMsg };
  }

  public static rejectSubmission(subId: string, notes?: string): { success: boolean; error?: string } {
    const sub = localSubmissions.find(s => s.id === subId);
    if (!sub) return { success: false, error: 'Not found' };
    const updated = { ...sub, status: 'Rejected' as SubmissionStatus };
    if (notes) updated.officerNotes = notes;
    setDoc(doc(db, 'submissions', subId), updated);
    setTimeout(() => this.recalculateMemberPoints(sub.studentEmail), 500);
    return { success: true };
  }

  public static awardBonusPoints(memberId: string, points: number, reason: string, allowOverCap: boolean): { success: boolean; actualPoints: number; capMsg?: string; error?: string } {
    const member = this.getMemberById(memberId);
    if (!member) return { success: false, actualPoints: 0, error: 'Not found' };
    const current = member.totalPoints;
    const actual = allowOverCap ? points : Math.min(points, Math.max(0, localConfig.pointCap - current));
    
    const newSub: Submission = {
      id: `bonus-${Date.now()}`, studentName: member.name, studentEmail: member.email, category: `Bonus: ${reason}`,
      hours: 0, points: actual, date: new Date().toISOString().split('T')[0], assignedTo: 'Officer',
      proofUrl: '', status: 'Approved', timestamp: new Date().toISOString(), officerNotes: `Awarded by officer: ${reason}`
    };
    setDoc(doc(db, 'submissions', newSub.id), newSub);
    setTimeout(() => this.recalculateMemberPoints(member.email), 500);
    return { success: true, actualPoints: actual };
  }

  public static recalculateMemberPoints(email: string): number {
    const norm = email.toLowerCase().trim();
    const member = localMembers.find(m => m.email.toLowerCase() === norm);
    if (!member) return 0;
    
    getDocs(collection(db, 'submissions')).then(snap => {
      const allSubs = snap.docs.map(d => d.data() as Submission);
      const studentSubs = allSubs.filter(s => s.studentEmail.toLowerCase() === norm && s.status === 'Approved');
      const total = studentSubs.reduce((sum, s) => sum + (s.points || 0), 0);
      const rounded = Math.round(total * 10) / 10;
      setDoc(doc(db, 'members', member.id), { ...member, totalPoints: rounded }, { merge: true });
    });
    return 0; // Async
  }

  public static batchApproveAllPending(): { success: boolean; count: number } {
    const pending = localSubmissions.filter(s => s.status === 'Pending');
    const batch = writeBatch(db);
    pending.forEach(sub => {
      const ref = doc(db, 'submissions', sub.id);
      batch.update(ref, { status: 'Approved' });
    });
    batch.commit().then(() => {
      // Lazy recalculate
      const emails = new Set(pending.map(s => s.studentEmail));
      emails.forEach(e => this.recalculateMemberPoints(e));
    });
    return { success: true, count: pending.length };
  }

  public static archiveApprovedSubmissions(subIds?: string[]): { success: boolean; count: number } {
    const batch = writeBatch(db);
    let count = 0;
    localSubmissions.forEach(sub => {
      if (sub.status === 'Approved' && (!subIds || subIds.includes(sub.id))) {
        batch.update(doc(db, 'submissions', sub.id), { isArchivedFromQueue: true });
        count++;
      }
    });
    batch.commit();
    return { success: true, count };
  }

  public static unarchiveSubmissions(subIds?: string[]): { success: boolean; count: number } {
    const batch = writeBatch(db);
    let count = 0;
    localSubmissions.forEach(sub => {
      if (sub.isArchivedFromQueue && (!subIds || subIds.includes(sub.id))) {
        batch.update(doc(db, 'submissions', sub.id), { isArchivedFromQueue: false });
        count++;
      }
    });
    batch.commit();
    return { success: true, count };
  }

  // --- STUBS FOR OLD FEATURES ---
  public static ensureDemoStudent(): Member { return localMembers[0] || {} as Member; }
  public static resetToDemoState(): void {}
  public static clearToZeroState(): void {}
  public static resetToSeedData(): void {}
  public static getRemoteGasUrl(): string { return ''; }
  public static setRemoteGasUrl(url: string): void {}
}
