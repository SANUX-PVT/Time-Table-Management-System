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
  Query,
} from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { LessonPlan, LessonPlanStatus } from '../../common/types.js';

@Controller('api/lesson-plans')
export class LessonPlansController {
  constructor(private store: StoreService) {}

  private teacherName(id?: string) {
    return id ? this.store.teachers.find((t) => t.id === id)?.name ?? 'Unknown' : 'Unknown';
  }
  private className(id?: string) {
    return id ? this.store.classes.find((c) => c.id === id)?.name ?? 'Unknown' : 'Unknown';
  }
  private subjectName(id?: string) {
    return id ? this.store.subjects.find((s) => s.id === id)?.name ?? 'Unknown' : 'Unknown';
  }

  private withOverdue(p: LessonPlan) {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = p.date < today && (p.status === 'PLANNED' || p.status === 'IN_PROGRESS');
    return { ...p, overdue };
  }

  @Get()
  list(
    @Query('teacherId') teacherId?: string,
    @Query('classId') classId?: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: LessonPlanStatus,
  ) {
    let list = this.store.lessonPlans;
    if (teacherId) list = list.filter((p) => p.teacherId === teacherId);
    if (classId) list = list.filter((p) => p.classId === classId);
    if (date) list = list.filter((p) => p.date === date);
    if (from) list = list.filter((p) => p.date >= from);
    if (to) list = list.filter((p) => p.date <= to);
    if (status) list = list.filter((p) => p.status === status);
    return list
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt))
      .map((p) => this.withOverdue(p));
  }

  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    let list = this.store.lessonPlans;
    if (from) list = list.filter((p) => p.date >= from);
    if (to) list = list.filter((p) => p.date <= to);

    const byTeacher = new Map<string, LessonPlan[]>();
    for (const p of list) {
      const arr = byTeacher.get(p.teacherId) ?? [];
      arr.push(p);
      byTeacher.set(p.teacherId, arr);
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows = [...byTeacher.entries()].map(([teacherId, plans]) => {
      const planned = plans.filter((p) => p.status === 'PLANNED').length;
      const inProgress = plans.filter((p) => p.status === 'IN_PROGRESS').length;
      const completed = plans.filter((p) => p.status === 'COMPLETED').length;
      const delayed = plans.filter((p) => p.status === 'DELAYED').length;
      const overdue = plans.filter((p) => p.date < today && (p.status === 'PLANNED' || p.status === 'IN_PROGRESS')).length;
      return {
        teacherId,
        teacherName: this.teacherName(teacherId),
        total: plans.length,
        planned,
        inProgress,
        completed,
        delayed,
        overdue,
        completionRate: plans.length ? Math.round((completed / plans.length) * 100) : 0,
      };
    });

    return rows.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const plan = this.store.lessonPlans.find((p) => p.id === id);
    if (!plan) throw new NotFoundException();
    return this.withOverdue(plan);
  }

  @Post()
  create(
    @Body()
    body: {
      teacherId: string;
      classId: string;
      subjectId: string;
      date: string;
      periodIds?: string[];
      masterEntryIds?: string[];
      topic: string;
      objectives: string;
      resources?: string;
      homework?: string;
      syllabusItemId?: string;
    },
  ) {
    if (!body.teacherId || !body.classId || !body.subjectId || !body.date || !body.topic || !body.objectives) {
      throw new BadRequestException('teacherId, classId, subjectId, date, topic and objectives are required.');
    }
    const teacher = this.store.teachers.find((t) => t.id === body.teacherId);
    if (!teacher) throw new NotFoundException('Teacher not found');

    const now = new Date().toISOString();
    const plan: LessonPlan = {
      id: this.store.id(),
      teacherId: body.teacherId,
      classId: body.classId,
      subjectId: body.subjectId,
      date: body.date,
      periodIds: body.periodIds ?? [],
      masterEntryIds: body.masterEntryIds ?? [],
      topic: body.topic,
      objectives: body.objectives,
      resources: body.resources,
      homework: body.homework,
      syllabusItemId: body.syllabusItemId,
      status: 'PLANNED',
      createdAt: now,
      updatedAt: now,
      termId: this.store.currentTermId,
    };
    this.store.lessonPlans.push(plan);

    this.store.addAudit(
      'LESSON_PLAN_CREATED',
      teacher.name,
      `${teacher.name} created a lesson plan for ${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} on ${plan.date}: "${plan.topic}".`,
    );
    return plan;
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<Pick<LessonPlan, 'date' | 'periodIds' | 'masterEntryIds' | 'topic' | 'objectives' | 'resources' | 'homework' | 'syllabusItemId'>>,
  ) {
    const plan = this.store.lessonPlans.find((p) => p.id === id);
    if (!plan) throw new NotFoundException();
    Object.assign(plan, body, { updatedAt: new Date().toISOString() });

    this.store.addAudit(
      'LESSON_PLAN_UPDATED',
      this.teacherName(plan.teacherId),
      `Lesson plan for ${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} on ${plan.date} was updated: "${plan.topic}".`,
    );
    return this.withOverdue(plan);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: LessonPlanStatus; progressNotes?: string },
  ) {
    const plan = this.store.lessonPlans.find((p) => p.id === id);
    if (!plan) throw new NotFoundException();
    const before = plan.status;
    plan.status = body.status;
    if (body.progressNotes !== undefined) plan.progressNotes = body.progressNotes;
    plan.updatedAt = new Date().toISOString();
    if (body.status === 'COMPLETED' && !plan.completedAt) plan.completedAt = plan.updatedAt;
    if (body.status !== 'COMPLETED') plan.completedAt = undefined;

    this.store.addAudit(
      'LESSON_PLAN_STATUS_UPDATED',
      this.teacherName(plan.teacherId),
      `${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} lesson plan ("${plan.topic}") moved from ${before.replace('_', ' ')} to ${plan.status.replace('_', ' ')} on ${plan.date}.`,
    );
    return this.withOverdue(plan);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const idx = this.store.lessonPlans.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundException();
    const [plan] = this.store.lessonPlans.splice(idx, 1);
    this.store.addAudit(
      'LESSON_PLAN_DELETED',
      this.teacherName(plan.teacherId),
      `Lesson plan for ${this.className(plan.classId)} · ${this.subjectName(plan.subjectId)} on ${plan.date} ("${plan.topic}") was deleted.`,
    );
    return { ok: true };
  }
}
