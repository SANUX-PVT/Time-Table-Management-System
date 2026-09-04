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
let ConfigController = class ConfigController {
    store;
    constructor(store) {
        this.store = store;
    }
    getConfig() {
        return this.store.schoolConfig;
    }
    updateConfig(body) {
        this.store.schoolConfig = { ...this.store.schoolConfig, ...body };
        this.store.addAudit('SCHOOL_CONFIG_UPDATED', 'Admin User', 'School configuration updated.');
        return this.store.schoolConfig;
    }
    getTimeSlots() {
        return this.store.timeSlots;
    }
    createTimeSlot(body) {
        if (!body.day || !body.start || !body.end) {
            throw new BadRequestException('day, start and end are required');
        }
        const dayCount = this.store.timeSlots.filter((s) => s.day === body.day).length;
        const slot = {
            id: this.store.id(),
            day: body.day,
            order: body.order ?? dayCount,
            start: body.start,
            end: body.end,
            label: body.label ?? 'New Period',
        };
        this.store.timeSlots.push(slot);
        this.store.addAudit('TIME_SLOT_CREATED', 'Admin User', `Added "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day}. It now appears on every class's Master Timetable — configure its type per class.`);
        return slot;
    }
    updateTimeSlot(id, body) {
        const slot = this.store.timeSlots.find((s) => s.id === id);
        if (!slot)
            throw new NotFoundException();
        Object.assign(slot, body);
        this.store.addAudit('TIME_SLOT_UPDATED', 'Admin User', `Updated "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day}.`);
        return slot;
    }
    deleteTimeSlot(id) {
        const slot = this.store.timeSlots.find((s) => s.id === id);
        if (!slot)
            throw new NotFoundException();
        const lockedInUse = this.store.masterTimetable.some((m) => m.periodId === id && m.locked);
        if (lockedInUse) {
            throw new BadRequestException('Cannot delete: this period is locked for at least one class. Unlock it first.');
        }
        const affectedClasses = new Set(this.store.masterTimetable.filter((m) => m.periodId === id).map((m) => m.classId)).size;
        this.store.masterTimetable = this.store.masterTimetable.filter((m) => m.periodId !== id);
        this.store.dailyTimetable = this.store.dailyTimetable.filter((e) => e.periodId !== id);
        this.store.timeSlots = this.store.timeSlots.filter((s) => s.id !== id);
        this.store.addAudit('TIME_SLOT_DELETED', 'Admin User', `Removed "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day} — cleared from ${affectedClasses} class timetable(s).`);
        return { success: true };
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "getConfig", null);
__decorate([
    Put(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "updateConfig", null);
__decorate([
    Get('time-slots'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "getTimeSlots", null);
__decorate([
    Post('time-slots'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "createTimeSlot", null);
__decorate([
    Put('time-slots/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "updateTimeSlot", null);
__decorate([
    Delete('time-slots/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "deleteTimeSlot", null);
ConfigController = __decorate([
    Controller('api/config'),
    __metadata("design:paramtypes", [StoreService])
], ConfigController);
export { ConfigController };
//# sourceMappingURL=config.controller.js.map