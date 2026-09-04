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
let SyllabusController = class SyllabusController {
    store;
    constructor(store) {
        this.store = store;
    }
    list(gradeSubjectConfigId) {
        let list = this.store.syllabusItems;
        if (gradeSubjectConfigId)
            list = list.filter((s) => s.gradeSubjectConfigId === gradeSubjectConfigId);
        return list.sort((a, b) => a.targetWeek - b.targetWeek);
    }
    create(body) {
        if (!body.gradeSubjectConfigId || !body.title || body.targetWeek === undefined) {
            throw new BadRequestException('gradeSubjectConfigId, title and targetWeek are required.');
        }
        const item = { id: this.store.id(), gradeSubjectConfigId: body.gradeSubjectConfigId, title: body.title, targetWeek: body.targetWeek };
        this.store.syllabusItems.push(item);
        return item;
    }
    update(id, body) {
        const item = this.store.syllabusItems.find((s) => s.id === id);
        if (!item)
            throw new NotFoundException();
        Object.assign(item, body, { id: item.id });
        return item;
    }
    remove(id) {
        this.store.syllabusItems = this.store.syllabusItems.filter((s) => s.id !== id);
        return { success: true };
    }
    coverage(classId, subjectId) {
        if (!classId || !subjectId)
            throw new BadRequestException('classId and subjectId are required.');
        const cls = this.store.classes.find((c) => c.id === classId);
        if (!cls)
            throw new NotFoundException('Class not found');
        const config = this.store.gradeSubjects.find((g) => g.gradeId === cls.gradeId && g.subjectId === subjectId);
        if (!config)
            return { total: 0, completed: 0, coveragePercent: 0, behindTarget: false };
        const items = this.store.syllabusItems.filter((s) => s.gradeSubjectConfigId === config.id);
        const completedIds = new Set(this.store.lessonPlans
            .filter((p) => p.classId === classId && p.subjectId === subjectId && p.status === 'COMPLETED' && p.syllabusItemId)
            .map((p) => p.syllabusItemId));
        const completed = items.filter((i) => completedIds.has(i.id)).length;
        const total = items.length;
        const term = this.store.terms.find((t) => t.id === this.store.currentTermId);
        let elapsedWeeks = 0;
        if (term) {
            const start = new Date(term.startDate + 'T00:00:00').getTime();
            const now = Date.now();
            elapsedWeeks = Math.max(0, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)));
        }
        const earliestIncomplete = items.find((i) => !completedIds.has(i.id));
        const behindTarget = !!earliestIncomplete && earliestIncomplete.targetWeek < elapsedWeeks;
        return {
            total,
            completed,
            coveragePercent: total ? Math.round((completed / total) * 100) : 0,
            behindTarget,
        };
    }
};
__decorate([
    Get(),
    __param(0, Query('gradeSubjectConfigId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SyllabusController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SyllabusController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SyllabusController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SyllabusController.prototype, "remove", null);
__decorate([
    Get('coverage'),
    __param(0, Query('classId')),
    __param(1, Query('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SyllabusController.prototype, "coverage", null);
SyllabusController = __decorate([
    Controller('api/syllabus'),
    __metadata("design:paramtypes", [StoreService])
], SyllabusController);
export { SyllabusController };
//# sourceMappingURL=syllabus.controller.js.map