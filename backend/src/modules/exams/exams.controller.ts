import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { Day, ExamSession, ExamTimetableEntry } from '../../common/types.js';

const DAY_ORDER: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
function dayOf(dateStr: string): Day | null {
  const idx = new Date(dateStr + 'T00:00:00').getDay(); // 0 Sun..6 Sat
  const map: Record<number, Day | null> = { 0: null, 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: null };
  return map[idx];
}
function datesInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

@Controller('api/exams')
export class ExamsController {
  constructor(private store: StoreService) {}

  @Get('sessions')
  listSessions() {
    return this.store.examSessions;
  }

  @Post('sessions')
  createSession(@Body() body: Partial<ExamSession>) {
    if (!body.name || !body.startDate || !body.endDate) {
      throw new BadRequestException('name, startDate and endDate are required.');
    }
    const session: ExamSession = {
      id: this.store.id(),
      name: body.name,
      termId: body.termId ?? this.store.currentTermId,
      startDate: body.startDate,
      endDate: body.endDate,
    };
    this.store.examSessions.push(session);
    this.store.addAudit('EXAM_SESSION_CREATED', 'Admin User', `Exam session "${session.name}" created (${session.startDate} to ${session.endDate}).`);
    return session;
  }

  @Get('entries')
  listEntries(@Query('examSessionId') examSessionId?: string, @Query('classId') classId?: string) {
    let list = this.store.examTimetable;
    if (examSessionId) list = list.filter((e) => e.examSessionId === examSessionId);
    if (classId) list = list.filter((e) => e.classId === classId);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  @Post('sessions/:id/generate')
  generate(@Param('id') id: string, @Body() body: { classIds: string[]; subjectIds: string[] }) {
    const session = this.store.examSessions.find((s) => s.id === id);
    if (!session) throw new NotFoundException('Exam session not found');
    const { classIds, subjectIds } = body;
    if (!classIds?.length || !subjectIds?.length) throw new BadRequestException('classIds and subjectIds are required.');

    // Clear this session's existing entries and rebuild.
    this.store.examTimetable = this.store.examTimetable.filter((e) => e.examSessionId !== id);

    const dates = datesInRange(session.startDate, session.endDate).filter((d) => dayOf(d));
    const busyClass = new Set<string>();
    const busyRoom = new Set<string>();
    const busyInvigilator = new Set<string>();
    const created: ExamTimetableEntry[] = [];
    const unresolved: string[] = [];

    for (const classId of classIds) {
      for (const subjectId of subjectIds) {
        let placed = false;
        for (const date of dates) {
          const day = dayOf(date)!;
          const slots = this.store.slotsForDay(day);
          for (const slot of slots) {
            const classKey = `${classId}|${date}|${slot.id}`;
            if (busyClass.has(classKey)) continue;

            const room = this.store.rooms.find((r) => !busyRoom.has(`${r.id}|${date}|${slot.id}`));
            const invigilator = this.store.teachers.find(
              (t) => t.active && !busyInvigilator.has(`${t.id}|${date}|${slot.id}`) &&
                !t.unavailable.some((u) => u.day === day && u.periodId === slot.id),
            );
            if (!room || !invigilator) continue;

            const entry: ExamTimetableEntry = {
              id: this.store.id(),
              examSessionId: id,
              date,
              periodId: slot.id,
              classId,
              subjectId,
              roomId: room.id,
              invigilatorTeacherId: invigilator.id,
            };
            this.store.examTimetable.push(entry);
            created.push(entry);
            busyClass.add(classKey);
            busyRoom.add(`${room.id}|${date}|${slot.id}`);
            busyInvigilator.add(`${invigilator.id}|${date}|${slot.id}`);
            placed = true;
            break;
          }
          if (placed) break;
        }
        if (!placed) {
          const cls = this.store.classes.find((c) => c.id === classId);
          const subject = this.store.subjects.find((s) => s.id === subjectId);
          unresolved.push(`${cls?.name} · ${subject?.name}`);
        }
      }
    }

    this.store.addAudit(
      'EXAM_TIMETABLE_GENERATED',
      'Admin User',
      `Generated exam timetable for "${session.name}" — ${created.length} exam(s) scheduled${unresolved.length ? `, ${unresolved.length} unresolved` : ''}.`,
    );
    return { created: created.length, unresolved };
  }

  @Put('entries/:id')
  updateEntry(@Param('id') id: string, @Body() body: Partial<ExamTimetableEntry>) {
    const entry = this.store.examTimetable.find((e) => e.id === id);
    if (!entry) throw new NotFoundException();
    Object.assign(entry, body, { id: entry.id });
    return entry;
  }

  @Delete('entries/:id')
  removeEntry(@Param('id') id: string) {
    this.store.examTimetable = this.store.examTimetable.filter((e) => e.id !== id);
    return { success: true };
  }
}
