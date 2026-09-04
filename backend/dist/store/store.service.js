var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WORKING_DAYS, } from '../common/types.js';
let StoreService = class StoreService {
    schoolConfig;
    rolePermissions = {
        ADMIN: [
            'VIEW_SCHOOL_CONFIG', 'VIEW_ACADEMIC_STRUCTURE', 'VIEW_REPORTS', 'VIEW_AUDIT_LOG',
            'VIEW_RELIEF_DASHBOARD', 'MANAGE_USERS', 'EDIT_MASTER_TIMETABLE', 'GENERATE_TIMETABLE', 'MANAGE_DAILY_OPERATIONS', 'DECIDE_ABSENCES', 'MONITOR_LESSON_PLANS',
            'MANAGE_TERMS', 'PUBLISH_MASTER_TIMETABLE', 'MANAGE_EXAMS', 'MANAGE_ROOM_BOOKINGS',
        ],
        PRINCIPAL: [
            'VIEW_SCHOOL_CONFIG', 'VIEW_ACADEMIC_STRUCTURE', 'VIEW_REPORTS', 'VIEW_AUDIT_LOG',
            'VIEW_RELIEF_DASHBOARD', 'EDIT_MASTER_TIMETABLE', 'GENERATE_TIMETABLE', 'MANAGE_DAILY_OPERATIONS', 'DECIDE_ABSENCES', 'MONITOR_LESSON_PLANS',
            'MANAGE_TERMS', 'PUBLISH_MASTER_TIMETABLE', 'MANAGE_EXAMS', 'MANAGE_ROOM_BOOKINGS',
        ],
        VICE_PRINCIPAL: [
            'VIEW_REPORTS', 'VIEW_AUDIT_LOG', 'VIEW_RELIEF_DASHBOARD', 'MANAGE_DAILY_OPERATIONS', 'DECIDE_ABSENCES', 'MONITOR_LESSON_PLANS',
            'EDIT_MASTER_TIMETABLE', 'MANAGE_EXAMS', 'MANAGE_ROOM_BOOKINGS',
        ],
        SECTIONAL_HEAD: ['VIEW_REPORTS', 'VIEW_RELIEF_DASHBOARD', 'MANAGE_DAILY_OPERATIONS', 'DECIDE_ABSENCES', 'MONITOR_LESSON_PLANS', 'MANAGE_ROOM_BOOKINGS'],
        GRADE_HEAD: ['VIEW_REPORTS', 'VIEW_RELIEF_DASHBOARD', 'MANAGE_DAILY_OPERATIONS', 'MONITOR_LESSON_PLANS'],
        CLASS_TEACHER: [],
        TEACHER: [],
        PARENT: [],
    };
    timeSlots = [];
    grades = [];
    classes = [];
    subjects = [];
    gradeSubjects = [];
    rooms = [];
    teachers = [];
    users = [];
    masterTimetable = [];
    timetableVersions = [];
    dailyTimetable = [];
    absences = [];
    reliefAssignments = [];
    auditLog = [];
    notifications = [];
    lessonPlans = [];
    terms = [];
    currentTermId = '';
    studentGroups = [];
    holidays = [];
    examSessions = [];
    examTimetable = [];
    roomBookings = [];
    swapRequests = [];
    teacherPreferences = [];
    syllabusItems = [];
    assignments = [];
    pendingTimetableChanges = [];
    onModuleInit() {
        this.seed();
    }
    id() {
        return randomUUID();
    }
    addAudit(action, actor, details) {
        this.auditLog.unshift({
            id: this.id(),
            timestamp: new Date().toISOString(),
            action,
            actor,
            details,
            termId: this.currentTermId,
        });
    }
    addNotification(message, category, toRole, toUserId) {
        this.notifications.unshift({
            id: this.id(),
            message,
            category,
            toRole,
            toUserId,
            createdAt: new Date().toISOString(),
            read: false,
        });
    }
    slotsForDay(day) {
        return this.timeSlots.filter((s) => s.day === day).sort((a, b) => a.order - b.order);
    }
    seed() {
        const slotTemplateType = new Map();
        this.schoolConfig = {
            name: 'Lakeside National College',
            academicYear: '2026',
            startTime: '07:30',
            endTime: '12:30',
            workingDays: WORKING_DAYS,
            requireAbsenceApproval: true,
        };
        const term1 = { id: this.id(), academicYear: '2026', name: 'Term 1', startDate: '2026-01-12', endDate: '2026-04-03', active: false };
        const term2 = { id: this.id(), academicYear: '2026', name: 'Term 2', startDate: '2026-05-04', endDate: '2026-08-14', active: false };
        const term3 = { id: this.id(), academicYear: '2026', name: 'Term 3', startDate: '2026-09-01', endDate: '2026-12-11', active: true };
        this.terms.push(term1, term2, term3);
        this.currentTermId = term3.id;
        const mkSlot = (day, order, start, end, templateType, label) => {
            const slot = { id: this.id(), day, order, start, end, label };
            slotTemplateType.set(slot.id, templateType);
            return slot;
        };
        for (const day of WORKING_DAYS) {
            let order = 0;
            if (day === 'MON') {
                this.timeSlots.push(mkSlot(day, order++, '07:30', '07:45', 'ASSEMBLY', 'Assembly'));
            }
            this.timeSlots.push(mkSlot(day, order++, '07:45', '08:25', 'LESSON', 'Period 1'));
            this.timeSlots.push(mkSlot(day, order++, '08:25', '09:05', 'LESSON', 'Period 2'));
            this.timeSlots.push(mkSlot(day, order++, '09:05', '09:20', 'BREAK', 'Interval'));
            this.timeSlots.push(mkSlot(day, order++, '09:20', '10:00', 'LESSON', 'Period 3'));
            this.timeSlots.push(mkSlot(day, order++, '10:00', '10:40', 'LESSON', 'Period 4'));
            this.timeSlots.push(mkSlot(day, order++, '10:40', '11:10', 'LUNCH', 'Lunch'));
            this.timeSlots.push(mkSlot(day, order++, '11:10', '11:50', 'LESSON', 'Period 5'));
            if (day !== 'FRI') {
                this.timeSlots.push(mkSlot(day, order++, '11:50', '12:30', 'LESSON', 'Period 6'));
            }
        }
        const g9 = { id: this.id(), name: 'Grade 9', order: 1, active: true };
        const g10 = {
            id: this.id(),
            name: 'Grade 10',
            order: 2,
            active: true,
        };
        const g11 = {
            id: this.id(),
            name: 'Grade 11',
            order: 3,
            active: true,
        };
        this.grades.push(g9, g10, g11);
        const mkClass = (name, gradeId, count) => ({
            id: this.id(),
            name,
            gradeId,
            studentCount: count,
        });
        const c9a = mkClass('9-A', g9.id, 32);
        const c9b = mkClass('9-B', g9.id, 30);
        const c10a = mkClass('10-A', g10.id, 33);
        const c10b = mkClass('10-B', g10.id, 31);
        const c11a = mkClass('11-A', g11.id, 29);
        const c11b = mkClass('11-B', g11.id, 28);
        this.classes.push(c9a, c9b, c10a, c10b, c11a, c11b);
        const room = (name, type, capacity) => ({
            id: this.id(),
            name,
            type,
            capacity,
        });
        const r101 = room('Room 101', 'CLASSROOM', 35);
        const r102 = room('Room 102', 'CLASSROOM', 35);
        const r103 = room('Room 103', 'CLASSROOM', 35);
        const r104 = room('Room 104', 'CLASSROOM', 35);
        const r105 = room('Room 105', 'CLASSROOM', 35);
        const r106 = room('Room 106', 'CLASSROOM', 35);
        const labICT = room('ICT Lab', 'LAB', 30);
        const labSci = room('Science Lab', 'LAB', 30);
        const hall = room('Main Hall', 'HALL', 200);
        this.rooms.push(r101, r102, r103, r104, r105, r106, labICT, labSci, hall);
        c9a.roomId = r101.id;
        c9b.roomId = r102.id;
        c10a.roomId = r103.id;
        c10b.roomId = r104.id;
        c11a.roomId = r105.id;
        c11b.roomId = r106.id;
        const subj = (name, code, requiresSpecialRoom = false, allowConsecutive = false) => ({
            id: this.id(),
            name,
            code,
            requiresSpecialRoom,
            allowConsecutive,
        });
        const MATH = subj('Mathematics', 'MATH');
        const SCI = subj('Science', 'SCI', true, true);
        const ENG = subj('English', 'ENG');
        const HIST = subj('History', 'HIST');
        const ICT = subj('ICT', 'ICT', true);
        const SIN = subj('Sinhala', 'SIN');
        const PE = subj('Physical Education', 'PE', true, true);
        const ART = subj('Art', 'ART');
        this.subjects.push(MATH, SCI, ENG, HIST, ICT, SIN, PE, ART);
        const gsc = (gradeId, subjectId, perWeek, maxPerDay) => ({
            id: this.id(),
            gradeId,
            subjectId,
            periodsPerWeek: perWeek,
            maxPeriodsPerDay: maxPerDay,
        });
        for (const g of [g9, g10, g11]) {
            this.gradeSubjects.push(gsc(g.id, MATH.id, 5, 2), gsc(g.id, SCI.id, 4, 2), gsc(g.id, ENG.id, 5, 2), gsc(g.id, HIST.id, 3, 1), gsc(g.id, ICT.id, 2, 1), gsc(g.id, SIN.id, 4, 2), gsc(g.id, PE.id, 3, 2), gsc(g.id, ART.id, 3, 1));
        }
        const mkTeacher = (name, email, employeeNo, subjectIds, gradeIds, classIds) => ({
            id: this.id(),
            name,
            email,
            phone: '077' + Math.floor(1000000 + Math.random() * 8999999),
            employeeNo,
            subjectIds,
            gradeIds,
            classIds,
            maxPeriodsPerDay: 6,
            maxPeriodsPerWeek: 26,
            maxConsecutivePeriods: 3,
            unavailable: [],
            active: true,
        });
        const T1 = mkTeacher('Priya Perera', 'priya.perera@lnc.edu', 'EMP001', [MATH.id], [g9.id, g10.id], [c9a.id, c9b.id, c10a.id]);
        const T2 = mkTeacher('Nuwan Silva', 'nuwan.silva@lnc.edu', 'EMP002', [MATH.id], [g10.id, g11.id], [c10b.id, c11a.id, c11b.id]);
        const T3 = mkTeacher('Kamal Fernando', 'kamal.fernando@lnc.edu', 'EMP003', [SCI.id], [g9.id, g10.id], [c9a.id, c9b.id, c10a.id]);
        const T4 = mkTeacher('Anjali Rathnayake', 'anjali.r@lnc.edu', 'EMP004', [SCI.id], [g10.id, g11.id], [c10b.id, c11a.id, c11b.id]);
        const T5 = mkTeacher('Sanduni Jayasuriya', 'sanduni.j@lnc.edu', 'EMP005', [ENG.id], [g9.id, g10.id, g11.id], [c9a.id, c10a.id, c11a.id]);
        const T6 = mkTeacher('Ruwan Bandara', 'ruwan.bandara@lnc.edu', 'EMP006', [ENG.id], [g9.id, g10.id, g11.id], [c9b.id, c10b.id, c11b.id]);
        const T7 = mkTeacher('Dilani Wickrama', 'dilani.w@lnc.edu', 'EMP007', [HIST.id], [g9.id, g10.id, g11.id], [c9a.id, c9b.id, c10a.id, c10b.id, c11a.id, c11b.id]);
        const T8 = mkTeacher('Chamara Gunasekara', 'chamara.g@lnc.edu', 'EMP008', [ICT.id], [g9.id, g10.id, g11.id], [c9a.id, c9b.id, c10a.id, c10b.id, c11a.id, c11b.id]);
        const T9 = mkTeacher('Ishara Madushani', 'ishara.m@lnc.edu', 'EMP009', [SIN.id], [g9.id, g10.id], [c9a.id, c9b.id, c10a.id]);
        const T10 = mkTeacher('Tharindu Karunaratne', 'tharindu.k@lnc.edu', 'EMP010', [SIN.id], [g10.id, g11.id], [c10b.id, c11a.id, c11b.id]);
        const T11 = mkTeacher('Malithi Peris', 'malithi.p@lnc.edu', 'EMP011', [PE.id], [g9.id, g10.id, g11.id], [c9a.id, c9b.id, c10a.id, c10b.id, c11a.id, c11b.id]);
        const T12 = mkTeacher('Ashan De Silva', 'ashan.d@lnc.edu', 'EMP012', [ART.id], [g9.id, g10.id, g11.id], [c9a.id, c9b.id, c10a.id, c10b.id, c11a.id, c11b.id]);
        const T13 = mkTeacher('Nadeeka Abeywardena', 'nadeeka.a@lnc.edu', 'EMP013', [MATH.id, ICT.id], [g9.id, g10.id, g11.id], []);
        const T14 = mkTeacher('Roshan Jayawardena', 'roshan.j@lnc.edu', 'EMP014', [SCI.id, ENG.id], [g9.id, g10.id, g11.id], []);
        this.teachers.push(T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14);
        c9a.classTeacherId = T1.id;
        c9b.classTeacherId = T3.id;
        c10a.classTeacherId = T5.id;
        c10b.classTeacherId = T6.id;
        c11a.classTeacherId = T2.id;
        c11b.classTeacherId = T4.id;
        const monP1 = this.timeSlots.find((s) => s.day === 'MON' && s.label === 'Period 1');
        if (monP1)
            T13.unavailable = [{ day: 'MON', periodId: monP1.id }];
        g10.headTeacherId = T5.id;
        this.users.push({ id: this.id(), name: 'Admin User', email: 'admin@lnc.edu', role: 'ADMIN' }, { id: this.id(), name: 'Mrs. Fernando (Principal)', email: 'principal@lnc.edu', role: 'PRINCIPAL' }, { id: this.id(), name: 'Mr. Jayawardena (VP)', email: 'vp@lnc.edu', role: 'VICE_PRINCIPAL' }, { id: this.id(), name: 'Ms. Wickramasinghe (Sectional Head)', email: 'sectional@lnc.edu', role: 'SECTIONAL_HEAD', gradeIds: [g9.id, g10.id, g11.id] }, { id: this.id(), name: 'Sanduni Jayasuriya (Grade Head - 10)', email: 'sanduni.j@lnc.edu', role: 'GRADE_HEAD', gradeIds: [g10.id], teacherId: T5.id }, { id: this.id(), name: 'Priya Perera (Class Teacher 9-A)', email: 'priya.perera@lnc.edu', role: 'CLASS_TEACHER', teacherId: T1.id }, { id: this.id(), name: 'Kamal Fernando (Teacher)', email: 'kamal.fernando@lnc.edu', role: 'TEACHER', teacherId: T3.id }, { id: this.id(), name: 'Dilani Wickrama (Teacher)', email: 'dilani.w@lnc.edu', role: 'TEACHER', teacherId: T7.id }, { id: this.id(), name: 'Mr. Silva (Parent of 9-A)', email: 'silva.parent@example.com', role: 'PARENT', classId: c9a.id });
        this.generateMasterTimetable(slotTemplateType);
        this.timetableVersions.push({
            id: this.id(),
            version: 1,
            status: 'PUBLISHED',
            createdAt: new Date().toISOString(),
            createdBy: 'Admin User',
            publishedAt: new Date().toISOString(),
            notes: 'Initial published master timetable for demo academic year 2026.',
        });
        this.addAudit('MASTER_TIMETABLE_PUBLISHED', 'Admin User', 'Master timetable v1 published for academic year 2026.');
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        const dayIdx = today.getDay();
        const dayMap = {
            0: null,
            1: 'MON',
            2: 'TUE',
            3: 'WED',
            4: 'THU',
            5: 'FRI',
            6: null,
        };
        const todayDay = dayMap[dayIdx] ?? 'THU';
        this.materializeDailyTimetable(dateStr, todayDay);
        const histEntries = this.dailyTimetable.filter((e) => e.date === dateStr && e.originalTeacherId === T7.id);
        if (histEntries.length) {
            const absence1 = {
                id: this.id(),
                teacherId: T7.id,
                date: dateStr,
                wholeDay: true,
                periodIds: histEntries.map((e) => e.periodId),
                reason: 'Sick Leave',
                remarks: 'Fever, advised rest by doctor.',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
            };
            this.absences.push(absence1);
            for (const entry of histEntries) {
                entry.status = 'TEACHER_ABSENT';
                entry.absenceId = absence1.id;
            }
            this.addAudit('ABSENCE_SUBMITTED', T7.name, `${T7.name} marked absent for the whole day on ${dateStr} (Sick Leave). ${histEntries.length} lessons affected.`);
            this.addNotification(`${T7.name} is absent today (Sick Leave). ${histEntries.length} lessons need relief.`, 'ABSENCE', 'VICE_PRINCIPAL');
        }
        const kamalEntries = this.dailyTimetable
            .filter((e) => e.date === dateStr && e.originalTeacherId === T3.id)
            .slice(0, 1);
        if (kamalEntries.length) {
            const absence2 = {
                id: this.id(),
                teacherId: T3.id,
                date: dateStr,
                wholeDay: false,
                periodIds: kamalEntries.map((e) => e.periodId),
                reason: 'Personal Leave',
                remarks: 'Family event.',
                status: 'APPROVED',
                createdAt: new Date().toISOString(),
            };
            this.absences.push(absence2);
            for (const entry of kamalEntries) {
                entry.status = 'TEACHER_ABSENT';
                entry.absenceId = absence2.id;
            }
            const entry = kamalEntries[0];
            entry.teacherId = T14.id;
            entry.isRelief = true;
            entry.status = 'RELIEF_ASSIGNED';
            this.reliefAssignments.push({
                id: this.id(),
                absenceId: absence2.id,
                dailyEntryId: entry.id,
                reliefTeacherId: T14.id,
                assignedBy: 'Admin User',
                assignedAt: new Date().toISOString(),
                score: 90,
            });
            this.addAudit('RELIEF_ASSIGNED', 'Admin User', `Assigned ${T14.name} as relief for ${T3.name}'s class on ${dateStr}.`);
        }
        const addDays = (base, delta) => {
            const d = new Date(base);
            d.setDate(d.getDate() + delta);
            return d.toISOString().slice(0, 10);
        };
        const nowIso = new Date().toISOString();
        const priyaToday = this.masterTimetable.find((e) => e.day === todayDay && e.teacherId === T1.id && e.type === 'LESSON');
        if (priyaToday) {
            const priyaToday2 = this.masterTimetable.find((e) => e.day === todayDay && e.teacherId === T1.id && e.type === 'LESSON' && e.classId === priyaToday.classId
                && e.subjectId === priyaToday.subjectId && e.id !== priyaToday.id);
            const priyaEntries = [priyaToday, ...(priyaToday2 ? [priyaToday2] : [])];
            this.lessonPlans.push({
                id: this.id(), teacherId: T1.id, classId: priyaToday.classId, subjectId: priyaToday.subjectId,
                date: dateStr, periodIds: priyaEntries.map((e) => e.periodId), masterEntryIds: priyaEntries.map((e) => e.id),
                topic: 'Fractions — addition and subtraction of unlike fractions',
                objectives: 'Students can find a common denominator and add/subtract unlike fractions confidently.',
                resources: 'Textbook Ch. 4, fraction strips, whiteboard',
                homework: 'Exercise 4C, questions 1-10',
                status: 'PLANNED', createdAt: nowIso, updatedAt: nowIso,
            });
        }
        const kamalToday = this.masterTimetable.find((e) => e.day === todayDay && e.teacherId === T3.id && e.type === 'LESSON');
        if (kamalToday) {
            this.lessonPlans.push({
                id: this.id(), teacherId: T3.id, classId: kamalToday.classId, subjectId: kamalToday.subjectId,
                date: dateStr, periodIds: [kamalToday.periodId], masterEntryIds: [kamalToday.id],
                topic: 'States of matter — practical observation',
                objectives: 'Students can describe and explain the physical changes between solid, liquid and gas.',
                resources: 'Ice cubes, beakers, Bunsen burner, lab worksheet',
                status: 'IN_PROGRESS',
                progressNotes: 'Practical demonstration underway; write-up to be finished next period.',
                createdAt: nowIso, updatedAt: nowIso,
            });
        }
        const otherDays = WORKING_DAYS.filter((d) => d !== todayDay);
        const completedSrc = this.masterTimetable.find((e) => e.teacherId === T1.id && e.type === 'LESSON' && otherDays.includes(e.day));
        if (completedSrc) {
            this.lessonPlans.push({
                id: this.id(), teacherId: T1.id, classId: completedSrc.classId, subjectId: completedSrc.subjectId,
                date: addDays(today, -3), periodIds: [completedSrc.periodId], masterEntryIds: [completedSrc.id],
                topic: 'Whole numbers — place value up to millions',
                objectives: 'Students can read, write, and compare large whole numbers.',
                resources: 'Place value chart, textbook Ch. 1',
                homework: 'Exercise 1B',
                status: 'COMPLETED',
                progressNotes: 'Covered fully; class did well on the quick check.',
                completedAt: addDays(today, -3) + 'T09:40:00.000Z',
                createdAt: addDays(today, -5) + 'T10:00:00.000Z',
                updatedAt: addDays(today, -3) + 'T09:40:00.000Z',
            });
        }
        const overdueSrc = this.masterTimetable.find((e) => e.teacherId === T3.id && e.type === 'LESSON' && otherDays.includes(e.day) && e.id !== kamalToday?.id);
        if (overdueSrc) {
            this.lessonPlans.push({
                id: this.id(), teacherId: T3.id, classId: overdueSrc.classId, subjectId: overdueSrc.subjectId,
                date: addDays(today, -1), periodIds: [overdueSrc.periodId], masterEntryIds: [overdueSrc.id],
                topic: 'Acids and bases — indicators',
                objectives: 'Students can classify common substances as acidic, basic, or neutral using litmus paper.',
                resources: 'Litmus paper, sample substances',
                status: 'PLANNED',
                createdAt: addDays(today, -4) + 'T10:00:00.000Z',
                updatedAt: addDays(today, -4) + 'T10:00:00.000Z',
            });
        }
    }
    generateMasterTimetable(slotTemplateType) {
        for (const [slotId, templateType] of slotTemplateType) {
            if (templateType === 'LESSON')
                continue;
            const slot = this.timeSlots.find((s) => s.id === slotId);
            for (const cls of this.classes) {
                this.masterTimetable.push({
                    id: this.id(),
                    day: slot.day,
                    periodId: slot.id,
                    classId: cls.id,
                    type: templateType,
                    locked: false,
                });
            }
        }
        this.generateLessons(this.classes.map((c) => c.id), 'FILL_GAPS');
    }
    generateLessons(targetClassIds, mode) {
        const targetSet = new Set(targetClassIds);
        let cleared = 0;
        if (mode === 'REGENERATE') {
            const before = this.masterTimetable.length;
            this.masterTimetable = this.masterTimetable.filter((e) => !(targetSet.has(e.classId) && e.type === 'LESSON' && !e.locked));
            cleared = before - this.masterTimetable.length;
        }
        const targetClasses = this.classes.filter((c) => targetSet.has(c.id));
        const baseline = [...this.masterTimetable];
        const MAX_ATTEMPTS = 30;
        let best = null;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            this.masterTimetable = [...baseline];
            const result = this.fillLessonsOnce(targetClasses);
            if (!best || result.unresolved.length < best.unresolved.length) {
                best = { timetable: [...this.masterTimetable], created: result.created, unresolved: result.unresolved };
            }
            if (result.unresolved.length === 0)
                break;
        }
        this.masterTimetable = best.timetable;
        return { created: best.created, cleared, unresolved: best.unresolved };
    }
    fillLessonsOnce(targetClasses) {
        const subjectById = new Map(this.subjects.map((s) => [s.id, s]));
        const gradeSubjectConf = (gradeId, subjectId) => this.gradeSubjects.find((g) => g.gradeId === gradeId && g.subjectId === subjectId);
        const qualifiedTeachers = (subjectId, classId, gradeId) => this.teachers.filter((t) => t.active &&
            t.subjectIds.includes(subjectId) &&
            (t.classIds.length === 0 ? t.gradeIds.includes(gradeId) : t.classIds.includes(classId)));
        const remaining = new Map();
        for (const cls of targetClasses) {
            const map = new Map();
            for (const gs of this.gradeSubjects.filter((g) => g.gradeId === cls.gradeId)) {
                const existing = this.masterTimetable.filter((e) => e.classId === cls.id && e.subjectId === gs.subjectId).length;
                map.set(gs.subjectId, Math.max(0, gs.periodsPerWeek - existing));
            }
            remaining.set(cls.id, map);
        }
        const teacherBusy = new Set();
        const roomBusy = new Set();
        const occupied = new Set();
        const perDayCount = new Map();
        for (const e of this.masterTimetable) {
            if (e.teacherId)
                teacherBusy.add(`${e.teacherId}|${e.periodId}`);
            if (e.roomId)
                roomBusy.add(`${e.roomId}|${e.periodId}`);
            occupied.add(`${e.classId}|${e.periodId}`);
            if (e.subjectId) {
                const key = `${e.classId}|${e.day}`;
                if (!perDayCount.has(key))
                    perDayCount.set(key, new Map());
                const m = perDayCount.get(key);
                m.set(e.subjectId, (m.get(e.subjectId) ?? 0) + 1);
            }
        }
        let created = 0;
        const runSeed = Math.floor(Math.random() * 100000);
        const shuffledDays = [...WORKING_DAYS].sort(() => Math.random() - 0.5);
        for (const day of shuffledDays) {
            const slots = this.timeSlots.filter((s) => s.day === day).sort((a, b) => a.order - b.order);
            for (const slot of slots) {
                const rotate = targetClasses.length
                    ? (slot.order + WORKING_DAYS.indexOf(day) + runSeed) % targetClasses.length
                    : 0;
                const ordered = [...targetClasses.slice(rotate), ...targetClasses.slice(0, rotate)];
                for (const cls of ordered) {
                    const occKey = `${cls.id}|${slot.id}`;
                    if (occupied.has(occKey))
                        continue;
                    const remMap = remaining.get(cls.id);
                    const dayKey = `${cls.id}|${day}`;
                    if (!perDayCount.has(dayKey))
                        perDayCount.set(dayKey, new Map());
                    const dayMap = perDayCount.get(dayKey);
                    const candidates = [...remMap.entries()]
                        .filter(([, c]) => c > 0)
                        .sort((a, b) => b[1] - a[1] || Math.random() - 0.5);
                    for (const [subjectId] of candidates) {
                        const conf = gradeSubjectConf(cls.gradeId, subjectId);
                        const usedToday = dayMap.get(subjectId) ?? 0;
                        if (conf && usedToday >= conf.maxPeriodsPerDay)
                            continue;
                        const subject = subjectById.get(subjectId);
                        const prefScore = (teacherId) => {
                            const pref = this.teacherPreferences.find((p) => p.teacherId === teacherId && p.day === day && p.periodId === slot.id);
                            return pref?.preference === 'PREFERRED' ? 1 : pref?.preference === 'AVOID' ? -1 : 0;
                        };
                        const freeTeacher = [...qualifiedTeachers(subjectId, cls.id, cls.gradeId)]
                            .filter((t) => !teacherBusy.has(`${t.id}|${slot.id}`) &&
                            !t.unavailable.some((u) => u.day === day && u.periodId === slot.id))
                            .sort((a, b) => prefScore(b.id) - prefScore(a.id) || Math.random() - 0.5)[0];
                        if (!freeTeacher)
                            continue;
                        let roomId = cls.roomId;
                        if (subject.requiresSpecialRoom) {
                            const specialRoom = this.rooms.find((r) => (subject.code === 'ICT' && r.name === 'ICT Lab') ||
                                (subject.code === 'SCI' && r.name === 'Science Lab') ||
                                (subject.code === 'PE' && r.name === 'Main Hall'));
                            if (specialRoom && !roomBusy.has(`${specialRoom.id}|${slot.id}`)) {
                                roomId = specialRoom.id;
                            }
                            else if (specialRoom) {
                                continue;
                            }
                        }
                        else if (roomId && roomBusy.has(`${roomId}|${slot.id}`)) {
                            continue;
                        }
                        this.masterTimetable.push({
                            id: this.id(),
                            day,
                            periodId: slot.id,
                            classId: cls.id,
                            type: 'LESSON',
                            subjectId,
                            teacherId: freeTeacher.id,
                            roomId,
                            locked: false,
                        });
                        occupied.add(occKey);
                        teacherBusy.add(`${freeTeacher.id}|${slot.id}`);
                        if (roomId)
                            roomBusy.add(`${roomId}|${slot.id}`);
                        remMap.set(subjectId, (remMap.get(subjectId) ?? 0) - 1);
                        dayMap.set(subjectId, usedToday + 1);
                        created += 1;
                        break;
                    }
                }
            }
        }
        const unresolved = [];
        for (const cls of targetClasses) {
            for (const [subjectId, count] of remaining.get(cls.id)) {
                if (count > 0) {
                    unresolved.push(`${cls.name}: ${subjectById.get(subjectId)?.name ?? subjectId} still needs ${count} more period(s)/week`);
                }
            }
        }
        return { created, unresolved };
    }
    isHoliday(date) {
        return this.holidays.find((h) => h.date === date && !h.halfDay);
    }
    materializeDailyTimetable(date, day) {
        const existing = this.dailyTimetable.some((e) => e.date === date);
        if (existing)
            return;
        if (this.isHoliday(date))
            return;
        const entries = this.masterTimetable.filter((m) => m.day === day);
        for (const m of entries) {
            this.dailyTimetable.push({
                id: this.id(),
                date,
                day,
                periodId: m.periodId,
                classId: m.classId,
                type: m.type,
                subjectId: m.subjectId,
                teacherId: m.teacherId,
                originalTeacherId: m.teacherId,
                roomId: m.roomId,
                status: 'SCHEDULED',
                isRelief: false,
                masterEntryId: m.id,
            });
        }
    }
};
StoreService = __decorate([
    Injectable()
], StoreService);
export { StoreService };
//# sourceMappingURL=store.service.js.map