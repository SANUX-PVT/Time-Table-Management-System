// Browser-side port of every backend controller in backend/src/modules/**,
// adapted from Nest.js decorated methods into plain (params, query, body) =>
// result functions operating on the shared mock store. See mock/adapter.ts
// for how these are wired up to intercept axios requests.
import { store } from './mockStore';
import { badRequest, notFound } from './errors';
import type {
  Assignment,
  AssignmentStatus,
  Day,
  ExamSession,
  ExamTimetableEntry,
  Grade,
  GradeSubjectConfig,
  Holiday,
  LessonPlan,
  MasterTimetableEntry,
  PendingTimetableChange,
  Room,
  RoomBooking,
  SchoolClass,
  StudentGroup,
  Subject,
  SwapRequest,
  SyllabusItem,
  Teacher,
  TeacherPreference,
  Term,
  TimeSlot,
  User,
} from '../types';

export interface Ctx {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: any;
}
export interface Route {
  method: string;
  pattern: string;
  handler: (ctx: Ctx) => any;
}

const routes: Route[] = [];
const on = (method: string, pattern: string, handler: (ctx: Ctx) => any) => routes.push({ method, pattern, handler });

const DAY_MAP: Record<number, Day | null> = { 0: null, 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: null };
function dayOf(date: string): Day | null {
  return DAY_MAP[new Date(date + 'T00:00:00').getDay()];
}

// ==================== Config ====================
on('GET', '/config', () => store.schoolConfig);
on('PUT', '/config', ({ body }) => {
  store.schoolConfig = { ...store.schoolConfig, ...body };
  store.addAudit('SCHOOL_CONFIG_UPDATED', 'Admin User', 'School configuration updated.');
  return store.schoolConfig;
});
on('GET', '/config/time-slots', () => store.timeSlots);
on('POST', '/config/time-slots', ({ body }) => {
  if (!body.day || !body.start || !body.end) throw badRequest('day, start and end are required');
  const dayCount = store.timeSlots.filter((s) => s.day === body.day).length;
  const slot: TimeSlot = { id: store.id(), day: body.day, order: body.order ?? dayCount, start: body.start, end: body.end, label: body.label ?? 'New Period' };
  store.timeSlots.push(slot);
  store.addAudit('TIME_SLOT_CREATED', 'Admin User', `Added "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day}. It now appears on every class's Master Timetable — configure its type per class.`);
  return slot;
});
on('PUT', '/config/time-slots/:id', ({ params, body }) => {
  const slot = store.timeSlots.find((s) => s.id === params.id);
  if (!slot) throw notFound();
  Object.assign(slot, body);
  store.addAudit('TIME_SLOT_UPDATED', 'Admin User', `Updated "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day}.`);
  return slot;
});
on('DELETE', '/config/time-slots/:id', ({ params }) => {
  const slot = store.timeSlots.find((s) => s.id === params.id);
  if (!slot) throw notFound();
  const lockedInUse = store.masterTimetable.some((m) => m.periodId === params.id && m.locked);
  if (lockedInUse) throw badRequest('Cannot delete: this period is locked for at least one class. Unlock it first.');
  const affectedClasses = new Set(store.masterTimetable.filter((m) => m.periodId === params.id).map((m) => m.classId)).size;
  store.masterTimetable = store.masterTimetable.filter((m) => m.periodId !== params.id);
  store.dailyTimetable = store.dailyTimetable.filter((e) => e.periodId !== params.id);
  store.timeSlots = store.timeSlots.filter((s) => s.id !== params.id);
  store.addAudit('TIME_SLOT_DELETED', 'Admin User', `Removed "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day} — cleared from ${affectedClasses} class timetable(s).`);
  return { success: true };
});

// ==================== Academic ====================
on('GET', '/academic/grades', () => store.grades);
on('POST', '/academic/grades', ({ body }) => {
  const grade: Grade = { id: store.id(), name: body.name ?? 'New Grade', order: body.order ?? store.grades.length + 1, active: body.active ?? true, headTeacherId: body.headTeacherId };
  store.grades.push(grade);
  store.addAudit('GRADE_CREATED', 'Admin User', `Grade "${grade.name}" created.`);
  return grade;
});
on('PUT', '/academic/grades/:id', ({ params, body }) => {
  const grade = store.grades.find((g) => g.id === params.id);
  if (!grade) throw notFound();
  Object.assign(grade, body);
  store.addAudit('GRADE_UPDATED', 'Admin User', `Grade "${grade.name}" updated.`);
  return grade;
});
on('DELETE', '/academic/grades/:id', ({ params }) => {
  const grade = store.grades.find((g) => g.id === params.id);
  if (!grade) throw notFound();
  if (store.classes.some((c) => c.gradeId === params.id)) throw badRequest('Cannot delete: this grade still has classes assigned to it.');
  store.grades = store.grades.filter((g) => g.id !== params.id);
  store.gradeSubjects = store.gradeSubjects.filter((g) => g.gradeId !== params.id);
  store.addAudit('GRADE_DELETED', 'Admin User', `Grade "${grade.name}" deleted.`);
  return { success: true };
});

on('GET', '/academic/classes', () => store.classes);
on('POST', '/academic/classes', ({ body }) => {
  const cls: SchoolClass = { id: store.id(), name: body.name ?? 'New Class', gradeId: body.gradeId, classTeacherId: body.classTeacherId, roomId: body.roomId, studentCount: body.studentCount ?? 0 };
  store.classes.push(cls);
  store.addAudit('CLASS_CREATED', 'Admin User', `Class "${cls.name}" created.`);
  return cls;
});
on('PUT', '/academic/classes/:id', ({ params, body }) => {
  const cls = store.classes.find((c) => c.id === params.id);
  if (!cls) throw notFound();
  Object.assign(cls, body);
  store.addAudit('CLASS_UPDATED', 'Admin User', `Class "${cls.name}" updated.`);
  return cls;
});
on('DELETE', '/academic/classes/:id', ({ params }) => {
  const cls = store.classes.find((c) => c.id === params.id);
  if (!cls) throw notFound();
  if (store.masterTimetable.some((m) => m.classId === params.id)) throw badRequest('Cannot delete: this class still has lessons in the master timetable.');
  store.classes = store.classes.filter((c) => c.id !== params.id);
  store.addAudit('CLASS_DELETED', 'Admin User', `Class "${cls.name}" deleted.`);
  return { success: true };
});

on('GET', '/academic/subjects', () => store.subjects);
on('POST', '/academic/subjects', ({ body }) => {
  const subject: Subject = { id: store.id(), name: body.name ?? 'New Subject', code: body.code ?? 'SUBJ', requiresSpecialRoom: body.requiresSpecialRoom ?? false, allowConsecutive: body.allowConsecutive ?? false };
  store.subjects.push(subject);
  store.addAudit('SUBJECT_CREATED', 'Admin User', `Subject "${subject.name}" created.`);
  return subject;
});
on('PUT', '/academic/subjects/:id', ({ params, body }) => {
  const subject = store.subjects.find((s) => s.id === params.id);
  if (!subject) throw notFound();
  Object.assign(subject, body);
  return subject;
});
on('DELETE', '/academic/subjects/:id', ({ params }) => {
  const subject = store.subjects.find((s) => s.id === params.id);
  if (!subject) throw notFound();
  if (store.gradeSubjects.some((g) => g.subjectId === params.id) || store.masterTimetable.some((m) => m.subjectId === params.id)) {
    throw badRequest('Cannot delete: this subject is still allocated to a grade or scheduled in the master timetable.');
  }
  store.subjects = store.subjects.filter((s) => s.id !== params.id);
  store.addAudit('SUBJECT_DELETED', 'Admin User', `Subject "${subject.name}" deleted.`);
  return { success: true };
});

on('GET', '/academic/grade-subjects', () => store.gradeSubjects);
on('POST', '/academic/grade-subjects', ({ body }) => {
  const gsc: GradeSubjectConfig = { id: store.id(), gradeId: body.gradeId, subjectId: body.subjectId, periodsPerWeek: body.periodsPerWeek ?? 1, maxPeriodsPerDay: body.maxPeriodsPerDay ?? 1 };
  store.gradeSubjects.push(gsc);
  return gsc;
});
on('PUT', '/academic/grade-subjects/:id', ({ params, body }) => {
  const gsc = store.gradeSubjects.find((g) => g.id === params.id);
  if (!gsc) throw notFound();
  Object.assign(gsc, body);
  return gsc;
});
on('DELETE', '/academic/grade-subjects/:id', ({ params }) => {
  store.gradeSubjects = store.gradeSubjects.filter((g) => g.id !== params.id);
  return { success: true };
});

