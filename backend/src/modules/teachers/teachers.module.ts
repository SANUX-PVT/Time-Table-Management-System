import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller.js';

@Module({ controllers: [TeachersController] })
export class TeachersModule {}
