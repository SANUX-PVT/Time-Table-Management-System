export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export declare const WORKING_DAYS: Day[];
export type SlotType = 'ASSEMBLY' | 'LESSON' | 'BREAK' | 'LUNCH' | 'ACTIVITY';
export interface TimeSlot {
    id: string;
    day: Day;
    order: number;
    start: string;
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
export type Role = 'ADMIN' | 'PRINCIPAL' | 'VICE_PRINCIPAL' | 'SECTIONAL_HEAD' | 'GRADE_HEAD' | 'CLASS_TEACHER' | 'TEACHER' | 'PARENT';
export type PermissionKey = 'VIEW_SCHOOL_CONFIG' | 'VIEW_ACADEMIC_STRUCTURE' | 'VIEW_REPORTS' | 'VIEW_AUDIT_LOG' | 'VIEW_RELIEF_DASHBOARD' | 'MANAGE_USERS' | 'EDIT_MASTER_TIMETABLE' | 'GENERATE_TIMETABLE' | 'MANAGE_DAILY_OPERATIONS' | 'DECIDE_ABSENCES' | 'MONITOR_LESSON_PLANS' | 'MANAGE_TERMS' | 'PUBLISH_MASTER_TIMETABLE' | 'MANAGE_EXAMS' | 'MANAGE_ROOM_BOOKINGS';
export declare const PERMISSION_LABELS: Record<PermissionKey, string>;
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
    classId?: string;
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
    groupId?: string;
}
export declare const LESSON_LIKE_TYPES: SlotType[];
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
export type LessonStatus = 'SCHEDULED' | 'TEACHER_ABSENT' | 'RELIEF_REQUIRED' | 'RELIEF_ASSIGNED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'CHECKED_OUT' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export interface DailyTimetableEntry {
    id: string;
    date: string;
    day: Day;
    periodId: string;
    classId: string;
    type: SlotType;
    subjectId?: string;
    teacherId?: string;
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
    date: string;
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
    date: string;
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
    entryId?: string;
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
