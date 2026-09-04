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
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let RoomBookingsController = class RoomBookingsController {
    store;
    constructor(store) {
        this.store = store;
    }
    list(roomId, date) {
        let list = this.store.roomBookings.filter((b) => b.status === 'CONFIRMED');
        if (roomId)
            list = list.filter((b) => b.roomId === roomId);
        if (date)
            list = list.filter((b) => b.date === date);
        return list.sort((a, b) => a.date.localeCompare(b.date));
    }
    create(body) {
        if (!body.roomId || !body.date || !body.periodId || !body.bookedBy || !body.purpose) {
            throw new BadRequestException('roomId, date, periodId, bookedBy and purpose are required.');
        }
        const room = this.store.rooms.find((r) => r.id === body.roomId);
        if (!room)
            throw new NotFoundException('Room not found');
        const clash = this.store.roomBookings.find((b) => b.status === 'CONFIRMED' && b.roomId === body.roomId && b.date === body.date && b.periodId === body.periodId);
        if (clash)
            throw new BadRequestException(`${room.name} is already booked for this period on ${body.date} (${clash.purpose}).`);
        const day = new Date(body.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3);
        const regularClash = this.store.masterTimetable.find((e) => e.roomId === body.roomId && e.periodId === body.periodId && e.day === day);
        if (regularClash)
            throw new BadRequestException(`${room.name} is used by the regular class timetable during this period.`);
        const booking = {
            id: this.store.id(),
            roomId: body.roomId,
            date: body.date,
            periodId: body.periodId,
            bookedBy: body.bookedBy,
            purpose: body.purpose,
            status: 'CONFIRMED',
            createdAt: new Date().toISOString(),
        };
        this.store.roomBookings.push(booking);
        this.store.addAudit('ROOM_BOOKED', body.bookedBy, `${room.name} booked for ${body.date} — ${body.purpose}.`);
        return booking;
    }
    cancel(id) {
        const booking = this.store.roomBookings.find((b) => b.id === id);
        if (!booking)
            throw new NotFoundException();
        booking.status = 'CANCELLED';
        this.store.addAudit('ROOM_BOOKING_CANCELLED', booking.bookedBy, `Room booking for ${booking.date} cancelled.`);
        return { success: true };
    }
};
__decorate([
    Get(),
    __param(0, Query('roomId')),
    __param(1, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RoomBookingsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RoomBookingsController.prototype, "create", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomBookingsController.prototype, "cancel", null);
RoomBookingsController = __decorate([
    Controller('api/room-bookings'),
    __metadata("design:paramtypes", [StoreService])
], RoomBookingsController);
export { RoomBookingsController };
//# sourceMappingURL=room-bookings.controller.js.map