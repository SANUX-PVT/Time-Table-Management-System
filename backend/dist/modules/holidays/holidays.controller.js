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
import { BadRequestException, Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let HolidaysController = class HolidaysController {
    store;
    constructor(store) {
        this.store = store;
    }
    list() {
        return [...this.store.holidays].sort((a, b) => a.date.localeCompare(b.date));
    }
    create(body) {
        if (!body.date || !body.label)
            throw new BadRequestException('date and label are required.');
        const holiday = { id: this.store.id(), date: body.date, label: body.label, halfDay: body.halfDay ?? false };
        this.store.holidays.push(holiday);
        this.store.addAudit('HOLIDAY_ADDED', 'Admin User', `Holiday "${holiday.label}" added on ${holiday.date}.`);
        return holiday;
    }
    remove(id) {
        this.store.holidays = this.store.holidays.filter((h) => h.id !== id);
        return { success: true };
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "create", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HolidaysController.prototype, "remove", null);
HolidaysController = __decorate([
    Controller('api/holidays'),
    __metadata("design:paramtypes", [StoreService])
], HolidaysController);
export { HolidaysController };
//# sourceMappingURL=holidays.controller.js.map