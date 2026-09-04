import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { RoomBooking } from '../../common/types.js';

@Controller('api/room-bookings')
export class RoomBookingsController {
  constructor(private store: StoreService) {}

  @Get()
  list(@Query('roomId') roomId?: string, @Query('date') date?: string) {
    let list = this.store.roomBookings.filter((b) => b.status === 'CONFIRMED');
    if (roomId) list = list.filter((b) => b.roomId === roomId);
    if (date) list = list.filter((b) => b.date === date);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  @Post()
  create(@Body() body: Partial<RoomBooking>) {
    if (!body.roomId || !body.date || !body.periodId || !body.bookedBy || !body.purpose) {
      throw new BadRequestException('roomId, date, periodId, bookedBy and purpose are required.');
    }
    const room = this.store.rooms.find((r) => r.id === body.roomId);
    if (!room) throw new NotFoundException('Room not found');

    const clash = this.store.roomBookings.find(
      (b) => b.status === 'CONFIRMED' && b.roomId === body.roomId && b.date === body.date && b.periodId === body.periodId,
    );
    if (clash) throw new BadRequestException(`${room.name} is already booked for this period on ${body.date} (${clash.purpose}).`);

    // Also check the room isn't in regular use in the master timetable that day of week.
    const day = new Date(body.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3);
    const regularClash = this.store.masterTimetable.find(
      (e) => e.roomId === body.roomId && e.periodId === body.periodId && e.day === (day as any),
    );
    if (regularClash) throw new BadRequestException(`${room.name} is used by the regular class timetable during this period.`);

    const booking: RoomBooking = {
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

  @Delete(':id')
  cancel(@Param('id') id: string) {
    const booking = this.store.roomBookings.find((b) => b.id === id);
    if (!booking) throw new NotFoundException();
    booking.status = 'CANCELLED';
    this.store.addAudit('ROOM_BOOKING_CANCELLED', booking.bookedBy, `Room booking for ${booking.date} cancelled.`);
    return { success: true };
  }
}