on('GET', '/academic/rooms', () => store.rooms);
on('POST', '/academic/rooms', ({ body }) => {
  const room: Room = { id: store.id(), name: body.name ?? 'New Room', type: body.type ?? 'CLASSROOM', capacity: body.capacity ?? 30 };
  store.rooms.push(room);
  return room;
});
on('PUT', '/academic/rooms/:id', ({ params, body }) => {
  const room = store.rooms.find((r) => r.id === params.id);
  if (!room) throw notFound();
  Object.assign(room, body);
  return room;
});
on('DELETE', '/academic/rooms/:id', ({ params }) => {
  const room = store.rooms.find((r) => r.id === params.id);
  if (!room) throw notFound();
  if (store.classes.some((c) => c.roomId === params.id) || store.masterTimetable.some((m) => m.roomId === params.id)) {
    throw badRequest('Cannot delete: this room is still assigned to a class or scheduled in the master timetable.');
  }
  store.rooms = store.rooms.filter((r) => r.id !== params.id);
  store.addAudit('ROOM_DELETED', 'Admin User', `Room "${room.name}" deleted.`);
  return { success: true };
});

// ==================== Teachers ====================
on('GET', '/teachers', () => store.teachers);
on('GET', '/teachers/:id', ({ params }) => {
  const teacher = store.teachers.find((t) => t.id === params.id);
  if (!teacher) throw notFound();
  return teacher;
});
on('GET', '/teachers/:id/master-timetable', ({ params }) => store.masterTimetable.filter((e) => e.teacherId === params.id));
on('GET', '/teachers/:id/workload', ({ params }) => {
  const entries = store.masterTimetable.filter((e) => e.teacherId === params.id);
  const teacher = store.teachers.find((t) => t.id === params.id);
  const byDay: Record<string, number> = {};
  for (const e of entries) byDay[e.day] = (byDay[e.day] ?? 0) + 1;
  return {
    teacherId: params.id,
    totalPeriodsPerWeek: entries.length,
    maxPeriodsPerWeek: teacher?.maxPeriodsPerWeek ?? 0,
    periodsPerDay: byDay,
    maxPeriodsPerDay: teacher?.maxPeriodsPerDay ?? 0,
    overWeeklyLimit: teacher ? entries.length > teacher.maxPeriodsPerWeek : false,
  };
});
on('GET', '/teachers/:id/preferences', ({ params }) => store.teacherPreferences.filter((p) => p.teacherId === params.id));
on('PUT', '/teachers/:id/preferences', ({ params, body }) => {
  store.teacherPreferences = store.teacherPreferences.filter((p) => p.teacherId !== params.id);
  const created = (body.preferences ?? []).map((p: Omit<TeacherPreference, 'id' | 'teacherId'>) => ({ id: store.id(), teacherId: params.id, ...p }));
  store.teacherPreferences.push(...created);
  return created;
});
on('POST', '/teachers', ({ body }) => {
  const teacher: Teacher = {
    id: store.id(), name: body.name ?? 'New Teacher', email: body.email ?? '', phone: body.phone ?? '', employeeNo: body.employeeNo ?? '',
    subjectIds: body.subjectIds ?? [], gradeIds: body.gradeIds ?? [], classIds: body.classIds ?? [],
    maxPeriodsPerDay: body.maxPeriodsPerDay ?? 6, maxPeriodsPerWeek: body.maxPeriodsPerWeek ?? 26, maxConsecutivePeriods: body.maxConsecutivePeriods ?? 3,
    unavailable: body.unavailable ?? [], active: body.active ?? true,
  };
  store.teachers.push(teacher);
  store.addAudit('TEACHER_CREATED', 'Admin User', `Teacher "${teacher.name}" created.`);
  return teacher;
});
on('PUT', '/teachers/:id', ({ params, body }) => {
  const teacher = store.teachers.find((t) => t.id === params.id);
  if (!teacher) throw notFound();
  Object.assign(teacher, body);
  store.addAudit('TEACHER_UPDATED', 'Admin User', `Teacher "${teacher.name}" updated.`);
  return teacher;
});
on('DELETE', '/teachers/:id', ({ params }) => {
  const teacher = store.teachers.find((t) => t.id === params.id);
  if (!teacher) throw notFound();
  if (store.masterTimetable.some((m) => m.teacherId === params.id)) {
    throw badRequest('Cannot delete: this teacher still has lessons in the master timetable. Reassign or remove them first.');
  }
  store.teachers = store.teachers.filter((t) => t.id !== params.id);
  store.addAudit('TEACHER_DELETED', 'Admin User', `Teacher "${teacher.name}" removed.`);
  return { success: true };
});

// ==================== Users ====================
on('GET', '/users', () => store.users);
on('GET', '/users/:id', ({ params }) => store.users.find((u) => u.id === params.id) ?? null);
on('PUT', '/users/:id', ({ params, body }) => {
  const user = store.users.find((u) => u.id === params.id);
  if (!user) throw notFound();
  Object.assign(user, body);
  store.addAudit('USER_UPDATED', 'Admin User', `User "${user.name}" role/access updated.`);
  return user;
});

// ==================== Timetable ====================
function conflictCheck(entry: Partial<MasterTimetableEntry>, ignoreId?: string) {
  return store.masterTimetable.filter(
    (e) => e.id !== ignoreId && e.day === entry.day && e.periodId === entry.periodId &&
      ((entry.teacherId && e.teacherId === entry.teacherId) || e.classId === entry.classId || (entry.roomId && e.roomId === entry.roomId)),
  );
}
function availabilityConflict(entry: Partial<MasterTimetableEntry>) {
  if (!entry.teacherId || !entry.day || !entry.periodId) return null;
  const teacher = store.teachers.find((t) => t.id === entry.teacherId);
  if (!teacher) return null;
  return teacher.unavailable.some((u) => u.day === entry.day && u.periodId === entry.periodId) ? teacher : null;
}
function queuePendingChange(entryId: string | undefined, proposedChange: Partial<MasterTimetableEntry>, proposedBy: string) {
  const { directPublish, proposedBy: _pb, ...change } = proposedChange as any;
  const pending: PendingTimetableChange = { id: store.id(), entryId, proposedBy, proposedChange: change, status: 'PENDING', createdAt: new Date().toISOString() };
  store.pendingTimetableChanges.push(pending);
  store.addAudit('TIMETABLE_CHANGE_SUBMITTED', proposedBy, `Submitted a master timetable change for approval (${entryId ? 'edit' : 'new entry'}).`);
  return { pending: true, change: pending };
}
const LESSON_LIKE = ['LESSON', 'ACTIVITY'];

