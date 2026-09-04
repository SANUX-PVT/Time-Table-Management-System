import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller.js';

@Module({ controllers: [ExamsController] })
export class ExamsModule {}
