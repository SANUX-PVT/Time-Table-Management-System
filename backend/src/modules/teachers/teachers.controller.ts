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
import { Teacher } from '../../common/types.js';
import type { TeacherPreference } from '../../common/types.js';

@Controller('api/teachers')
export class TeachersController {
  constructor(private store: StoreService) {}

  @Get()
  list() {
    return this.store.teachers;
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const teacher = this.store.teachers.find((t) => t.id === id);
    if (!teacher) throw new NotFoundException();
    return teacher;
  }

  @Get(':id/master-timetable')
  masterTimetable(@Param('id') id: string) {
    return this.store.masterTimetable.filter((e) => e.teacherId === id);
  }

  @Get(':id/workload')
  workload(@Param('id') id: string) {
    const entries = this.store.masterTimetable.filter((e) => e.teacherId === id);
    const teacher = this.store.teachers.find((t) => t.id === id);
    const byDay: Record<string, number> = {};
    for (const e of entries) byDay[e.day] = (byDay[e.day] ?? 0) + 1;
    return {
      teacherId: id,
      totalPeriodsPerWeek: entries.length,
      maxPeriodsPerWeek: teacher?.maxPeriodsPerWeek ?? 0,
      periodsPerDay: byDay,
      maxPeriodsPerDay: teacher?.maxPeriodsPerDay ?? 0,
      overWeeklyLimit: teacher ? entries.length > teacher.maxPeriodsPerWeek : false,
    };
  }

  @Get(':id/preferences')
  getPreferences(@Param('id') id: string) {
    return this.store.teacherPreferences.filter((p) => p.teacherId === id);
  }

  @Put(':id/preferences')
  setPreferences(@Param('id') id: string, @Body() body: { preferences: Omit<TeacherPreference, 'id' | 'teacherId'>[] }) {
    this.store.teacherPreferences = this.store.teacherPreferences.filter((p) => p.teacherId !== id);
    const created = (body.preferences ?? []).map((p) => ({ id: this.store.id(), teacherId: id, ...p }));
    this.store.teacherPreferences.push(...created);
    return created;
  }

  @Post()
  create(@Body() body: Partial<Teacher>) {
    const teacher: Teacher = {
      id: this.store.id(),
      name: body.name ?? 'New Teacher',
      email: body.email ?? '',
      phone: body.phone ?? '',
      employeeNo: body.employeeNo ?? '',
      subjectIds: body.subjectIds ?? [],
      gradeIds: body.gradeIds ?? [],
      classIds: body.classIds ?? [],
      maxPeriodsPerDay: body.maxPeriodsPerDay ?? 6,
      maxPeriodsPerWeek: body.maxPeriodsPerWeek ?? 26,
      maxConsecutivePeriods: body.maxConsecutivePeriods ?? 3,
      unavailable: body.unavailable ?? [],
      active: body.active ?? true,
    };
    this.store.teachers.push(teacher);
    this.store.addAudit('TEACHER_CREATED', 'Admin User', `Teacher "${teacher.name}" created.`);
    return teacher;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Teacher>) {
    const teacher = this.store.teachers.find((t) => t.id === id);
    if (!teacher) throw new NotFoundException();
    Object.assign(teacher, body);
    this.store.addAudit('TEACHER_UPDATED', 'Admin User', `Teacher "${teacher.name}" updated.`);
    return teacher;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const teacher = this.store.teachers.find((t) => t.id === id);
    if (!teacher) throw new NotFoundException();
    const inUse = this.store.masterTimetable.some((m) => m.teacherId === id);
    if (inUse) {
      throw new BadRequestException(
        'Cannot delete: this teacher still has lessons in the master timetable. Reassign or remove them first.',
      );
    }
    this.store.teachers = this.store.teachers.filter((t) => t.id !== id);
    this.store.addAudit('TEACHER_DELETED', 'Admin User', `Teacher "${teacher.name}" removed.`);
    return { success: true };
  }
}
