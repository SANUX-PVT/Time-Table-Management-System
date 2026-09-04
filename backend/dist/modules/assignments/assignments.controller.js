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
let AssignmentsController = class AssignmentsController {
    store;
    constructor(store) {
        this.store = store;
    }
    list(lessonPlanId, classId) {
        let list = this.store.assignments;
        if (lessonPlanId)
            list = list.filter((a) => a.lessonPlanId === lessonPlanId);
        if (classId) {
            const planIds = new Set(this.store.lessonPlans.filter((p) => p.classId === classId).map((p) => p.id));
            list = list.filter((a) => planIds.has(a.lessonPlanId));
        }
        return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    create(body) {
        if (!body.lessonPlanId || !body.description || !body.dueDate) {
            throw new BadRequestException('lessonPlanId, description and dueDate are required.');
        }
        const plan = this.store.lessonPlans.find((p) => p.id === body.lessonPlanId);
        if (!plan)
            throw new NotFoundException('Lesson plan not found');
        const assignment = {
            id: this.store.id(),
            lessonPlanId: body.lessonPlanId,
            description: body.description,
            dueDate: body.dueDate,
            status: 'ASSIGNED',
        };
        this.store.assignments.push(assignment);
        return assignment;
    }
    updateStatus(id, body) {
        const assignment = this.store.assignments.find((a) => a.id === id);
        if (!assignment)
            throw new NotFoundException();
        assignment.status = body.status;
        return assignment;
    }
    remove(id) {
        this.store.assignments = this.store.assignments.filter((a) => a.id !== id);
        return { success: true };
    }
};
__decorate([
    Get(),
    __param(0, Query('lessonPlanId')),
    __param(1, Query('classId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "create", null);
__decorate([
    Put(':id/status'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "updateStatus", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssignmentsController.prototype, "remove", null);
AssignmentsController = __decorate([
    Controller('api/assignments'),
    __metadata("design:paramtypes", [StoreService])
], AssignmentsController);
export { AssignmentsController };
//# sourceMappingURL=assignments.controller.js.map