on('GET', '/timetable/master', ({ query }) => {
  let entries = store.masterTimetable;
  if (query.classId) entries = entries.filter((e) => e.classId === query.classId);
  if (query.day) entries = entries.filter((e) => e.day === query.day);
  return entries;
});
on('GET', '/timetable/versions', () => store.timetableVersions);
on('POST', '/timetable/master', ({ body }) => {
  if (!body.day || !body.periodId || !body.classId || !body.type) throw badRequest('day, periodId, classId and type are required');
  const needsSubjectTeacher = LESSON_LIKE.includes(body.type);
  if (needsSubjectTeacher && (!body.subjectId || !body.teacherId)) throw badRequest('Subject and teacher are required for lesson/activity periods.');
  const clashes = conflictCheck(body);
  if (clashes.length) throw badRequest({ message: 'Timetable conflict detected', clashes });
  const unavailableTeacher = availabilityConflict(body);
  if (unavailableTeacher) throw badRequest(`${unavailableTeacher.name} has declared themselves unavailable during this period.`);
  if (body.directPublish === false) return queuePendingChange(undefined, body, body.proposedBy ?? 'Unknown');
  const entry: MasterTimetableEntry = {
    id: store.id(), day: body.day, periodId: body.periodId, classId: body.classId, type: body.type,
    subjectId: needsSubjectTeacher ? body.subjectId : undefined, teacherId: needsSubjectTeacher ? body.teacherId : undefined,
    roomId: body.roomId, locked: body.locked ?? false,
  };
  store.masterTimetable.push(entry);
  store.addAudit('MASTER_ENTRY_CREATED', body.proposedBy ?? 'Admin User', `Timetable entry created for ${entry.day}.`);
  return entry;
});
on('PUT', '/timetable/master/:id', ({ params, body }) => {
  const entry = store.masterTimetable.find((e) => e.id === params.id);
  if (!entry) throw notFound();
  if (entry.locked && body.locked !== false) throw badRequest('Entry is locked. Unlock before editing.');
  const merged = { ...entry, ...body };
  const needsSubjectTeacher = LESSON_LIKE.includes(merged.type);
  if (needsSubjectTeacher && (!merged.subjectId || !merged.teacherId)) throw badRequest('Subject and teacher are required for lesson/activity periods.');
  if (!needsSubjectTeacher) { merged.subjectId = undefined; merged.teacherId = undefined; }
  const clashes = conflictCheck(merged, params.id);
  if (clashes.length) throw badRequest({ message: 'Timetable conflict detected', clashes });
  const unavailableTeacher = availabilityConflict(merged);
  if (unavailableTeacher) throw badRequest(`${unavailableTeacher.name} has declared themselves unavailable during this period.`);
  if (body.directPublish === false) return queuePendingChange(params.id, body, body.proposedBy ?? 'Unknown');
  Object.assign(entry, merged);
  store.addAudit('MASTER_ENTRY_UPDATED', body.proposedBy ?? 'Admin User', `Timetable entry updated (${entry.day}).`);
  return entry;
});
on('GET', '/timetable/pending', () => store.pendingTimetableChanges.filter((c) => c.status === 'PENDING'));
on('PUT', '/timetable/pending/:id/decision', ({ params, body }) => {
  const change = store.pendingTimetableChanges.find((c) => c.id === params.id);
  if (!change) throw notFound();
  if (change.status !== 'PENDING') throw badRequest('This change has already been decided.');
  change.status = body.approve ? 'APPROVED' : 'REJECTED';
  change.decidedAt = new Date().toISOString();
  change.decidedBy = body.decidedBy;
  if (body.approve) {
    if (change.entryId) {
      const entry = store.masterTimetable.find((e) => e.id === change.entryId);
      if (entry) Object.assign(entry, change.proposedChange);
    } else {
      store.masterTimetable.push({ ...change.proposedChange, id: store.id() } as MasterTimetableEntry);
    }
  }
  store.addAudit('TIMETABLE_CHANGE_DECIDED', body.decidedBy, `${body.decidedBy} ${body.approve ? 'approved' : 'rejected'} a master timetable change proposed by ${change.proposedBy}.`);
  return change;
});
on('POST', '/timetable/group-lesson', ({ body }) => {
  if (!body.day || !body.periodId || !body.groupId || !body.teacherId) throw badRequest('day, periodId, groupId and teacherId are required.');
  const group = store.studentGroups.find((g) => g.id === body.groupId);
  if (!group) throw notFound();
  if (!group.memberClassIds.length) throw badRequest('This group has no member classes.');
  for (const classId of group.memberClassIds) {
    const clashes = conflictCheck({ day: body.day, periodId: body.periodId, classId, teacherId: body.teacherId, roomId: body.roomId });
    if (clashes.length) {
      const cls = store.classes.find((c) => c.id === classId);
      throw badRequest(`Conflict scheduling ${group.name}: ${cls?.name} already has something in this period.`);
    }
  }
  const unavailableTeacher = availabilityConflict({ day: body.day, periodId: body.periodId, teacherId: body.teacherId });
  if (unavailableTeacher) throw badRequest(`${unavailableTeacher.name} has declared themselves unavailable during this period.`);
  const entries: MasterTimetableEntry[] = group.memberClassIds.map((classId) => ({
    id: store.id(), day: body.day, periodId: body.periodId, classId, type: 'LESSON', subjectId: group.subjectId,
    teacherId: body.teacherId, roomId: body.roomId, locked: body.locked ?? false, groupId: group.id,
  }));
  store.masterTimetable.push(...entries);
  store.addAudit('GROUP_LESSON_CREATED', 'Admin User', `Group lesson "${group.name}" scheduled on ${body.day} across ${group.memberClassIds.length} classes.`);
  return entries;
});
on('DELETE', '/timetable/group-lesson/:groupId/:day/:periodId', ({ params }) => {
  const before = store.masterTimetable.length;
  store.masterTimetable = store.masterTimetable.filter((e) => !(e.groupId === params.groupId && e.day === params.day && e.periodId === params.periodId));
  const removed = before - store.masterTimetable.length;
  store.addAudit('GROUP_LESSON_REMOVED', 'Admin User', `Group lesson removed from ${params.day} (${removed} class legs).`);
  return { removed };
});
on('DELETE', '/timetable/master/:id', ({ params }) => {
  const entry = store.masterTimetable.find((e) => e.id === params.id);
  if (entry?.locked) throw badRequest('Entry is locked.');
  store.masterTimetable = store.masterTimetable.filter((e) => e.id !== params.id);
  return { success: true };
});
on('GET', '/timetable/validate', () => {
  const issues: { level: 'error' | 'warning'; message: string }[] = [];
  const seen = new Map<string, MasterTimetableEntry[]>();
  for (const e of store.masterTimetable) {
    for (const dim of ['teacherId', 'classId', 'roomId'] as const) {
      const val = (e as any)[dim];
      if (!val) continue;
      const key = `${dim}|${e.day}|${e.periodId}|${val}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(e);
    }
  }
  for (const [key, entries] of seen) {
    const allSameGroup = entries.length > 1 && entries.every((e) => e.groupId && e.groupId === entries[0].groupId);
    if (entries.length > 1 && !allSameGroup) issues.push({ level: 'error', message: `Conflict: ${entries.length} entries clash on ${key}` });
  }
  for (const cls of store.classes) {
    const grade = store.grades.find((g) => g.id === cls.gradeId);
    const configs = store.gradeSubjects.filter((g) => g.gradeId === cls.gradeId);
    for (const conf of configs) {
      const actual = store.masterTimetable.filter((e) => e.classId === cls.id && e.subjectId === conf.subjectId).length;
      if (actual < conf.periodsPerWeek) {
        const subject = store.subjects.find((s) => s.id === conf.subjectId);
        issues.push({ level: 'warning', message: `${cls.name} (${grade?.name}): ${subject?.name} has ${actual}/${conf.periodsPerWeek} periods/week scheduled.` });
      }
    }
  }
  for (const teacher of store.teachers) {
    const count = store.masterTimetable.filter((e) => e.teacherId === teacher.id).length;
    if (count > teacher.maxPeriodsPerWeek) issues.push({ level: 'warning', message: `${teacher.name} exceeds preferred weekly workload (${count}/${teacher.maxPeriodsPerWeek}).` });
  }
  for (const teacher of store.teachers) {
    if (!teacher.unavailable.length) continue;
    const violations = store.masterTimetable.filter((e) => e.teacherId === teacher.id && teacher.unavailable.some((u) => u.day === e.day && u.periodId === e.periodId));
    for (const v of violations) {
      const cls = store.classes.find((c) => c.id === v.classId);
      issues.push({ level: 'error', message: `${teacher.name} is scheduled for ${cls?.name} on ${v.day} during a period they declared unavailable.` });
    }
  }
  for (const teacher of store.teachers) {
    const byDay = new Map<string, MasterTimetableEntry[]>();
    for (const e of store.masterTimetable.filter((e) => e.teacherId === teacher.id)) {
      if (!byDay.has(e.day)) byDay.set(e.day, []);
      byDay.get(e.day)!.push(e);
    }
    for (const [day, dayEntries] of byDay) {
      const slotOrders = dayEntries.map((e) => store.timeSlots.find((s) => s.id === e.periodId)?.order).filter((o): o is number => o !== undefined).sort((a, b) => a - b);
      let run = 1, maxRun = 1;
      for (let i = 1; i < slotOrders.length; i++) {
        run = slotOrders[i] === slotOrders[i - 1] + 1 ? run + 1 : 1;
        maxRun = Math.max(maxRun, run);
      }
      if (maxRun > teacher.maxConsecutivePeriods) issues.push({ level: 'warning', message: `${teacher.name} has ${maxRun} consecutive periods on ${day} (limit ${teacher.maxConsecutivePeriods}).` });
    }
  }
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  return { valid: errors === 0, errorCount: errors, warningCount: warnings, issues };
});
on('POST', '/timetable/generate', ({ body }) => {
  if (body.scope === 'CLASS' && !body.classId) throw badRequest('classId is required when scope is CLASS');
  const targetClassIds = body.scope === 'ALL' ? store.classes.map((c) => c.id) : [body.classId];
  const invalid = targetClassIds.find((id: string) => !store.classes.some((c) => c.id === id));
  if (invalid) throw notFound();
  const result = store.generateLessons(targetClassIds, body.mode);
  const scopeLabel = body.scope === 'ALL' ? 'the entire school' : store.classes.find((c) => c.id === body.classId)?.name ?? 'a class';
  store.addAudit(
    'TIMETABLE_GENERATED', 'Admin User',
    `Auto-generated timetable for ${scopeLabel} (${body.mode === 'REGENERATE' ? 'full regenerate' : 'fill gaps'}) — ${result.created} period(s) created${result.cleared ? `, ${result.cleared} cleared first` : ''}${result.unresolved.length ? `, ${result.unresolved.length} subject requirement(s) unresolved` : ''}.`,
  );
  return result;
});
on('POST', '/timetable/copy-day', ({ body }) => {
  const { classId, fromDay, toDay } = body;
  if (!classId || !fromDay || !toDay) throw badRequest('classId, fromDay and toDay are required');
  if (fromDay === toDay) throw badRequest('Source and target day must differ');
  const sourceEntries = store.masterTimetable.filter((e) => e.classId === classId && e.day === fromDay);
  const targetSlotsByLabel = new Map(store.timeSlots.filter((s) => s.day === toDay).map((s) => [s.label, s]));
  let copied = 0;
  const skipped: string[] = [];
  for (const src of sourceEntries) {
    const srcSlot = store.timeSlots.find((s) => s.id === src.periodId);
    const targetSlot = srcSlot ? targetSlotsByLabel.get(srcSlot.label) : undefined;
    if (!targetSlot) { skipped.push(`${srcSlot?.label ?? 'period'} (no matching slot on ${toDay})`); continue; }
    const existing = store.masterTimetable.find((e) => e.classId === classId && e.day === toDay && e.periodId === targetSlot.id);
    if (existing?.locked) { skipped.push(`${targetSlot.label} (target is locked)`); continue; }
    const candidate: Partial<MasterTimetableEntry> = { day: toDay, periodId: targetSlot.id, classId, type: src.type, subjectId: src.subjectId, teacherId: src.teacherId, roomId: src.roomId };
    const clashes = conflictCheck(candidate, existing?.id);
    const unavailableTeacher = availabilityConflict(candidate);
    if (clashes.length || unavailableTeacher) { skipped.push(`${targetSlot.label} (${unavailableTeacher ? unavailableTeacher.name + ' unavailable' : 'conflict on ' + toDay})`); continue; }
    if (existing) Object.assign(existing, candidate);
    else store.masterTimetable.push({ ...candidate, id: store.id(), locked: false } as MasterTimetableEntry);
    copied += 1;
  }
  const cls = store.classes.find((c) => c.id === classId);
  store.addAudit('MASTER_DAY_COPIED', 'Admin User', `Copied ${cls?.name}'s ${fromDay} schedule to ${toDay} — ${copied} period(s) copied, ${skipped.length} skipped.`);
  return { copied, skipped };
});
on('POST', '/timetable/publish', ({ body }) => {
  const validation = routes.find((r) => r.method === 'GET' && r.pattern === '/timetable/validate')!.handler({ params: {}, query: {}, body: {} });
  if (!validation.valid) throw badRequest('Cannot publish: unresolved conflicts exist.');
  const version = {
    id: store.id(), version: store.timetableVersions.length + 1, status: 'PUBLISHED' as const, createdAt: new Date().toISOString(),
    createdBy: 'Admin User', publishedAt: new Date().toISOString(), notes: body.notes, termId: store.currentTermId,
  };
  store.timetableVersions.push(version);
  store.addAudit('MASTER_TIMETABLE_PUBLISHED', 'Admin User', `Master timetable v${version.version} published.`);
  return version;
});

// ==================== Daily ====================
on('GET', '/daily/timetable', ({ query }) => {
  if (!query.date) throw badRequest('date query param required (YYYY-MM-DD)');
  const day = dayOf(query.date);
  if (day) store.materializeDailyTimetable(query.date, day);
  let entries = store.dailyTimetable.filter((e) => e.date === query.date);
  if (query.classId) entries = entries.filter((e) => e.classId === query.classId);
  if (query.teacherId) entries = entries.filter((e) => e.teacherId === query.teacherId || e.originalTeacherId === query.teacherId);
  return entries;
});
on('PUT', '/daily/timetable/:id/override', ({ params, body }) => {
  const entry = store.dailyTimetable.find((e) => e.id === params.id);
  if (!entry) throw notFound();
  const before = { ...entry };
  Object.assign(entry, body);
  const cls = store.classes.find((c) => c.id === entry.classId);
  const slot = store.timeSlots.find((s) => s.id === entry.periodId);
  const context = `${cls?.name ?? 'Class'} · ${slot?.label ?? 'Period'} (${entry.date})`;
  const teacherName = (tid?: string) => (tid ? store.teachers.find((t) => t.id === tid)?.name ?? 'Unknown' : '—');
  const subjectName = (sid?: string) => (sid ? store.subjects.find((s) => s.id === sid)?.name ?? 'Unknown' : '—');
  const roomName = (rid?: string) => (rid ? store.rooms.find((r) => r.id === rid)?.name ?? 'Unknown' : 'None');
  const changes: string[] = [];
  if (body.teacherId !== undefined && body.teacherId !== before.teacherId) changes.push(`Teacher: ${teacherName(before.teacherId)} → ${teacherName(body.teacherId)}`);
  if (body.subjectId !== undefined && body.subjectId !== before.subjectId) changes.push(`Subject: ${subjectName(before.subjectId)} → ${subjectName(body.subjectId)}`);
  if (body.roomId !== undefined && body.roomId !== before.roomId) changes.push(`Room: ${roomName(before.roomId)} → ${roomName(body.roomId)}`);
  if (body.status !== undefined && body.status !== before.status) changes.push(`Status: ${before.status.replace(/_/g, ' ')} → ${body.status.replace(/_/g, ' ')}`);
  const summary = changes.length ? changes.join('; ') : 'No changes';
  store.addAudit('DAILY_TIMETABLE_OVERRIDDEN', 'Admin User', `${context} — ${summary}. Reason: ${body.reason ?? 'Not specified'}.`);
  return entry;
});
on('GET', '/daily/absences', ({ query }) => {
  let list = store.absences;
  if (query.date) list = list.filter((a) => a.date === query.date);
  if (query.teacherId) list = list.filter((a) => a.teacherId === query.teacherId);
  return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});
on('POST', '/daily/absences', ({ body }) => {
  const teacher = store.teachers.find((t) => t.id === body.teacherId);
  if (!teacher) throw notFound();
  const day = dayOf(body.date);
  if (!day) throw badRequest('Not a working day');
  store.materializeDailyTimetable(body.date, day);
  const teacherEntries = store.dailyTimetable.filter((e) => e.date === body.date && e.originalTeacherId === body.teacherId);
  const affected = body.wholeDay ? teacherEntries : teacherEntries.filter((e) => body.periodIds?.includes(e.periodId));
  const status = body.requiresApproval === false ? 'APPROVED' : 'PENDING';
  const absence = {
    id: store.id(), teacherId: body.teacherId, date: body.date, wholeDay: body.wholeDay,
    periodIds: body.wholeDay ? teacherEntries.map((e) => e.periodId) : (body.periodIds ?? []),
    reason: body.reason, remarks: body.remarks, status, createdAt: new Date().toISOString(), termId: store.currentTermId,
  } as const;
  store.absences.push(absence as any);
  for (const entry of affected) { entry.status = 'TEACHER_ABSENT'; entry.absenceId = absence.id; }
  store.addAudit('ABSENCE_SUBMITTED', teacher.name, `${teacher.name} marked absent on ${body.date} (${body.reason}). ${affected.length} lesson(s) affected.`);
  store.addNotification(`${teacher.name} marked absent on ${body.date}. ${affected.length} lesson(s) need relief.`, 'ABSENCE', 'VICE_PRINCIPAL');
  return { absence, affectedEntries: affected };
});
on('PUT', '/daily/absences/:id/decision', ({ params, body }) => {
  const absence = store.absences.find((a) => a.id === params.id);
  if (!absence) throw notFound();
  absence.status = body.approve ? 'APPROVED' : 'REJECTED';
  if (!body.approve) {
    const entries = store.dailyTimetable.filter((e) => e.absenceId === params.id);
    for (const e of entries) { e.status = 'SCHEDULED'; e.teacherId = e.originalTeacherId; e.isRelief = false; e.absenceId = undefined; }
  }
  const teacher = store.teachers.find((t) => t.id === absence.teacherId);
  store.addAudit(body.approve ? 'ABSENCE_APPROVED' : 'ABSENCE_REJECTED', body.decidedBy, `Absence for ${teacher?.name} on ${absence.date} was ${body.approve ? 'approved' : 'rejected'}.`);
  store.addNotification(`Your absence request for ${absence.date} was ${body.approve ? 'approved' : 'rejected'}.`, 'ABSENCE');
  return absence;
});
on('GET', '/daily/relief-candidates', ({ query }) => {
  const entry = store.dailyTimetable.find((e) => e.id === query.dailyEntryId);
  if (!entry) throw notFound();
  if (!entry.subjectId) throw badRequest('This period has no subject/teacher to relieve.');
  const subjectId = entry.subjectId;
  const cls = store.classes.find((c) => c.id === entry.classId);
  const busyTeacherIds = new Set(store.dailyTimetable.filter((e) => e.date === entry.date && e.periodId === entry.periodId && e.id !== entry.id).map((e) => e.teacherId));
  return store.teachers
    .filter((t) => t.active && t.id !== entry.originalTeacherId)
    .map((t) => {
      const subjectQualified = t.subjectIds.includes(subjectId);
      const gradeExperience = t.gradeIds.includes(cls!.gradeId) || t.classIds.includes(cls!.id);
      const isAvailable = !t.unavailable.some((u) => u.day === entry.day && u.periodId === entry.periodId);
      const free = !busyTeacherIds.has(t.id) && isAvailable;
      const weeklyLoad = store.masterTimetable.filter((m) => m.teacherId === t.id).length;
      const lowWorkload = weeklyLoad < t.maxPeriodsPerWeek * 0.85;
      let score = 0;
      if (subjectQualified) score += 45;
      if (free) score += 30;
      if (gradeExperience) score += 15;
      if (lowWorkload) score += 10;
      let recommendation: string;
      if (!isAvailable) recommendation = 'Unavailable (declared)';
      else if (!free) recommendation = 'Unavailable';
      else if (subjectQualified && gradeExperience) recommendation = 'Best';
      else if (subjectQualified) recommendation = 'Good';
      else recommendation = 'Not recommended';
      return { teacherId: t.id, name: t.name, subjectQualified, free, gradeExperience, lowWorkload, weeklyLoad, maxPeriodsPerWeek: t.maxPeriodsPerWeek, score, recommendation };
    })
    .filter((c) => c.free)
    .sort((a, b) => b.score - a.score);
});
on('POST', '/daily/relief-assign', ({ body }) => {
  const entry = store.dailyTimetable.find((e) => e.id === body.dailyEntryId);
  if (!entry) throw notFound();
  const teacher = store.teachers.find((t) => t.id === body.reliefTeacherId);
  if (!teacher) throw notFound();
  const conflict = store.dailyTimetable.find((e) => e.id !== entry.id && e.date === entry.date && e.periodId === entry.periodId && e.teacherId === body.reliefTeacherId);
  if (conflict) throw badRequest(`${teacher.name} is already assigned during this period.`);
  entry.teacherId = body.reliefTeacherId;
  entry.isRelief = true;
  entry.status = 'RELIEF_ASSIGNED';
  store.reliefAssignments.push({ id: store.id(), absenceId: entry.absenceId!, dailyEntryId: entry.id, reliefTeacherId: body.reliefTeacherId, assignedBy: body.assignedBy, assignedAt: new Date().toISOString(), termId: store.currentTermId });
  const cls = store.classes.find((c) => c.id === entry.classId);
  store.addAudit('RELIEF_ASSIGNED', body.assignedBy, `${teacher.name} assigned as relief for ${cls?.name} on ${entry.date}.`);
  store.addNotification(`You have been assigned as relief teacher for ${cls?.name} on ${entry.date}.`, 'RELIEF');
  return entry;
});
on('POST', '/daily/timetable/:id/check-in', ({ params }) => {
  const entry = store.dailyTimetable.find((e) => e.id === params.id);
  if (!entry) throw notFound();
  entry.checkIn = new Date().toISOString();
  entry.status = 'CHECKED_IN';
  store.addAudit('LESSON_CHECK_IN', entry.teacherId ?? 'Unknown', `Checked in for ${entry.date} period.`);
  return entry;
});
on('POST', '/daily/timetable/:id/check-out', ({ params }) => {
  const entry = store.dailyTimetable.find((e) => e.id === params.id);
  if (!entry) throw notFound();
  entry.checkOut = new Date().toISOString();
  entry.status = 'COMPLETED';
  store.addAudit('LESSON_CHECK_OUT', entry.teacherId ?? 'Unknown', `Checked out for ${entry.date} period.`);
  return entry;
});

// ==================== Dashboard ====================
on('GET', '/dashboard', ({ query }) => {
  const d = query.date ?? new Date().toISOString().slice(0, 10);
  const dayEntries = store.dailyTimetable.filter((e) => e.date === d && LESSON_LIKE.includes(e.type));
  const absencesToday = store.absences.filter((a) => a.date === d);
  const teachersAbsent = new Set(absencesToday.map((a) => a.teacherId)).size;
  const reliefRequired = dayEntries.filter((e) => e.status === 'TEACHER_ABSENT').length;
  const reliefAssigned = dayEntries.filter((e) => e.isRelief && (e.status === 'RELIEF_ASSIGNED' || e.status === 'CHECKED_IN' || e.status === 'COMPLETED')).length;
  const totalTeachers = store.teachers.filter((t) => t.active).length;
  const completed = dayEntries.filter((e) => e.status === 'COMPLETED').length;
  const inProgress = dayEntries.filter((e) => e.status === 'CHECKED_IN').length;
  const overWorkloadTeachers = store.teachers.filter((t) => store.masterTimetable.filter((m) => m.teacherId === t.id).length > t.maxPeriodsPerWeek);
  const alerts: { level: 'red' | 'yellow' | 'green'; message: string }[] = [];
  const pending = reliefRequired - reliefAssigned;
  if (pending > 0) alerts.push({ level: 'red', message: `${pending} relief assignment(s) pending` });
  if (absencesToday.some((a) => a.status === 'PENDING')) alerts.push({ level: 'yellow', message: `${absencesToday.filter((a) => a.status === 'PENDING').length} absence request(s) awaiting approval` });
  if (overWorkloadTeachers.length) alerts.push({ level: 'yellow', message: `${overWorkloadTeachers.length} teacher(s) exceeded workload limit` });
  if (reliefAssigned > 0) alerts.push({ level: 'green', message: `${reliefAssigned} relief assignment(s) completed` });
  return {
    date: d,
    teachers: { present: totalTeachers - teachersAbsent, absent: teachersAbsent, pending: absencesToday.filter((a) => a.status === 'PENDING').length, total: totalTeachers },
    lessons: { scheduled: dayEntries.length, completed, inProgress },
    relief: { required: reliefRequired, assigned: reliefAssigned, pending: Math.max(pending, 0) },
    alerts,
  };
});

// ==================== Audit / Notifications ====================
on('GET', '/audit', ({ query }) => (query.limit ? store.auditLog.slice(0, Number(query.limit)) : store.auditLog));
on('GET', '/notifications', ({ query }) => {
  let list = store.notifications;
  if (query.role) list = list.filter((n) => !n.toRole || n.toRole === query.role);
  return list;
});
on('POST', '/notifications/:id/read', ({ params }) => {
  const n = store.notifications.find((x) => x.id === params.id);
  if (n) n.read = true;
  return n ?? null;
});

// ==================== Permissions ====================
on('GET', '/permissions', () => {
  const PERMISSION_LABELS: Record<string, string> = {
    VIEW_SCHOOL_CONFIG: 'View & edit School Configuration', VIEW_ACADEMIC_STRUCTURE: 'View & edit Academic Structure',
    VIEW_REPORTS: 'View Reports & Analytics', VIEW_AUDIT_LOG: 'View Audit Log', VIEW_RELIEF_DASHBOARD: 'View Relief Dashboard',
    MANAGE_USERS: 'Manage Users & Roles', EDIT_MASTER_TIMETABLE: 'Edit Master Timetable (others get view-only)',
    GENERATE_TIMETABLE: 'Use Generate Timetable (automatic scheduling)',
    MANAGE_DAILY_OPERATIONS: 'Manage Daily Operations (mark others absent, find/assign relief, cancel or override lessons)',
    DECIDE_ABSENCES: 'Approve / Reject absence requests', MONITOR_LESSON_PLANS: "Monitor Lesson Plans (view every teacher's lesson plans & progress)",
    MANAGE_TERMS: 'Manage Academic Terms (create terms, switch the active term)',
    PUBLISH_MASTER_TIMETABLE: 'Publish Master Timetable edits directly (others get submitted for approval)',
    MANAGE_EXAMS: 'Manage Exam Sessions & Exam Timetable', MANAGE_ROOM_BOOKINGS: 'Manage Room & Resource Bookings',
  };
  return { permissions: store.rolePermissions, labels: PERMISSION_LABELS };
});
on('PUT', '/permissions/:role', ({ params, body }) => {
  (store.rolePermissions as any)[params.role] = body.permissions ?? [];
  store.addAudit('ROLE_PERMISSIONS_UPDATED', 'Admin User', `Permissions for role "${params.role}" updated.`);
  return { role: params.role, permissions: (store.rolePermissions as any)[params.role] };
});

// ==================== Lesson Plans ====================
const lpTeacherName = (id?: string) => (id ? store.teachers.find((t) => t.id === id)?.name ?? 'Unknown' : 'Unknown');
const lpClassName = (id?: string) => (id ? store.classes.find((c) => c.id === id)?.name ?? 'Unknown' : 'Unknown');
const lpSubjectName = (id?: string) => (id ? store.subjects.find((s) => s.id === id)?.name ?? 'Unknown' : 'Unknown');
const withOverdue = (p: LessonPlan) => {
  const today = new Date().toISOString().slice(0, 10);
  return { ...p, overdue: p.date < today && (p.status === 'PLANNED' || p.status === 'IN_PROGRESS') };
};
on('GET', '/lesson-plans', ({ query }) => {
  let list = store.lessonPlans;
  if (query.teacherId) list = list.filter((p) => p.teacherId === query.teacherId);
  if (query.classId) list = list.filter((p) => p.classId === query.classId);
  if (query.date) list = list.filter((p) => p.date === query.date);
  if (query.from) list = list.filter((p) => p.date >= query.from!);
  if (query.to) list = list.filter((p) => p.date <= query.to!);
  if (query.status) list = list.filter((p) => p.status === query.status);
  return list.slice().sort((a, b) => b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt)).map(withOverdue);
});
on('GET', '/lesson-plans/summary', ({ query }) => {
  let list = store.lessonPlans;
  if (query.from) list = list.filter((p) => p.date >= query.from!);
  if (query.to) list = list.filter((p) => p.date <= query.to!);
  const byTeacher = new Map<string, LessonPlan[]>();
  for (const p of list) { const arr = byTeacher.get(p.teacherId) ?? []; arr.push(p); byTeacher.set(p.teacherId, arr); }
  const today = new Date().toISOString().slice(0, 10);
  const rows = [...byTeacher.entries()].map(([teacherId, plans]) => {
    const planned = plans.filter((p) => p.status === 'PLANNED').length;
    const inProgress = plans.filter((p) => p.status === 'IN_PROGRESS').length;
    const completed = plans.filter((p) => p.status === 'COMPLETED').length;
    const delayed = plans.filter((p) => p.status === 'DELAYED').length;
    const overdue = plans.filter((p) => p.date < today && (p.status === 'PLANNED' || p.status === 'IN_PROGRESS')).length;
    return { teacherId, teacherName: lpTeacherName(teacherId), total: plans.length, planned, inProgress, completed, delayed, overdue, completionRate: plans.length ? Math.round((completed / plans.length) * 100) : 0 };
  });
  return rows.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
});
on('GET', '/lesson-plans/:id', ({ params }) => {
  const plan = store.lessonPlans.find((p) => p.id === params.id);
  if (!plan) throw notFound();
  return withOverdue(plan);
});
on('POST', '/lesson-plans', ({ body }) => {
  if (!body.teacherId || !body.classId || !body.subjectId || !body.date || !body.topic || !body.objectives) {
    throw badRequest('teacherId, classId, subjectId, date, topic and objectives are required.');
  }
  const teacher = store.teachers.find((t) => t.id === body.teacherId);
  if (!teacher) throw notFound();
  const now = new Date().toISOString();
  const plan: LessonPlan = {
    id: store.id(), teacherId: body.teacherId, classId: body.classId, subjectId: body.subjectId, date: body.date,
    periodIds: body.periodIds ?? [], masterEntryIds: body.masterEntryIds ?? [], topic: body.topic, objectives: body.objectives,
    resources: body.resources, homework: body.homework, syllabusItemId: body.syllabusItemId, status: 'PLANNED', createdAt: now, updatedAt: now, termId: store.currentTermId,
  };
  store.lessonPlans.push(plan);
  store.addAudit('LESSON_PLAN_CREATED', teacher.name, `${teacher.name} created a lesson plan for ${lpClassName(plan.classId)} · ${lpSubjectName(plan.subjectId)} on ${plan.date}: "${plan.topic}".`);
  return plan;
});
on('PUT', '/lesson-plans/:id', ({ params, body }) => {
  const plan = store.lessonPlans.find((p) => p.id === params.id);
  if (!plan) throw notFound();
  Object.assign(plan, body, { updatedAt: new Date().toISOString() });
  store.addAudit('LESSON_PLAN_UPDATED', lpTeacherName(plan.teacherId), `Lesson plan for ${lpClassName(plan.classId)} · ${lpSubjectName(plan.subjectId)} on ${plan.date} was updated: "${plan.topic}".`);
  return withOverdue(plan);
});
on('PUT', '/lesson-plans/:id/status', ({ params, body }) => {
  const plan = store.lessonPlans.find((p) => p.id === params.id);
  if (!plan) throw notFound();
  const before = plan.status;
  plan.status = body.status;
  if (body.progressNotes !== undefined) plan.progressNotes = body.progressNotes;
  plan.updatedAt = new Date().toISOString();
  if (body.status === 'COMPLETED' && !plan.completedAt) plan.completedAt = plan.updatedAt;
  if (body.status !== 'COMPLETED') plan.completedAt = undefined;
  store.addAudit('LESSON_PLAN_STATUS_UPDATED', lpTeacherName(plan.teacherId), `${lpClassName(plan.classId)} · ${lpSubjectName(plan.subjectId)} lesson plan ("${plan.topic}") moved from ${before.replace('_', ' ')} to ${plan.status.replace('_', ' ')} on ${plan.date}.`);
  return withOverdue(plan);
});
on('DELETE', '/lesson-plans/:id', ({ params }) => {
  const idx = store.lessonPlans.findIndex((p) => p.id === params.id);
  if (idx === -1) throw notFound();
  const [plan] = store.lessonPlans.splice(idx, 1);
  store.addAudit('LESSON_PLAN_DELETED', lpTeacherName(plan.teacherId), `Lesson plan for ${lpClassName(plan.classId)} · ${lpSubjectName(plan.subjectId)} on ${plan.date} ("${plan.topic}") was deleted.`);
  return { ok: true };
});

// ==================== Reports ====================
const LATE_THRESHOLD_MIN = 3;
function minutesLate(slotStart: string, checkInIso: string): number {
  const [h, m] = slotStart.split(':').map(Number);
  const checkIn = new Date(checkInIso);
  const scheduled = new Date(checkIn);
  scheduled.setHours(h, m, 0, 0);
  return Math.round((checkIn.getTime() - scheduled.getTime()) / 60000);
}
function bucketOf(dateStr: string, bucket: 'week' | 'month'): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  if (bucket === 'month') return dateStr.slice(0, 7);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
on('GET', '/reports/teacher-workload', () => store.teachers.filter((t) => t.active).map((t) => {
  const entries = store.masterTimetable.filter((e) => e.teacherId === t.id);
  const subjectNames = Array.from(new Set(entries.map((e) => e.subjectId).filter(Boolean))).map((sid) => store.subjects.find((s) => s.id === sid)?.name ?? sid);
  return { teacherId: t.id, name: t.name, periodsPerWeek: entries.length, maxPeriodsPerWeek: t.maxPeriodsPerWeek, freePeriods: Math.max(0, t.maxPeriodsPerWeek - entries.length), overLimit: entries.length > t.maxPeriodsPerWeek, subjects: subjectNames, classCount: new Set(entries.map((e) => e.classId)).size };
}).sort((a, b) => b.periodsPerWeek - a.periodsPerWeek));
on('GET', '/reports/absences', () => {
  const byTeacher = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();
  for (const a of store.absences) {
    if (!byTeacher.has(a.teacherId)) byTeacher.set(a.teacherId, { total: 0, approved: 0, pending: 0, rejected: 0 });
    const row = byTeacher.get(a.teacherId)!;
    row.total += 1;
    if (a.status === 'APPROVED') row.approved += 1;
    else if (a.status === 'PENDING') row.pending += 1;
    else row.rejected += 1;
  }
  return Array.from(byTeacher.entries()).map(([teacherId, row]) => ({ teacherId, name: store.teachers.find((t) => t.id === teacherId)?.name ?? 'Unknown', ...row })).sort((a, b) => b.total - a.total);
});
on('GET', '/reports/relief', () => {
  const byTeacher = new Map<string, number>();
  for (const r of store.reliefAssignments) byTeacher.set(r.reliefTeacherId, (byTeacher.get(r.reliefTeacherId) ?? 0) + 1);
  const providedByTeacher = Array.from(byTeacher.entries()).map(([teacherId, count]) => ({ teacherId, name: store.teachers.find((t) => t.id === teacherId)?.name ?? 'Unknown', reliefCount: count })).sort((a, b) => b.reliefCount - a.reliefCount);
  const totalAbsentLessons = store.dailyTimetable.filter((e) => e.status === 'TEACHER_ABSENT').length;
  const totalReliefAssigned = store.reliefAssignments.length;
  return { providedByTeacher, totalReliefAssigned, totalPendingRelief: totalAbsentLessons, utilizationRate: totalReliefAssigned + totalAbsentLessons > 0 ? Math.round((totalReliefAssigned / (totalReliefAssigned + totalAbsentLessons)) * 100) : 100 };
});
on('GET', '/reports/attendance', () => {
  const rows = store.dailyTimetable.filter((e) => e.checkIn).map((e) => {
    const slot = store.timeSlots.find((s) => s.id === e.periodId);
    const late = slot ? minutesLate(slot.start, e.checkIn!) : 0;
    return { id: e.id, date: e.date, teacherId: e.teacherId, teacherName: store.teachers.find((t) => t.id === e.teacherId)?.name ?? 'Unknown', className: store.classes.find((c) => c.id === e.classId)?.name ?? '—', subjectName: store.subjects.find((s) => s.id === e.subjectId)?.name ?? '—', periodLabel: slot?.label ?? '—', checkIn: e.checkIn, checkOut: e.checkOut, minutesLate: late, isLate: late > LATE_THRESHOLD_MIN, status: e.status };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
  return { rows, lateCount: rows.filter((r) => r.isLate).length, completedCount: rows.filter((r) => r.status === 'COMPLETED').length };
});
on('GET', '/reports/trends', ({ query }) => {
  const metric = query.metric ?? 'absences';
  const bucket = (query.bucket as 'week' | 'month') ?? 'week';
  if (metric === 'absences') {
    const byBucket = new Map<string, number>();
    for (const a of store.absences) { const b = bucketOf(a.date, bucket); byBucket.set(b, (byBucket.get(b) ?? 0) + 1); }
    return [...byBucket.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, count]) => ({ bucket, count }));
  }
  if (metric === 'relief') {
    const byBucket = new Map<string, number>();
    for (const r of store.reliefAssignments) { const b = bucketOf(r.assignedAt, bucket); byBucket.set(b, (byBucket.get(b) ?? 0) + 1); }
    return [...byBucket.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, count]) => ({ bucket, count }));
  }
  const byBucket = new Map<string, { total: number; completed: number }>();
  for (const p of store.lessonPlans) {
    const b = bucketOf(p.date, bucket);
    if (!byBucket.has(b)) byBucket.set(b, { total: 0, completed: 0 });
    const row = byBucket.get(b)!;
    row.total += 1;
    if (p.status === 'COMPLETED') row.completed += 1;
  }
  return [...byBucket.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, row]) => ({ bucket, total: row.total, completed: row.completed, rate: row.total ? Math.round((row.completed / row.total) * 100) : 0 }));
});
on('GET', '/reports/operational', () => {
  const cancelled = store.dailyTimetable.filter((e) => e.status === 'CANCELLED').length;
  const rescheduled = store.dailyTimetable.filter((e) => e.status === 'RESCHEDULED').length;
  const pendingAbsences = store.absences.filter((a) => a.status === 'PENDING').length;
  const overrideEvents = store.auditLog.filter((a) => a.action === 'DAILY_TIMETABLE_OVERRIDDEN').length;
  return { totalAbsences: store.absences.length, pendingAbsences, cancelledLessons: cancelled, rescheduledLessons: rescheduled, timetableChangeEvents: overrideEvents };
});

