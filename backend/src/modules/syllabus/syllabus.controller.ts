import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { SyllabusItem } from '../../common/types.js';

@Controller('api/syllabus')
export class SyllabusController {
  constructor(private store: StoreService) {}

  @Get()
  list(@Query('gradeSubjectConfigId') gradeSubjectConfigId?: string) {
    let list = this.store.syllabusItems;
    if (gradeSubjectConfigId) list = list.filter((s) => s.gradeSubjectConfigId === gradeSubjectConfigId);
    return list.sort((a, b) => a.targetWeek - b.targetWeek);
  }

  @Post()
  create(@Body() body: Partial<SyllabusItem>) {
    if (!body.gradeSubjectConfigId || !body.title || body.targetWeek === undefined) {
      throw new BadRequestException('gradeSubjectConfigId, title and targetWeek are required.');
    }
    const item: SyllabusItem = { id: this.store.id(), gradeSubjectConfigId: body.gradeSubjectConfigId, title: body.title, targetWeek: body.targetWeek };
    this.store.syllabusItems.push(item);
    return item;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<SyllabusItem>) {
    const item = this.store.syllabusItems.find((s) => s.id === id);
    if (!item) throw new NotFoundException();
    Object.assign(item, body, { id: item.id });
    return item;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.store.syllabusItems = this.store.syllabusItems.filter((s) => s.id !== id);
    return { success: true };
  }

  @Get('coverage')
  coverage(@Query('classId') classId: string, @Query('subjectId') subjectId: string) {
    if (!classId || !subjectId) throw new BadRequestException('classId and subjectId are required.');
    const cls = this.store.classes.find((c) => c.id === classId);
    if (!cls) throw new NotFoundException('Class not found');
    const config = this.store.gradeSubjects.find((g) => g.gradeId === cls.gradeId && g.subjectId === subjectId);
    if (!config) return { total: 0, completed: 0, coveragePercent: 0, behindTarget: false };

    const items = this.store.syllabusItems.filter((s) => s.gradeSubjectConfigId === config.id);
    const completedIds = new Set(
      this.store.lessonPlans
        .filter((p) => p.classId === classId && p.subjectId === subjectId && p.status === 'COMPLETED' && p.syllabusItemId)
        .map((p) => p.syllabusItemId),
    );
    const completed = items.filter((i) => completedIds.has(i.id)).length;
    const total = items.length;

    // Rough "behind target" check: how many weeks into the current term have elapsed vs. targetWeek of the earliest incomplete item.
    const term = this.store.terms.find((t) => t.id === this.store.currentTermId);
    let elapsedWeeks = 0;
    if (term) {
      const start = new Date(term.startDate + 'T00:00:00').getTime();
      const now = Date.now();
      elapsedWeeks = Math.max(0, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)));
    }
    const earliestIncomplete = items.find((i) => !completedIds.has(i.id));
    const behindTarget = !!earliestIncomplete && earliestIncomplete.targetWeek < elapsedWeeks;

    return {
      total,
      completed,
      coveragePercent: total ? Math.round((completed / total) * 100) : 0,
      behindTarget,
    };
  }
}
