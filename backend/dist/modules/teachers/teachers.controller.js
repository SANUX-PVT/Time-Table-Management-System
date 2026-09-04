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
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let TeachersController = class TeachersController {
    store;
    constructor(store) {
        this.store = store;
    }
    list() {
        return this.store.teachers;
    }
    get(id) {
        const teacher = this.store.teachers.find((t) => t.id === id);
        if (!teacher)
            throw new NotFoundException();
        return teacher;
    }
    masterTimetable(id) {
        return this.store.masterTimetable.filter((e) => e.teacherId === id);
    }
    workload(id) {
        const entries = this.store.masterTimetable.filter((e) => e.teacherId === id);
        const teacher = this.store.teachers.find((t) => t.id === id);
        const byDay = {};
        for (const e of entries)
            byDay[e.day] = (byDay[e.day] ?? 0) + 1;
        return {
            teacherId: id,
            totalPeriodsPerWeek: entries.length,
            maxPeriodsPerWeek: teacher?.maxPeriodsPerWeek ?? 0,
            periodsPerDay: byDay,
            maxPeriodsPerDay: teacher?.maxPeriodsPerDay ?? 0,
            overWeeklyLimit: teacher ? entries.length > teacher.maxPeriodsPerWeek : false,
        };
    }
    getPreferences(id) {
        return this.store.teacherPreferences.filter((p) => p.teacherId === id);
    }
    setPreferences(id, body) {
        this.store.teacherPreferences = this.store.teacherPreferences.filter((p) => p.teacherId !== id);
        const created = (body.preferences ?? []).map((p) => ({ id: this.store.id(), teacherId: id, ...p }));
        this.store.teacherPreferences.push(...created);
        return created;
    }
    create(body) {
        const teacher = {
            id: this.store.id(),
            name: body.name ?? 'New Teacher',
            email: body.email ?? '',
            phone: body.phone ?? '',
            employeeNo: body.employeeNo ?? '',
            subjectIds: body.subjectIds ?? [],
            gradeIds: body.gradeIds ?? [],
            classIds: body.classIds ?? [],
            maxPeriodsPerDay: body.maxPeriodsPerDay ?? 6,
            maxPeriodsPerWeek: body.maxPeriodsPerWeek ?? 26,
            maxConsecutivePeriods: body.maxConsecutivePeriods ?? 3,
            unavailable: body.unavailable ?? [],
            active: body.active ?? true,
        };
        this.store.teachers.push(teacher);
        this.store.addAudit('TEACHER_CREATED', 'Admin User', `Teacher "${teacher.name}" created.`);
        return teacher;
    }
    update(id, body) {
        const teacher = this.store.teachers.find((t) => t.id === id);
        if (!teacher)
            throw new NotFoundException();
        Object.assign(teacher, body);
        this.store.addAudit('TEACHER_UPDATED', 'Admin User', `Teacher "${teacher.name}" updated.`);
        return teacher;
    }
    remove(id) {
        const teacher = this.store.teachers.find((t) => t.id === id);
        if (!teacher)
            throw new NotFoundException();
        const inUse = this.store.masterTimetable.some((m) => m.teacherId === id);
        if (inUse) {
            throw new BadRequestException('Cannot delete: this teacher still has lessons in the master timetable. Reassign or remove them first.');
        }
        this.store.teachers = this.store.teachers.filter((t) => t.id !== id);
        this.store.addAudit('TEACHER_DELETED', 'Admin User', `Teacher "${teacher.name}" removed.`);
        return { success: true };
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "list", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "get", null);
__decorate([
    Get(':id/master-timetable'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "masterTimetable", null);
__decorate([
    Get(':id/workload'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "workload", null);
__decorate([
    Get(':id/preferences'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "getPreferences", null);
__decorate([
    Put(':id/preferences'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "setPreferences", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "remove", null);
TeachersController = __decorate([
    Controller('api/teachers'),
    __metadata("design:paramtypes", [StoreService])
], TeachersController);
export { TeachersController };
//# sourceMappingURL=teachers.controller.js.map