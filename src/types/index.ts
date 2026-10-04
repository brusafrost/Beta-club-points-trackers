export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  totalPoints: number;
  manualPointAdjustment?: number;
  gradeLevel?: number;
  studentId?: string;
  hasPassword?: boolean;
  passwordData?: string; // salt|hash
  createdAt?: string;
}

export interface DeletedMember extends Member {
  deletedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
}

export interface MeetingPointAward {
  id: string;
  memberId: string;
  meetingName: string;
  points: number;
  awardedBy: string;
  timestamp: string;
}

export type ServiceActivityType = 'BETA' | 'NONBETA';

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Submission {
  id: string;
  studentName: string;
  studentId?: string;
  studentEmail: string;
  category: string;
  activityType?: ServiceActivityType;
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
  type: ServiceActivityType;
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
  betaHoursTarget: number;
  nonBetaHoursTarget: number;
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
