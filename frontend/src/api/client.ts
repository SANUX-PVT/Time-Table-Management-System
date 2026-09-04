import axios from 'axios';
import type {
  Absence,
  Assignment,
  AssignmentStatus,
  AuditLogEntry,
  DailyTimetableEntry,
  DashboardSummary,
  ExamSession,
  ExamTimetableEntry,
  Grade,
  GradeSubjectConfig,
  Holiday,
  LessonPlan,
  LessonPlanStatus,
  LessonPlanSummaryRow,
  MasterTimetableEntry,
  NotificationItem,
  PendingTimetableChange,
  PermissionKey,
  ReliefCandidate,
  Role,
  RolePermissions,
  Room,
  RoomBooking,
  SchoolClass,
  SchoolConfig,
  StudentGroup,
  Subject,
  SwapRequest,
  SyllabusItem,
  Teacher,
  TeacherPreference,
  Term,
  TimeSlot,
  TimetableVersion,
  User,
} from '../types';

export const api = axios.create({ baseURL: 'http://localhost:3000/api' });

// On the GitHub Pages static deploy there's no backend to call — VITE_USE_MOCK
// (set only by the Pages build in .github/workflows/deploy-pages.yml) swaps in
// an in-browser mock that replicates the real API so the demo is interactive.
// main.tsx awaits this before rendering, so no component's first fetch races
// the swap and falls through to a real (failing) network call.
export async function setupApiAdapter() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { mockAdapter } = await import('../mock/adapter');
    api.defaults.adapter = mockAdapter;
  }
}

export const Config = {
  get: () => api.get<SchoolConfig>('/config').then((r) => r.data),
  update: (body: Partial<SchoolConfig>) => api.put<SchoolConfig>('/config', body).then((r) => r.data),
  timeSlots: () => api.get<TimeSlot[]>('/config/time-slots').then((r) => r.data),
  createTimeSlot: (body: Partial<TimeSlot>) => api.post<TimeSlot>('/config/time-slots', body).then((r) => r.data),
  updateTimeSlot: (id: string, body: Partial<TimeSlot>) => api.put<TimeSlot>(`/config/time-slots/${id}`, body).then((r) => r.data),
  deleteTimeSlot: (id: string) => api.delete(`/config/time-slots/${id}`).then((r) => r.data),
};

export const Academic = {
  grades: () => api.get<Grade[]>('/academic/grades').then((r) => r.data),
  createGrade: (body: Partial<Grade>) => api.post<Grade>('/academic/grades', body).then((r) => r.data),
  updateGrade: (id: string, body: Partial<Grade>) => api.put<Grade>(`/academic/grades/${id}`, body).then((r) => r.data),
  deleteGrade: (id: string) => api.delete(`/academic/grades/${id}`).then((r) => r.data),

  classes: () => api.get<SchoolClass[]>('/academic/classes').then((r) => r.data),
  createClass: (body: Partial<SchoolClass>) => api.post<SchoolClass>('/academic/classes', body).then((r) => r.data),
  updateClass: (id: string, body: Partial<SchoolClass>) => api.put<SchoolClass>(`/academic/classes/${id}`, body).then((r) => r.data),
  deleteClass: (id: string) => api.delete(`/academic/classes/${id}`).then((r) => r.data),

  subjects: () => api.get<Subject[]>('/academic/subjects').then((r) => r.data),
  createSubject: (body: Partial<Subject>) => api.post<Subject>('/academic/subjects', body).then((r) => r.data),
  updateSubject: (id: string, body: Partial<Subject>) => api.put<Subject>(`/academic/subjects/${id}`, body).then((r) => r.data),
  deleteSubject: (id: string) => api.delete(`/academic/subjects/${id}`).then((r) => r.data),

  gradeSubjects: () => api.get<GradeSubjectConfig[]>('/academic/grade-subjects').then((r) => r.data),
  createGradeSubject: (body: Partial<GradeSubjectConfig>) => api.post<GradeSubjectConfig>('/academic/grade-subjects', body).then((r) => r.data),
  updateGradeSubject: (id: string, body: Partial<GradeSubjectConfig>) => api.put<GradeSubjectConfig>(`/academic/grade-subjects/${id}`, body).then((r) => r.data),
  deleteGradeSubject: (id: string) => api.delete(`/academic/grade-subjects/${id}`).then((r) => r.data),

  rooms: () => api.get<Room[]>('/academic/rooms').then((r) => r.data),
  createRoom: (body: Partial<Room>) => api.post<Room>('/academic/rooms', body).then((r) => r.data),
  updateRoom: (id: string, body: Partial<Room>) => api.put<Room>(`/academic/rooms/${id}`, body).then((r) => r.data),
  deleteRoom: (id: string) => api.delete(`/academic/rooms/${id}`).then((r) => r.data),
};

