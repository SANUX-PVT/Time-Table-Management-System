import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import { TimeSlot } from '../../common/types.js';

@Controller('api/config')
export class ConfigController {
  constructor(private store: StoreService) {}

  @Get()
  getConfig() {
    return this.store.schoolConfig;
  }

  @Put()
  updateConfig(@Body() body: Partial<typeof this.store.schoolConfig>) {
    this.store.schoolConfig = { ...this.store.schoolConfig, ...body };
    this.store.addAudit('SCHOOL_CONFIG_UPDATED', 'Admin User', 'School configuration updated.');
    return this.store.schoolConfig;
  }

  @Get('time-slots')
  getTimeSlots() {
    return this.store.timeSlots;
  }

  @Post('time-slots')
  createTimeSlot(@Body() body: Partial<TimeSlot>) {
    if (!body.day || !body.start || !body.end) {
      throw new BadRequestException('day, start and end are required');
    }
    const dayCount = this.store.timeSlots.filter((s) => s.day === body.day).length;
    const slot: TimeSlot = {
      id: this.store.id(),
      day: body.day,
      order: body.order ?? dayCount,
      start: body.start,
      end: body.end,
      label: body.label ?? 'New Period',
    };
    this.store.timeSlots.push(slot);
    this.store.addAudit(
      'TIME_SLOT_CREATED',
      'Admin User',
      `Added "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day}. It now appears on every class's Master Timetable — configure its type per class.`,
    );
    return slot;
  }

  @Put('time-slots/:id')
  updateTimeSlot(@Param('id') id: string, @Body() body: Partial<TimeSlot>) {
    const slot = this.store.timeSlots.find((s) => s.id === id);
    if (!slot) throw new NotFoundException();
    Object.assign(slot, body);
    this.store.addAudit('TIME_SLOT_UPDATED', 'Admin User', `Updated "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day}.`);
    return slot;
  }

  @Delete('time-slots/:id')
  deleteTimeSlot(@Param('id') id: string) {
    const slot = this.store.timeSlots.find((s) => s.id === id);
    if (!slot) throw new NotFoundException();
    const lockedInUse = this.store.masterTimetable.some((m) => m.periodId === id && m.locked);
    if (lockedInUse) {
      throw new BadRequestException('Cannot delete: this period is locked for at least one class. Unlock it first.');
    }
    // Removing a structural slot removes it from every class's timetable — the
    // Time Slot Engine is the single source of truth for the shared template.
    const affectedClasses = new Set(this.store.masterTimetable.filter((m) => m.periodId === id).map((m) => m.classId)).size;
    this.store.masterTimetable = this.store.masterTimetable.filter((m) => m.periodId !== id);
    this.store.dailyTimetable = this.store.dailyTimetable.filter((e) => e.periodId !== id);
    this.store.timeSlots = this.store.timeSlots.filter((s) => s.id !== id);
    this.store.addAudit(
      'TIME_SLOT_DELETED',
      'Admin User',
      `Removed "${slot.label}" (${slot.start}-${slot.end}) on ${slot.day} — cleared from ${affectedClasses} class timetable(s).`,
    );
    return { success: true };
  }
}
