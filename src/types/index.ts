export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  totalPoints: number;
  gradeLevel?: number;
  studentId?: string;
  hasPassword?: boolean;
  passwordData?: string; // salt|hash
  createdAt?: string;
}

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  category: string;
  hours: number;
  points: number;
  date: string;
  assignedTo: string;
  proofUrl: string;
  status: SubmissionStatus;
  timestamp: string;
  comments?: string;
  officerNotes?: string;
  isArchivedFromQueue?: boolean;
}

export interface EventItem {
  id: string;
  name: string;
  type: 'BETA' | 'NONBETA';
  description: string;
  defaultHoursRate?: number;
}

export interface Officer {
  email: string;
  name: string;
  title?: string;
}

export interface AppConfig {
  pointCap: number;
  hoursRate: number;
  officerCode: string;
  clubName: string;
  academicYear: string;
  schoolName: string;
}

export interface AuthSession {
  token: string;
  email: string;
  isOfficer: boolean;
  memberId?: string;
  name?: string;
}
