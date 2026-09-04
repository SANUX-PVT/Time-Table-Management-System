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
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let LessonPlansController = class LessonPlansController {
    store;
    constructor(store) {
        this.store = store;
    }
    teacherName(id) {
        return id ? this.store.teachers.find((t) => t.id === id)?.name ?? 'Unknown' : 'Unknown';
    }
    className(id) {
        return id ? this.store.classes.find((c) => c.id === id)?.name ?? 'Unknown' : 'Unknown';
    }
    subjectName(id) {
        return id ? this.store.subjects.find((s) => s.id === id)?.name ?? 'Unknown' : 'Unknown';
    }
    withOverdue(p) {
        const today = new Date().toISOString().slice(0, 10);
        const overdue = p.date < today && (p.status === 'PLANNED' || p.status === 'IN_PROGRESS');
        return { ...p, overdue };
    }
    list(teacherId, classId, date, from, to, status) {
        let list = this.store.lessonPlans;
        if (teacherId)
            list = list.filter((p) => p.teacherId === teacherId);
        if (classId)
            list = list.filter((p) => p.classId === classId);
        if (date)
            list = list.filter((p) => p.date === date);
        if (from)
            list = list.filter((p) => p.date >= from);
        if (to)
            list = list.filter((p) => p.date <= to);
        if (status)
            list = list.filter((p) => p.status === status);
        return list
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt))
            .map((p) => this.withOverdue(p));
    }
    summary(from, to) {
        let list = this.store.lessonPlans;
        if (from)
            list = list.filter((p) => p.date >= from);
        if (to)
            list = list.filter((p) => p.date <= to);
        const byTeacher = new Map();
        for (const p of list) {
            const arr = byTeacher.get(p.teacherId) ?? [];
            arr.push(p);
            byTeacher.set(p.teacherId, arr);
        }
        const today = new Date().toISOString().slice(0, 10);
        const rows = [...byTeacher.entries()].map(([teacherId, plans]) => {
            const planned = plans.filter((p) => p.status === 'PLANNED').length;
            const inProgress = plans.filter((p) => p.status === 'IN_PROGRESS').length;
            const completed = plans.filter((p) => p.status === 'COMPLETED').length;
            const delayed = plans.filter((p) => p.status === 'DELAYED').length;
            const overdue = plans.filter((p) => p.date < today && (p.status === 'PLANNED' || p.status === 'IN_PROGRESS')).length;
            return {
                teacherId,
                teacherName: this.teacherName(teacherId),
                total: plans.length,
                planned,
                inProgress,
                completed,
                delayed,
                overdue,
                completionRate: plans.length ? Math.round((completed / plans.length) * 100) : 0,
            };
        });
        return rows.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    }
    get(id) {
        const plan = this.store.lessonPlans.find((p) => p.id === id);
        if (!plan)
            throw new NotFoundException();
        return this.withOverdue(plan);
    }
    create(body) {
        if (!body.teacherId || !body.classId || !body.subjectId || !body.date || !body.topic || !body.objectives) {
            throw new BadRequestException('teacherId, classId, subjectId, date, topic and objectives are required.');
        }
        const teacher = this.store.teachers.find((t) => t.id === body.teacherId);
        if (!teacher)
            throw new NotFoundException('Teacher not found');
        const now = new Date().toISOString();
        const plan = {
            id: this.store.id(),
            teacherId: body.teacherId,
            classId: body.classId,
            subjectId: body.subjectId,
            date: body.date,
            periodIds: body.periodIds ?? [],
            masterEntryIds: body.masterEntryIds ?? [],
            topic: body.topic,
            objectives: body.objectives,
            resources: body.resources,
            homework: body.homework,
            syllabusItemId: body.syllabusItemId,
            status: 'PLANNED',
            createdAt: now,
            updatedAt: now,
            termId: this.store.currentTermId,
        };
        this.store.lessonPlans.push(plan);
        this.store.addAudit('LESSON_PLAN_CREATED', teacher.name, `${teacher.name} created a lesson plan for ${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} on ${plan.date}: "${plan.topic}".`);
        return plan;
    }
    update(id, body) {
        const plan = this.store.lessonPlans.find((p) => p.id === id);
        if (!plan)
            throw new NotFoundException();
        Object.assign(plan, body, { updatedAt: new Date().toISOString() });
        this.store.addAudit('LESSON_PLAN_UPDATED', this.teacherName(plan.teacherId), `Lesson plan for ${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} on ${plan.date} was updated: "${plan.topic}".`);
        return this.withOverdue(plan);
    }
    updateStatus(id, body) {
        const plan = this.store.lessonPlans.find((p) => p.id === id);
        if (!plan)
            throw new NotFoundException();
        const before = plan.status;
        plan.status = body.status;
        if (body.progressNotes !== undefined)
            plan.progressNotes = body.progressNotes;
        plan.updatedAt = new Date().toISOString();
        if (body.status === 'COMPLETED' && !plan.completedAt)
            plan.completedAt = plan.updatedAt;
        if (body.status !== 'COMPLETED')
            plan.completedAt = undefined;
        this.store.addAudit('LESSON_PLAN_STATUS_UPDATED', this.teacherName(plan.teacherId), `${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} lesson plan ("${plan.topic}") moved from ${before.replace('_', ' ')} to ${plan.status.replace('_', ' ')} on ${plan.date}.`);
        return this.withOverdue(plan);
    }
    remove(id) {
        const idx = this.store.lessonPlans.findIndex((p) => p.id === id);
        if (idx === -1)
            throw new NotFoundException();
        const [plan] = this.store.lessonPlans.splice(idx, 1);
        this.store.addAudit('LESSON_PLAN_DELETED', this.teacherName(plan.teacherId), `Lesson plan for ${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} on ${plan.date} ("${plan.topic}") was deleted.`);
        return { ok: true };
    }
};
__decorate([
    Get(),
    __param(0, Query('teacherId')),
    __param(1, Query('classId')),
    __param(2, Query('date')),
    __param(3, Query('from')),
    __param(4, Query('to')),
    __param(5, Query('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "list", null);
__decorate([
    Get('summary'),
    __param(0, Query('from')),
    __param(1, Query('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "summary", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "get", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "update", null);
__decorate([
    Put(':id/status'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "updateStatus", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LessonPlansController.prototype, "remove", null);
LessonPlansController = __decorate([
    Controller('api/lesson-plans'),
    __metadata("design:paramtypes", [StoreService])
], LessonPlansController);
export { LessonPlansController };
//# sourceMappingURL=lesson-plans.controller.js.map