export const Teachers = {
  list: () => api.get<Teacher[]>('/teachers').then((r) => r.data),
  get: (id: string) => api.get<Teacher>(`/teachers/${id}`).then((r) => r.data),
  masterTimetable: (id: string) => api.get<MasterTimetableEntry[]>(`/teachers/${id}/master-timetable`).then((r) => r.data),
  workload: (id: string) => api.get(`/teachers/${id}/workload`).then((r) => r.data),
  create: (body: Partial<Teacher>) => api.post<Teacher>('/teachers', body).then((r) => r.data),
  update: (id: string, body: Partial<Teacher>) => api.put<Teacher>(`/teachers/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/teachers/${id}`).then((r) => r.data),
};

export const Users = {
  list: () => api.get<User[]>('/users').then((r) => r.data),
  update: (id: string, body: Partial<User>) => api.put<User>(`/users/${id}`, body).then((r) => r.data),
};

export const Timetable = {
  master: (params?: { classId?: string; day?: string }) =>
    api.get<MasterTimetableEntry[]>('/timetable/master', { params }).then((r) => r.data),
  versions: () => api.get<TimetableVersion[]>('/timetable/versions').then((r) => r.data),
  create: (body: Partial<MasterTimetableEntry> & { directPublish?: boolean; proposedBy?: string }) =>
    api.post<MasterTimetableEntry | { pending: true; change: PendingTimetableChange }>('/timetable/master', body).then((r) => r.data),
  update: (id: string, body: Partial<MasterTimetableEntry> & { directPublish?: boolean; proposedBy?: string }) =>
    api.put<MasterTimetableEntry | { pending: true; change: PendingTimetableChange }>(`/timetable/master/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/timetable/master/${id}`).then((r) => r.data),
  validate: () => api.get('/timetable/validate').then((r) => r.data),
  publish: (notes?: string) => api.post('/timetable/publish', { notes }).then((r) => r.data),
  copyDay: (body: { classId: string; fromDay: string; toDay: string }) =>
    api.post<{ copied: number; skipped: string[] }>('/timetable/copy-day', body).then((r) => r.data),
  generate: (body: { scope: 'ALL' | 'CLASS'; classId?: string; mode: 'FILL_GAPS' | 'REGENERATE' }) =>
    api.post<{ created: number; cleared: number; unresolved: string[] }>('/timetable/generate', body).then((r) => r.data),
  createGroupLesson: (body: { day: string; periodId: string; groupId: string; teacherId: string; roomId?: string }) =>
    api.post<MasterTimetableEntry[]>('/timetable/group-lesson', body).then((r) => r.data),
  removeGroupLesson: (groupId: string, day: string, periodId: string) =>
    api.delete(`/timetable/group-lesson/${groupId}/${day}/${periodId}`).then((r) => r.data),
  pending: () => api.get<PendingTimetableChange[]>('/timetable/pending').then((r) => r.data),
  decidePending: (id: string, body: { approve: boolean; decidedBy: string }) =>
    api.put<PendingTimetableChange>(`/timetable/pending/${id}/decision`, body).then((r) => r.data),
};

