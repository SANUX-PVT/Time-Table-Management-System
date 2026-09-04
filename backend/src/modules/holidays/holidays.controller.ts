import { BadRequestException, Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { Holiday } from '../../common/types.js';

@Controller('api/holidays')
export class HolidaysController {
  constructor(private store: StoreService) {}

  @Get()
  list() {
    return [...this.store.holidays].sort((a, b) => a.date.localeCompare(b.date));
  }

  @Post()
  create(@Body() body: Partial<Holiday>) {
    if (!body.date || !body.label) throw new BadRequestException('date and label are required.');
    const holiday: Holiday = { id: this.store.id(), date: body.date, label: body.label, halfDay: body.halfDay ?? false };
    this.store.holidays.push(holiday);
    this.store.addAudit('HOLIDAY_ADDED', 'Admin User', `Holiday "${holiday.label}" added on ${holiday.date}.`);
    return holiday;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.store.holidays = this.store.holidays.filter((h) => h.id !== id);
    return { success: true };
  }
}
