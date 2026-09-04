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
import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let SwapRequestsController = class SwapRequestsController {
    store;
    constructor(store) {
        this.store = store;
    }
    list(teacherId) {
        let list = this.store.swapRequests;
        if (teacherId)
            list = list.filter((s) => s.requestingTeacherId === teacherId || s.targetTeacherId === teacherId);
        return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    create(body) {
        const { requestingTeacherId, requestingEntryId, targetTeacherId, targetEntryId } = body;
        if (!requestingTeacherId || !requestingEntryId || !targetTeacherId || !targetEntryId) {
            throw new BadRequestException('requestingTeacherId, requestingEntryId, targetTeacherId and targetEntryId are required.');
        }
        const reqEntry = this.store.masterTimetable.find((e) => e.id === requestingEntryId);
        const targetEntry = this.store.masterTimetable.find((e) => e.id === targetEntryId);
        if (!reqEntry || !targetEntry)
            throw new NotFoundException('Timetable entry not found');
        if (reqEntry.locked || targetEntry.locked)
            throw new BadRequestException('One of these periods is locked and cannot be swapped.');
        const swap = {
            id: this.store.id(),
            requestingTeacherId,
            requestingEntryId,
            targetTeacherId,
            targetEntryId,
            teacherDecision: 'PENDING',
            adminDecision: 'PENDING',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };
        this.store.swapRequests.push(swap);
        const reqTeacher = this.store.teachers.find((t) => t.id === requestingTeacherId);
        const targetTeacher = this.store.teachers.find((t) => t.id === targetTeacherId);
        this.store.addAudit('SWAP_REQUESTED', reqTeacher?.name ?? 'Unknown', `${reqTeacher?.name} requested a period swap with ${targetTeacher?.name}. Requires both ${targetTeacher?.name} and an administrator to agree.`);
        this.store.addNotification(`${reqTeacher?.name} would like to swap a period with you.`, 'SWAP', undefined, undefined);
        this.store.addNotification(`${reqTeacher?.name} requested a period swap with ${targetTeacher?.name} — needs admin approval.`, 'SWAP', 'VICE_PRINCIPAL');
        return swap;
    }
    applyOutcome(swap) {
        if (swap.teacherDecision === 'REJECTED' || swap.adminDecision === 'REJECTED') {
            swap.status = 'REJECTED';
            swap.decidedAt = new Date().toISOString();
            return;
        }
        if (swap.teacherDecision === 'ACCEPTED' && swap.adminDecision === 'ACCEPTED') {
            const reqEntry = this.store.masterTimetable.find((e) => e.id === swap.requestingEntryId);
            const targetEntry = this.store.masterTimetable.find((e) => e.id === swap.targetEntryId);
            if (reqEntry && targetEntry) {
                const tmp = reqEntry.teacherId;
                reqEntry.teacherId = targetEntry.teacherId;
                targetEntry.teacherId = tmp;
            }
            swap.status = 'ACCEPTED';
            swap.decidedAt = new Date().toISOString();
        }
    }
    teacherDecide(id, body) {
        const swap = this.store.swapRequests.find((s) => s.id === id);
        if (!swap)
            throw new NotFoundException();
        if (swap.status !== 'PENDING')
            throw new BadRequestException('This request has already been finalized.');
        if (swap.teacherDecision !== 'PENDING')
            throw new BadRequestException('The teacher has already decided on this request.');
        swap.teacherDecision = body.accept ? 'ACCEPTED' : 'REJECTED';
        this.applyOutcome(swap);
        const reqTeacher = this.store.teachers.find((t) => t.id === swap.requestingTeacherId);
        const targetTeacher = this.store.teachers.find((t) => t.id === swap.targetTeacherId);
        this.store.addAudit('SWAP_TEACHER_DECIDED', targetTeacher?.name ?? 'Unknown', `${targetTeacher?.name} ${body.accept ? 'accepted' : 'rejected'} the swap request from ${reqTeacher?.name}.` +
            (swap.status === 'PENDING' ? ' Awaiting admin approval.' : ''));
        return swap;
    }
    adminDecide(id, body) {
        const swap = this.store.swapRequests.find((s) => s.id === id);
        if (!swap)
            throw new NotFoundException();
        if (swap.status !== 'PENDING')
            throw new BadRequestException('This request has already been finalized.');
        if (swap.adminDecision !== 'PENDING')
            throw new BadRequestException('An administrator has already decided on this request.');
        swap.adminDecision = body.accept ? 'ACCEPTED' : 'REJECTED';
        swap.adminDecidedBy = body.decidedBy;
        this.applyOutcome(swap);
        const reqTeacher = this.store.teachers.find((t) => t.id === swap.requestingTeacherId);
        const targetTeacher = this.store.teachers.find((t) => t.id === swap.targetTeacherId);
        this.store.addAudit('SWAP_ADMIN_DECIDED', body.decidedBy, `${body.decidedBy} ${body.accept ? 'approved' : 'rejected'} the swap request between ${reqTeacher?.name} and ${targetTeacher?.name}.` +
            (swap.status === 'PENDING' ? ' Awaiting the teacher\'s decision.' : ''));
        return swap;
    }
};
__decorate([
    Get(),
    __param(0, Query('teacherId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SwapRequestsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SwapRequestsController.prototype, "create", null);
__decorate([
    Put(':id/teacher-decision'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SwapRequestsController.prototype, "teacherDecide", null);
__decorate([
    Put(':id/admin-decision'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SwapRequestsController.prototype, "adminDecide", null);
SwapRequestsController = __decorate([
    Controller('api/swap-requests'),
    __metadata("design:paramtypes", [StoreService])
], SwapRequestsController);
export { SwapRequestsController };
//# sourceMappingURL=swap-requests.controller.js.map