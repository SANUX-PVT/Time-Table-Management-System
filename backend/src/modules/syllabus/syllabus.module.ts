import { Module } from '@nestjs/common';
import { SyllabusController } from './syllabus.controller.js';

@Module({ controllers: [SyllabusController] })
export class SyllabusModule {}
