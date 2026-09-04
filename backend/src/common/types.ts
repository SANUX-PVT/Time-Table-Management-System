export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export const WORKING_DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export type SlotType = 'ASSEMBLY' | 'LESSON' | 'BREAK' | 'LUNCH' | 'ACTIVITY';

export interface TimeSlot {
  id: string;
  day: Day;
  order: number;
  start: string; // "HH:mm"
  end: string;
  label: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'CLASSROOM' | 'LAB' | 'HALL' | 'SPECIAL';
  capacity: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  requiresSpecialRoom: boolean;
  allowConsecutive: boolean;
}

export interface Grade {
  id: string;
  name: string;
  order: number;
  active: boolean;
  headTeacherId?: string;
}

export interface GradeSubjectConfig {
  id: string;
  gradeId: string;
  subjectId: string;
  periodsPerWeek: number;
  maxPeriodsPerDay: number;
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeId: string;
  classTeacherId?: string;
  roomId?: string;
  studentCount: number;
}

export interface Term {
  id: string;
  academicYear: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface StudentGroup {
  id: string;
  name: string;
  subjectId: string;
  memberClassIds: string[];
}

export type Role =
  | 'ADMIN'
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'SECTIONAL_HEAD'
  | 'GRADE_HEAD'
  | 'CLASS_TEACHER'
  | 'TEACHER'
  | 'PARENT';

export type PermissionKey =
  | 'VIEW_SCHOOL_CONFIG'
  | 'VIEW_ACADEMIC_STRUCTURE'
  | 'VIEW_REPORTS'
  | 'VIEW_AUDIT_LOG'
  | 'VIEW_RELIEF_DASHBOARD'
  | 'MANAGE_USERS'
  | 'EDIT_MASTER_TIMETABLE'
  | 'GENERATE_TIMETABLE'
  | 'MANAGE_DAILY_OPERATIONS'
  | 'DECIDE_ABSENCES'
  | 'MONITOR_LESSON_PLANS'
  | 'MANAGE_TERMS'
  | 'PUBLISH_MASTER_TIMETABLE'
  | 'MANAGE_EXAMS'
  | 'MANAGE_ROOM_BOOKINGS';

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  VIEW_SCHOOL_CONFIG: 'View & edit School Configuration',
  VIEW_ACADEMIC_STRUCTURE: 'View & edit Academic Structure',
  VIEW_REPORTS: 'View Reports & Analytics',
  VIEW_AUDIT_LOG: 'View Audit Log',
  VIEW_RELIEF_DASHBOARD: 'View Relief Dashboard',
  MANAGE_USERS: 'Manage Users & Roles',
  EDIT_MASTER_TIMETABLE: 'Edit Master Timetable (others get view-only)',
  GENERATE_TIMETABLE: 'Use Generate Timetable (automatic scheduling)',
  MANAGE_DAILY_OPERATIONS: 'Manage Daily Operations (mark others absent, find/assign relief, cancel or override lessons)',
  DECIDE_ABSENCES: 'Approve / Reject absence requests',
  MONITOR_LESSON_PLANS: 'Monitor Lesson Plans (view every teacher\'s lesson plans & progress)',
  MANAGE_TERMS: 'Manage Academic Terms (create terms, switch the active term)',
  PUBLISH_MASTER_TIMETABLE: 'Publish Master Timetable edits directly (others get submitted for approval)',
  MANAGE_EXAMS: 'Manage Exam Sessions & Exam Timetable',
  MANAGE_ROOM_BOOKINGS: 'Manage Room & Resource Bookings',
};

export type RolePermissions = Record<Role, PermissionKey[]>;

export interface Unavailability {
  day: Day;
  periodId: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeNo: string;
  subjectIds: string[];
  gradeIds: string[];
  classIds: string[];
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  maxConsecutivePeriods: number;
  unavailable: Unavailability[];
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teacherId?: string;
  gradeIds?: string[];
  classId?: string; // for PARENT role — which class's timetable/lesson plans they can see
}

export interface MasterTimetableEntry {
  id: string;
  day: Day;
  periodId: string;
  classId: string;
  type: SlotType;
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  locked: boolean;
  // If set, this entry is one leg of a StudentGroup lesson: sibling entries (one per
  // member class) share the same groupId + day + periodId + subjectId + teacherId,
  // but each keeps its own classId/id so every existing per-class code path
  // (WeekGrid, clash checks, daily materialization) works unchanged.
  groupId?: string;
}

