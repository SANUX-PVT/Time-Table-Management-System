import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller.js';

@Module({ controllers: [TimetableController] })
export class TimetableModule {}
