var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
function dayOf(dateStr) {
    const idx = new Date(dateStr + 'T00:00:00').getDay();
    const map = { 0: null, 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: null };
    return map[idx];
}
function datesInRange(start, end) {
    const out = [];
    const cur = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    while (cur <= last) {
        out.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}
let ExamsController = class ExamsController {
    store;
    constructor(store) {
        this.store = store;
    }
    listSessions() {
        return this.store.examSessions;
    }
    createSession(body) {
        if (!body.name || !body.startDate || !body.endDate) {
            throw new BadRequestException('name, startDate and endDate are required.');
        }
        const session = {
            id: this.store.id(),
            name: body.name,
            termId: body.termId ?? this.store.currentTermId,
            startDate: body.startDate,
            endDate: body.endDate,
        };
        this.store.examSessions.push(session);
        this.store.addAudit('EXAM_SESSION_CREATED', 'Admin User', `Exam session "${session.name}" created (${session.startDate} to ${session.endDate}).`);
        return session;
    }
    listEntries(examSessionId, classId) {
        let list = this.store.examTimetable;
        if (examSessionId)
            list = list.filter((e) => e.examSessionId === examSessionId);
        if (classId)
            list = list.filter((e) => e.classId === classId);
        return list.sort((a, b) => a.date.localeCompare(b.date));
    }
    generate(id, body) {
        const session = this.store.examSessions.find((s) => s.id === id);
        if (!session)
            throw new NotFoundException('Exam session not found');
        const { classIds, subjectIds } = body;
        if (!classIds?.length || !subjectIds?.length)
            throw new BadRequestException('classIds and subjectIds are required.');
        this.store.examTimetable = this.store.examTimetable.filter((e) => e.examSessionId !== id);
        const dates = datesInRange(session.startDate, session.endDate).filter((d) => dayOf(d));
        const busyClass = new Set();
        const busyRoom = new Set();
        const busyInvigilator = new Set();
        const created = [];
        const unresolved = [];
        for (const classId of classIds) {
            for (const subjectId of subjectIds) {
                let placed = false;
                for (const date of dates) {
                    const day = dayOf(date);
                    const slots = this.store.slotsForDay(day);
                    for (const slot of slots) {
                        const classKey = `${classId}|${date}|${slot.id}`;
                        if (busyClass.has(classKey))
                            continue;
                        const room = this.store.rooms.find((r) => !busyRoom.has(`${r.id}|${date}|${slot.id}`));
                        const invigilator = this.store.teachers.find((t) => t.active && !busyInvigilator.has(`${t.id}|${date}|${slot.id}`) &&
                            !t.unavailable.some((u) => u.day === day && u.periodId === slot.id));
                        if (!room || !invigilator)
                            continue;
                        const entry = {
                            id: this.store.id(),
                            examSessionId: id,
                            date,
                            periodId: slot.id,
                            classId,
                            subjectId,
                            roomId: room.id,
                            invigilatorTeacherId: invigilator.id,
                        };
                        this.store.examTimetable.push(entry);
                        created.push(entry);
                        busyClass.add(classKey);
                        busyRoom.add(`${room.id}|${date}|${slot.id}`);
                        busyInvigilator.add(`${invigilator.id}|${date}|${slot.id}`);
                        placed = true;
                        break;
                    }
                    if (placed)
                        break;
                }
                if (!placed) {
                    const cls = this.store.classes.find((c) => c.id === classId);
                    const subject = this.store.subjects.find((s) => s.id === subjectId);
                    unresolved.push(`${cls?.name} · ${subject?.name}`);
                }
            }
        }
        this.store.addAudit('EXAM_TIMETABLE_GENERATED', 'Admin User', `Generated exam timetable for "${session.name}" — ${created.length} exam(s) scheduled${unresolved.length ? `, ${unresolved.length} unresolved` : ''}.`);
        return { created: created.length, unresolved };
    }
    updateEntry(id, body) {
        const entry = this.store.examTimetable.find((e) => e.id === id);
        if (!entry)
            throw new NotFoundException();
        Object.assign(entry, body, { id: entry.id });
        return entry;
    }
    removeEntry(id) {
        this.store.examTimetable = this.store.examTimetable.filter((e) => e.id !== id);
        return { success: true };
    }
};
__decorate([
    Get('sessions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "listSessions", null);
__decorate([
    Post('sessions'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "createSession", null);
__decorate([
    Get('entries'),
    __param(0, Query('examSessionId')),
    __param(1, Query('classId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "listEntries", null);
__decorate([
    Post('sessions/:id/generate'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "generate", null);
__decorate([
    Put('entries/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "updateEntry", null);
__decorate([
    Delete('entries/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "removeEntry", null);
ExamsController = __decorate([
    Controller('api/exams'),
    __metadata("design:paramtypes", [StoreService])
], ExamsController);
export { ExamsController };
//# sourceMappingURL=exams.controller.js.map