export const Daily = {
  timetable: (params: { date: string; classId?: string; teacherId?: string }) =>
    api.get<DailyTimetableEntry[]>('/daily/timetable', { params }).then((r) => r.data),
  override: (id: string, body: any) => api.put(`/daily/timetable/${id}/override`, body).then((r) => r.data),
  absences: (params?: { date?: string; teacherId?: string }) =>
    api.get<Absence[]>('/daily/absences', { params }).then((r) => r.data),
  markAbsent: (body: any) => api.post('/daily/absences', body).then((r) => r.data),
  decideAbsence: (id: string, body: { approve: boolean; decidedBy: string }) =>
    api.put(`/daily/absences/${id}/decision`, body).then((r) => r.data),
  reliefCandidates: (dailyEntryId: string) =>
    api.get<ReliefCandidate[]>('/daily/relief-candidates', { params: { dailyEntryId } }).then((r) => r.data),
  assignRelief: (body: { dailyEntryId: string; reliefTeacherId: string; assignedBy: string }) =>
    api.post('/daily/relief-assign', body).then((r) => r.data),
  checkIn: (id: string) => api.post(`/daily/timetable/${id}/check-in`).then((r) => r.data),
  checkOut: (id: string) => api.post(`/daily/timetable/${id}/check-out`).then((r) => r.data),
};

export const Dashboard = {
  summary: (date?: string) => api.get<DashboardSummary>('/dashboard', { params: { date } }).then((r) => r.data),
};

export const Audit = {
  list: (limit?: number) => api.get<AuditLogEntry[]>('/audit', { params: { limit } }).then((r) => r.data),
};

export const Notifications = {
  list: (role?: string) => api.get<NotificationItem[]>('/notifications', { params: { role } }).then((r) => r.data),
  markRead: (id: string) => api.post(`/notifications/${id}/read`).then((r) => r.data),
};

export const Permissions = {
  get: () => api.get<{ permissions: RolePermissions; labels: Record<PermissionKey, string> }>('/permissions').then((r) => r.data),
  updateRole: (role: Role, permissions: PermissionKey[]) =>
    api.put(`/permissions/${role}`, { permissions }).then((r) => r.data),
};