// ==================== Terms ====================
on('GET', '/terms', () => store.terms);
on('POST', '/terms', ({ body }) => {
  const term: Term = { id: store.id(), academicYear: body.academicYear ?? store.schoolConfig.academicYear, name: body.name ?? 'New Term', startDate: body.startDate ?? '', endDate: body.endDate ?? '', active: false };
  store.terms.push(term);
  store.addAudit('TERM_CREATED', 'Admin User', `Term "${term.name}" (${term.academicYear}) created.`);
  return term;
});
on('PUT', '/terms/:id', ({ params, body }) => {
  const term = store.terms.find((t) => t.id === params.id);
  if (!term) throw notFound();
  Object.assign(term, body, { id: term.id, active: term.active });
  return term;
});
on('PUT', '/terms/:id/activate', ({ params }) => {
  const term = store.terms.find((t) => t.id === params.id);
  if (!term) throw notFound();
  for (const t of store.terms) t.active = t.id === params.id;
  store.currentTermId = params.id;
  store.addAudit('TERM_ACTIVATED', 'Admin User', `Switched active term to "${term.name}" (${term.academicYear}).`);
  return term;
});

// ==================== Student Groups ====================
on('GET', '/groups', () => store.studentGroups);
on('POST', '/groups', ({ body }) => {
  if (!body.name || !body.subjectId || !body.memberClassIds?.length) throw badRequest('name, subjectId and at least one member class are required.');
  const group: StudentGroup = { id: store.id(), name: body.name, subjectId: body.subjectId, memberClassIds: body.memberClassIds };
  store.studentGroups.push(group);
  store.addAudit('STUDENT_GROUP_CREATED', 'Admin User', `Student group "${group.name}" created with ${group.memberClassIds.length} member classes.`);
  return group;
});
on('PUT', '/groups/:id', ({ params, body }) => {
  const group = store.studentGroups.find((g) => g.id === params.id);
  if (!group) throw notFound();
  Object.assign(group, body, { id: group.id });
  return group;
});
on('DELETE', '/groups/:id', ({ params }) => {
  if (store.masterTimetable.some((e) => e.groupId === params.id)) throw badRequest('This group has scheduled lessons — remove them from the Master Timetable first.');
  store.studentGroups = store.studentGroups.filter((g) => g.id !== params.id);
  return { success: true };
});

