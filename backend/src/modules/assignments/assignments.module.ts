import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller.js';

@Module({ controllers: [AssignmentsController] })
export class AssignmentsModule {}