export const LESSON_LIKE_TYPES: SlotType[] = ['LESSON', 'ACTIVITY'];

export type TimetableStatus = 'DRAFT' | 'VALIDATED' | 'APPROVED' | 'PUBLISHED';

export interface TimetableVersion {
  id: string;
  version: number;
  status: TimetableStatus;
  createdAt: string;
  createdBy: string;
  publishedAt?: string;
  notes?: string;
  termId?: string;
}

export type LessonStatus =
  | 'SCHEDULED'
  | 'TEACHER_ABSENT'
  | 'RELIEF_REQUIRED'
  | 'RELIEF_ASSIGNED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'CHECKED_OUT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED';

export interface DailyTimetableEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  day: Day;
  periodId: string;
  classId: string;
  type: SlotType;
  subjectId?: string;
  teacherId?: string; // current teacher (could be relief)
  originalTeacherId?: string;
  roomId?: string;
  status: LessonStatus;
  isRelief: boolean;
  absenceId?: string;
  checkIn?: string;
  checkOut?: string;
  masterEntryId?: string;
  groupId?: string;
}

export type AbsenceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Absence {
  id: string;
  teacherId: string;
  date: string;
  wholeDay: boolean;
  periodIds: string[];
  reason: string;
  remarks?: string;
  status: AbsenceStatus;
  createdAt: string;
  termId?: string;
}

export interface ReliefAssignment {
  id: string;
  absenceId: string;
  dailyEntryId: string;
  reliefTeacherId: string;
  assignedBy: string;
  assignedAt: string;
  score?: number;
  termId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  termId?: string;
}

export interface NotificationItem {
  id: string;
  toRole?: Role;
  toUserId?: string;
  message: string;
  createdAt: string;
  read: boolean;
  category: string;
}

export type LessonPlanStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

export interface LessonPlan {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  date: string; // "YYYY-MM-DD"
  periodIds: string[];
  masterEntryIds: string[];
  topic: string;
  objectives: string;
  resources?: string;
  homework?: string;
  status: LessonPlanStatus;
  progressNotes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  termId?: string;
  syllabusItemId?: string;
}

export interface Holiday {
  id: string;
  date: string; // "YYYY-MM-DD"
  label: string;
  halfDay: boolean;
}

export interface ExamSession {
  id: string;
  name: string;
  termId?: string;
  startDate: string;
  endDate: string;
}

export interface ExamTimetableEntry {
  id: string;
  examSessionId: string;
  date: string;
  periodId: string;
  classId: string;
  subjectId: string;
  roomId?: string;
  invigilatorTeacherId?: string;
}

export type RoomBookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface RoomBooking {
  id: string;
  roomId: string;
  date: string;
  periodId: string;
  bookedBy: string;
  purpose: string;
  status: RoomBookingStatus;
  createdAt: string;
}

export type SwapRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type SwapDecision = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface SwapRequest {
  id: string;
  requestingTeacherId: string;
  requestingEntryId: string;
  targetTeacherId: string;
  targetEntryId: string;
  teacherDecision: SwapDecision;
  adminDecision: SwapDecision;
  adminDecidedBy?: string;
  // Overall outcome: REJECTED if either party rejects, ACCEPTED only once both accept, else PENDING.
  status: SwapRequestStatus;
  createdAt: string;
  decidedAt?: string;
}

export type PreferenceLevel = 'PREFERRED' | 'AVOID';

export interface TeacherPreference {
  id: string;
  teacherId: string;
  day: Day;
  periodId: string;
  preference: PreferenceLevel;
}

export interface SyllabusItem {
  id: string;
  gradeSubjectConfigId: string;
  title: string;
  targetWeek: number;
}

export type AssignmentStatus = 'ASSIGNED' | 'DUE' | 'DONE';

export interface Assignment {
  id: string;
  lessonPlanId: string;
  description: string;
  dueDate: string;
  status: AssignmentStatus;
}

export type PendingChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PendingTimetableChange {
  id: string;
  entryId?: string; // existing entry being edited; absent = a new entry proposal
  proposedBy: string;
  proposedChange: Partial<MasterTimetableEntry>;
  status: PendingChangeStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface SchoolConfig {
  name: string;
  academicYear: string;
  startTime: string;
  endTime: string;
  workingDays: Day[];
  requireAbsenceApproval: boolean;
}
