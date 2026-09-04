import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { Assignment, AssignmentStatus } from '../../common/types.js';

@Controller('api/assignments')
export class AssignmentsController {
  constructor(private store: StoreService) {}

  @Get()
  list(@Query('lessonPlanId') lessonPlanId?: string, @Query('classId') classId?: string) {
    let list = this.store.assignments;
    if (lessonPlanId) list = list.filter((a) => a.lessonPlanId === lessonPlanId);
    if (classId) {
      const planIds = new Set(this.store.lessonPlans.filter((p) => p.classId === classId).map((p) => p.id));
      list = list.filter((a) => planIds.has(a.lessonPlanId));
    }
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  @Post()
  create(@Body() body: Partial<Assignment>) {
    if (!body.lessonPlanId || !body.description || !body.dueDate) {
      throw new BadRequestException('lessonPlanId, description and dueDate are required.');
    }
    const plan = this.store.lessonPlans.find((p) => p.id === body.lessonPlanId);
    if (!plan) throw new NotFoundException('Lesson plan not found');
    const assignment: Assignment = {
      id: this.store.id(),
      lessonPlanId: body.lessonPlanId,
      description: body.description,
      dueDate: body.dueDate,
      status: 'ASSIGNED',
    };
    this.store.assignments.push(assignment);
    return assignment;
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: AssignmentStatus }) {
    const assignment = this.store.assignments.find((a) => a.id === id);
    if (!assignment) throw new NotFoundException();
    assignment.status = body.status;
    return assignment;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.store.assignments = this.store.assignments.filter((a) => a.id !== id);
    return { success: true };
  }
}