export const LessonPlans = {
  list: (params?: { teacherId?: string; classId?: string; date?: string; from?: string; to?: string; status?: LessonPlanStatus }) =>
    api.get<LessonPlan[]>('/lesson-plans', { params }).then((r) => r.data),
  summary: (params?: { from?: string; to?: string }) =>
    api.get<LessonPlanSummaryRow[]>('/lesson-plans/summary', { params }).then((r) => r.data),
  get: (id: string) => api.get<LessonPlan>(`/lesson-plans/${id}`).then((r) => r.data),
  create: (body: Partial<LessonPlan>) => api.post<LessonPlan>('/lesson-plans', body).then((r) => r.data),
  update: (id: string, body: Partial<LessonPlan>) => api.put<LessonPlan>(`/lesson-plans/${id}`, body).then((r) => r.data),
  updateStatus: (id: string, body: { status: LessonPlanStatus; progressNotes?: string }) =>
    api.put<LessonPlan>(`/lesson-plans/${id}/status`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/lesson-plans/${id}`).then((r) => r.data),
};

export const Reports = {
  teacherWorkload: () => api.get('/reports/teacher-workload').then((r) => r.data),
  absences: () => api.get('/reports/absences').then((r) => r.data),
  relief: () => api.get('/reports/relief').then((r) => r.data),
  attendance: () => api.get('/reports/attendance').then((r) => r.data),
  operational: () => api.get('/reports/operational').then((r) => r.data),
  trends: (metric: 'absences' | 'relief' | 'lessonPlanCompletion', bucket: 'week' | 'month' = 'week') =>
    api.get('/reports/trends', { params: { metric, bucket } }).then((r) => r.data),
};

export const Terms = {
  list: () => api.get<Term[]>('/terms').then((r) => r.data),
  create: (body: Partial<Term>) => api.post<Term>('/terms', body).then((r) => r.data),
  update: (id: string, body: Partial<Term>) => api.put<Term>(`/terms/${id}`, body).then((r) => r.data),
  activate: (id: string) => api.put<Term>(`/terms/${id}/activate`).then((r) => r.data),
};

export const Groups = {
  list: () => api.get<StudentGroup[]>('/groups').then((r) => r.data),
  create: (body: Partial<StudentGroup>) => api.post<StudentGroup>('/groups', body).then((r) => r.data),
  update: (id: string, body: Partial<StudentGroup>) => api.put<StudentGroup>(`/groups/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/groups/${id}`).then((r) => r.data),
};

export const Holidays = {
  list: () => api.get<Holiday[]>('/holidays').then((r) => r.data),
  create: (body: Partial<Holiday>) => api.post<Holiday>('/holidays', body).then((r) => r.data),
  remove: (id: string) => api.delete(`/holidays/${id}`).then((r) => r.data),
};

export const Exams = {
  sessions: () => api.get<ExamSession[]>('/exams/sessions').then((r) => r.data),
  createSession: (body: Partial<ExamSession>) => api.post<ExamSession>('/exams/sessions', body).then((r) => r.data),
  entries: (params?: { examSessionId?: string; classId?: string }) =>
    api.get<ExamTimetableEntry[]>('/exams/entries', { params }).then((r) => r.data),
  generate: (sessionId: string, body: { classIds: string[]; subjectIds: string[] }) =>
    api.post<{ created: number; unresolved: string[] }>(`/exams/sessions/${sessionId}/generate`, body).then((r) => r.data),
  updateEntry: (id: string, body: Partial<ExamTimetableEntry>) => api.put<ExamTimetableEntry>(`/exams/entries/${id}`, body).then((r) => r.data),
  removeEntry: (id: string) => api.delete(`/exams/entries/${id}`).then((r) => r.data),
};

export const RoomBookings = {
  list: (params?: { roomId?: string; date?: string }) => api.get<RoomBooking[]>('/room-bookings', { params }).then((r) => r.data),
  create: (body: Partial<RoomBooking>) => api.post<RoomBooking>('/room-bookings', body).then((r) => r.data),
  cancel: (id: string) => api.delete(`/room-bookings/${id}`).then((r) => r.data),
};

export const SwapRequests = {
  list: (teacherId?: string) => api.get<SwapRequest[]>('/swap-requests', { params: { teacherId } }).then((r) => r.data),
  create: (body: { requestingTeacherId: string; requestingEntryId: string; targetTeacherId: string; targetEntryId: string }) =>
    api.post<SwapRequest>('/swap-requests', body).then((r) => r.data),
  teacherDecide: (id: string, accept: boolean) => api.put<SwapRequest>(`/swap-requests/${id}/teacher-decision`, { accept }).then((r) => r.data),
  adminDecide: (id: string, accept: boolean, decidedBy: string) =>
    api.put<SwapRequest>(`/swap-requests/${id}/admin-decision`, { accept, decidedBy }).then((r) => r.data),
};

export const TeacherPreferences = {
  get: (teacherId: string) => api.get<TeacherPreference[]>(`/teachers/${teacherId}/preferences`).then((r) => r.data),
  set: (teacherId: string, preferences: Omit<TeacherPreference, 'id' | 'teacherId'>[]) =>
    api.put<TeacherPreference[]>(`/teachers/${teacherId}/preferences`, { preferences }).then((r) => r.data),
};

export const Syllabus = {
  list: (gradeSubjectConfigId?: string) => api.get<SyllabusItem[]>('/syllabus', { params: { gradeSubjectConfigId } }).then((r) => r.data),
  create: (body: Partial<SyllabusItem>) => api.post<SyllabusItem>('/syllabus', body).then((r) => r.data),
  update: (id: string, body: Partial<SyllabusItem>) => api.put<SyllabusItem>(`/syllabus/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/syllabus/${id}`).then((r) => r.data),
  coverage: (classId: string, subjectId: string) =>
    api.get<{ total: number; completed: number; coveragePercent: number; behindTarget: boolean }>('/syllabus/coverage', { params: { classId, subjectId } }).then((r) => r.data),
};

export const Assignments = {
  list: (params?: { lessonPlanId?: string; classId?: string }) => api.get<Assignment[]>('/assignments', { params }).then((r) => r.data),
  create: (body: Partial<Assignment>) => api.post<Assignment>('/assignments', body).then((r) => r.data),
  updateStatus: (id: string, status: AssignmentStatus) => api.put<Assignment>(`/assignments/${id}/status`, { status }).then((r) => r.data),
  remove: (id: string) => api.delete(`/assignments/${id}`).then((r) => r.data),
};
