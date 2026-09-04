import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller.js';

@Module({ controllers: [AcademicController] })
export class AcademicModule {}
