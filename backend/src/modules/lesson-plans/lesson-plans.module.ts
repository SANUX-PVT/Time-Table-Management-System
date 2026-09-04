import { Module } from '@nestjs/common';
import { LessonPlansController } from './lesson-plans.controller.js';

@Module({ controllers: [LessonPlansController] })
export class LessonPlansModule {}