// ==================== Holidays ====================
on('GET', '/holidays', () => [...store.holidays].sort((a, b) => a.date.localeCompare(b.date)));
on('POST', '/holidays', ({ body }) => {
  if (!body.date || !body.label) throw badRequest('date and label are required.');
  const holiday: Holiday = { id: store.id(), date: body.date, label: body.label, halfDay: body.halfDay ?? false };
  store.holidays.push(holiday);
  store.addAudit('HOLIDAY_ADDED', 'Admin User', `Holiday "${holiday.label}" added on ${holiday.date}.`);
  return holiday;
});
on('DELETE', '/holidays/:id', ({ params }) => {
  store.holidays = store.holidays.filter((h) => h.id !== params.id);
  return { success: true };
});

// ==================== Exams ====================
function datesInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) { out.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return out;
}
on('GET', '/exams/sessions', () => store.examSessions);
on('POST', '/exams/sessions', ({ body }) => {
  if (!body.name || !body.startDate || !body.endDate) throw badRequest('name, startDate and endDate are required.');
  const session: ExamSession = { id: store.id(), name: body.name, termId: body.termId ?? store.currentTermId, startDate: body.startDate, endDate: body.endDate };
  store.examSessions.push(session);
  store.addAudit('EXAM_SESSION_CREATED', 'Admin User', `Exam session "${session.name}" created (${session.startDate} to ${session.endDate}).`);
  return session;
});
on('GET', '/exams/entries', ({ query }) => {
  let list = store.examTimetable;
  if (query.examSessionId) list = list.filter((e) => e.examSessionId === query.examSessionId);
  if (query.classId) list = list.filter((e) => e.classId === query.classId);
  return list.sort((a, b) => a.date.localeCompare(b.date));
});
on('POST', '/exams/sessions/:id/generate', ({ params, body }) => {
  const session = store.examSessions.find((s) => s.id === params.id);
  if (!session) throw notFound();
  const { classIds, subjectIds } = body;
  if (!classIds?.length || !subjectIds?.length) throw badRequest('classIds and subjectIds are required.');
  store.examTimetable = store.examTimetable.filter((e) => e.examSessionId !== params.id);
  const dates = datesInRange(session.startDate, session.endDate).filter((d) => dayOf(d));
  const busyClass = new Set<string>();
  const busyRoom = new Set<string>();
  const busyInvigilator = new Set<string>();
  const created: ExamTimetableEntry[] = [];
  const unresolved: string[] = [];
  for (const classId of classIds) {
    for (const subjectId of subjectIds) {
      let placed = false;
      for (const date of dates) {
        const day = dayOf(date)!;
        const slots = store.slotsForDay(day);
        for (const slot of slots) {
          const classKey = `${classId}|${date}|${slot.id}`;
          if (busyClass.has(classKey)) continue;
          const room = store.rooms.find((r) => !busyRoom.has(`${r.id}|${date}|${slot.id}`));
          const invigilator = store.teachers.find((t) => t.active && !busyInvigilator.has(`${t.id}|${date}|${slot.id}`) && !t.unavailable.some((u) => u.day === day && u.periodId === slot.id));
          if (!room || !invigilator) continue;
          const entry: ExamTimetableEntry = { id: store.id(), examSessionId: params.id, date, periodId: slot.id, classId, subjectId, roomId: room.id, invigilatorTeacherId: invigilator.id };
          store.examTimetable.push(entry);
          created.push(entry);
          busyClass.add(classKey);
          busyRoom.add(`${room.id}|${date}|${slot.id}`);
          busyInvigilator.add(`${invigilator.id}|${date}|${slot.id}`);
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (!placed) {
        const cls = store.classes.find((c) => c.id === classId);
        const subject = store.subjects.find((s) => s.id === subjectId);
        unresolved.push(`${cls?.name} · ${subject?.name}`);
      }
    }
  }
  store.addAudit('EXAM_TIMETABLE_GENERATED', 'Admin User', `Generated exam timetable for "${session.name}" — ${created.length} exam(s) scheduled${unresolved.length ? `, ${unresolved.length} unresolved` : ''}.`);
  return { created: created.length, unresolved };
});
on('PUT', '/exams/entries/:id', ({ params, body }) => {
  const entry = store.examTimetable.find((e) => e.id === params.id);
  if (!entry) throw notFound();
  Object.assign(entry, body, { id: entry.id });
  return entry;
});
on('DELETE', '/exams/entries/:id', ({ params }) => {
  store.examTimetable = store.examTimetable.filter((e) => e.id !== params.id);
  return { success: true };
});

// ==================== Room Bookings ====================
on('GET', '/room-bookings', ({ query }) => {
  let list = store.roomBookings.filter((b) => b.status === 'CONFIRMED');
  if (query.roomId) list = list.filter((b) => b.roomId === query.roomId);
  if (query.date) list = list.filter((b) => b.date === query.date);
  return list.sort((a, b) => a.date.localeCompare(b.date));
});
on('POST', '/room-bookings', ({ body }) => {
  if (!body.roomId || !body.date || !body.periodId || !body.bookedBy || !body.purpose) throw badRequest('roomId, date, periodId, bookedBy and purpose are required.');
  const room = store.rooms.find((r) => r.id === body.roomId);
  if (!room) throw notFound();
  const clash = store.roomBookings.find((b) => b.status === 'CONFIRMED' && b.roomId === body.roomId && b.date === body.date && b.periodId === body.periodId);
  if (clash) throw badRequest(`${room.name} is already booked for this period on ${body.date} (${clash.purpose}).`);
  const day = dayOf(body.date);
  const regularClash = store.masterTimetable.find((e) => e.roomId === body.roomId && e.periodId === body.periodId && e.day === day);
  if (regularClash) throw badRequest(`${room.name} is used by the regular class timetable during this period.`);
  const booking: RoomBooking = { id: store.id(), roomId: body.roomId, date: body.date, periodId: body.periodId, bookedBy: body.bookedBy, purpose: body.purpose, status: 'CONFIRMED', createdAt: new Date().toISOString() };
  store.roomBookings.push(booking);
  store.addAudit('ROOM_BOOKED', body.bookedBy, `${room.name} booked for ${body.date} — ${body.purpose}.`);
  return booking;
});
on('DELETE', '/room-bookings/:id', ({ params }) => {
  const booking = store.roomBookings.find((b) => b.id === params.id);
  if (!booking) throw notFound();
  booking.status = 'CANCELLED';
  store.addAudit('ROOM_BOOKING_CANCELLED', booking.bookedBy, `Room booking for ${booking.date} cancelled.`);
  return { success: true };
});

// ==================== Swap Requests ====================
on('GET', '/swap-requests', ({ query }) => {
  let list = store.swapRequests;
  if (query.teacherId) list = list.filter((s) => s.requestingTeacherId === query.teacherId || s.targetTeacherId === query.teacherId);
  return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});
on('POST', '/swap-requests', ({ body }) => {
  const { requestingTeacherId, requestingEntryId, targetTeacherId, targetEntryId } = body;
  if (!requestingTeacherId || !requestingEntryId || !targetTeacherId || !targetEntryId) throw badRequest('requestingTeacherId, requestingEntryId, targetTeacherId and targetEntryId are required.');
  const reqEntry = store.masterTimetable.find((e) => e.id === requestingEntryId);
  const targetEntry = store.masterTimetable.find((e) => e.id === targetEntryId);
  if (!reqEntry || !targetEntry) throw notFound();
  if (reqEntry.locked || targetEntry.locked) throw badRequest('One of these periods is locked and cannot be swapped.');
  const swap: SwapRequest = { id: store.id(), requestingTeacherId, requestingEntryId, targetTeacherId, targetEntryId, teacherDecision: 'PENDING', adminDecision: 'PENDING', status: 'PENDING', createdAt: new Date().toISOString() };
  store.swapRequests.push(swap);
  const reqTeacher = store.teachers.find((t) => t.id === requestingTeacherId);
  const targetTeacher = store.teachers.find((t) => t.id === targetTeacherId);
  store.addAudit('SWAP_REQUESTED', reqTeacher?.name ?? 'Unknown', `${reqTeacher?.name} requested a period swap with ${targetTeacher?.name}. Requires both ${targetTeacher?.name} and an administrator to agree.`);
  store.addNotification(`${reqTeacher?.name} would like to swap a period with you.`, 'SWAP');
  store.addNotification(`${reqTeacher?.name} requested a period swap with ${targetTeacher?.name} — needs admin approval.`, 'SWAP', 'VICE_PRINCIPAL');
  return swap;
});
function applySwapOutcome(swap: SwapRequest) {
  if (swap.teacherDecision === 'REJECTED' || swap.adminDecision === 'REJECTED') {
    swap.status = 'REJECTED';
    swap.decidedAt = new Date().toISOString();
    return;
  }
  if (swap.teacherDecision === 'ACCEPTED' && swap.adminDecision === 'ACCEPTED') {
    const reqEntry = store.masterTimetable.find((e) => e.id === swap.requestingEntryId);
    const targetEntry = store.masterTimetable.find((e) => e.id === swap.targetEntryId);
    if (reqEntry && targetEntry) {
      const tmp = reqEntry.teacherId;
      reqEntry.teacherId = targetEntry.teacherId;
      targetEntry.teacherId = tmp;
    }
    swap.status = 'ACCEPTED';
    swap.decidedAt = new Date().toISOString();
  }
}
on('PUT', '/swap-requests/:id/teacher-decision', ({ params, body }) => {
  const swap = store.swapRequests.find((s) => s.id === params.id);
  if (!swap) throw notFound();
  if (swap.status !== 'PENDING') throw badRequest('This request has already been finalized.');
  if (swap.teacherDecision !== 'PENDING') throw badRequest('The teacher has already decided on this request.');
  swap.teacherDecision = body.accept ? 'ACCEPTED' : 'REJECTED';
  applySwapOutcome(swap);
  const reqTeacher = store.teachers.find((t) => t.id === swap.requestingTeacherId);
  const targetTeacher = store.teachers.find((t) => t.id === swap.targetTeacherId);
  store.addAudit('SWAP_TEACHER_DECIDED', targetTeacher?.name ?? 'Unknown', `${targetTeacher?.name} ${body.accept ? 'accepted' : 'rejected'} the swap request from ${reqTeacher?.name}.` + (swap.status === 'PENDING' ? ' Awaiting admin approval.' : ''));
  return swap;
});
on('PUT', '/swap-requests/:id/admin-decision', ({ params, body }) => {
  const swap = store.swapRequests.find((s) => s.id === params.id);
  if (!swap) throw notFound();
  if (swap.status !== 'PENDING') throw badRequest('This request has already been finalized.');
  if (swap.adminDecision !== 'PENDING') throw badRequest('An administrator has already decided on this request.');
  swap.adminDecision = body.accept ? 'ACCEPTED' : 'REJECTED';
  swap.adminDecidedBy = body.decidedBy;
  applySwapOutcome(swap);
  const reqTeacher = store.teachers.find((t) => t.id === swap.requestingTeacherId);
  const targetTeacher = store.teachers.find((t) => t.id === swap.targetTeacherId);
  store.addAudit('SWAP_ADMIN_DECIDED', body.decidedBy, `${body.decidedBy} ${body.accept ? 'approved' : 'rejected'} the swap request between ${reqTeacher?.name} and ${targetTeacher?.name}.` + (swap.status === 'PENDING' ? " Awaiting the teacher's decision." : ''));
  return swap;
});

// ==================== Syllabus ====================
on('GET', '/syllabus', ({ query }) => {
  let list = store.syllabusItems;
  if (query.gradeSubjectConfigId) list = list.filter((s) => s.gradeSubjectConfigId === query.gradeSubjectConfigId);
  return list.sort((a, b) => a.targetWeek - b.targetWeek);
});
on('POST', '/syllabus', ({ body }) => {
  if (!body.gradeSubjectConfigId || !body.title || body.targetWeek === undefined) throw badRequest('gradeSubjectConfigId, title and targetWeek are required.');
  const item: SyllabusItem = { id: store.id(), gradeSubjectConfigId: body.gradeSubjectConfigId, title: body.title, targetWeek: body.targetWeek };
  store.syllabusItems.push(item);
  return item;
});
on('PUT', '/syllabus/:id', ({ params, body }) => {
  const item = store.syllabusItems.find((s) => s.id === params.id);
  if (!item) throw notFound();
  Object.assign(item, body, { id: item.id });
  return item;
});
on('DELETE', '/syllabus/:id', ({ params }) => {
  store.syllabusItems = store.syllabusItems.filter((s) => s.id !== params.id);
  return { success: true };
});
on('GET', '/syllabus/coverage', ({ query }) => {
  const { classId, subjectId } = query;
  if (!classId || !subjectId) throw badRequest('classId and subjectId are required.');
  const cls = store.classes.find((c) => c.id === classId);
  if (!cls) throw notFound();
  const config = store.gradeSubjects.find((g) => g.gradeId === cls.gradeId && g.subjectId === subjectId);
  if (!config) return { total: 0, completed: 0, coveragePercent: 0, behindTarget: false };
  const items = store.syllabusItems.filter((s) => s.gradeSubjectConfigId === config.id);
  const completedIds = new Set(store.lessonPlans.filter((p) => p.classId === classId && p.subjectId === subjectId && p.status === 'COMPLETED' && p.syllabusItemId).map((p) => p.syllabusItemId));
  const completed = items.filter((i) => completedIds.has(i.id)).length;
  const total = items.length;
  const term = store.terms.find((t) => t.id === store.currentTermId);
  let elapsedWeeks = 0;
  if (term) elapsedWeeks = Math.max(0, Math.floor((Date.now() - new Date(term.startDate + 'T00:00:00').getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const earliestIncomplete = items.find((i) => !completedIds.has(i.id));
  const behindTarget = !!earliestIncomplete && earliestIncomplete.targetWeek < elapsedWeeks;
  return { total, completed, coveragePercent: total ? Math.round((completed / total) * 100) : 0, behindTarget };
});

// ==================== Assignments ====================
on('GET', '/assignments', ({ query }) => {
  let list = store.assignments;
  if (query.lessonPlanId) list = list.filter((a) => a.lessonPlanId === query.lessonPlanId);
  if (query.classId) {
    const planIds = new Set(store.lessonPlans.filter((p) => p.classId === query.classId).map((p) => p.id));
    list = list.filter((a) => planIds.has(a.lessonPlanId));
  }
  return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
});
on('POST', '/assignments', ({ body }) => {
  if (!body.lessonPlanId || !body.description || !body.dueDate) throw badRequest('lessonPlanId, description and dueDate are required.');
  const plan = store.lessonPlans.find((p) => p.id === body.lessonPlanId);
  if (!plan) throw notFound();
  const assignment: Assignment = { id: store.id(), lessonPlanId: body.lessonPlanId, description: body.description, dueDate: body.dueDate, status: 'ASSIGNED' };
  store.assignments.push(assignment);
  return assignment;
});
on('PUT', '/assignments/:id/status', ({ params, body }) => {
  const assignment = store.assignments.find((a) => a.id === params.id);
  if (!assignment) throw notFound();
  assignment.status = body.status as AssignmentStatus;
  return assignment;
});
on('DELETE', '/assignments/:id', ({ params }) => {
  store.assignments = store.assignments.filter((a) => a.id !== params.id);
  return { success: true };
});

export { routes };
export type { User };
