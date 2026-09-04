import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import { Absence, Day } from '../../common/types.js';

const DAY_MAP: Record<number, Day | null> = {
  0: null,
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: null,
};

function dayOf(date: string): Day | null {
  const d = new Date(date + 'T00:00:00');
  return DAY_MAP[d.getDay()];
}

@Controller('api/daily')
export class DailyController {
  constructor(private store: StoreService) {}

  @Get('timetable')
  getDaily(@Query('date') date: string, @Query('classId') classId?: string, @Query('teacherId') teacherId?: string) {
    if (!date) throw new BadRequestException('date query param required (YYYY-MM-DD)');
    const day = dayOf(date);
    if (day) this.store.materializeDailyTimetable(date, day);
    let entries = this.store.dailyTimetable.filter((e) => e.date === date);
    if (classId) entries = entries.filter((e) => e.classId === classId);
    if (teacherId) entries = entries.filter((e) => e.teacherId === teacherId || e.originalTeacherId === teacherId);
    return entries;
  }

  @Put('timetable/:id/override')
  override(
    @Param('id') id: string,
    @Body() body: { teacherId?: string; roomId?: string; subjectId?: string; status?: string; reason?: string },
  ) {
    const entry = this.store.dailyTimetable.find((e) => e.id === id);
    if (!entry) throw new NotFoundException();
    const before = { ...entry };
    Object.assign(entry, body);

    const cls = this.store.classes.find((c) => c.id === entry.classId);
    const slot = this.store.timeSlots.find((s) => s.id === entry.periodId);
    const context = `${cls?.name ?? 'Class'} · ${slot?.label ?? 'Period'} (${entry.date})`;

    const teacherName = (tid?: string) => (tid ? this.store.teachers.find((t) => t.id === tid)?.name ?? 'Unknown' : '—');
    const subjectName = (sid?: string) => (sid ? this.store.subjects.find((s) => s.id === sid)?.name ?? 'Unknown' : '—');
    const roomName = (rid?: string) => (rid ? this.store.rooms.find((r) => r.id === rid)?.name ?? 'Unknown' : 'None');

    const changes: string[] = [];
    if (body.teacherId !== undefined && body.teacherId !== before.teacherId) {
      changes.push(`Teacher: ${teacherName(before.teacherId)} → ${teacherName(body.teacherId)}`);
    }
    if (body.subjectId !== undefined && body.subjectId !== before.subjectId) {
      changes.push(`Subject: ${subjectName(before.subjectId)} → ${subjectName(body.subjectId)}`);
    }
    if (body.roomId !== undefined && body.roomId !== before.roomId) {
      changes.push(`Room: ${roomName(before.roomId)} → ${roomName(body.roomId)}`);
    }
    if (body.status !== undefined && body.status !== before.status) {
      changes.push(`Status: ${before.status.replace(/_/g, ' ')} → ${body.status.replace(/_/g, ' ')}`);
    }
    const summary = changes.length ? changes.join('; ') : 'No changes';

    this.store.addAudit(
      'DAILY_TIMETABLE_OVERRIDDEN',
      'Admin User',
      `${context} — ${summary}. Reason: ${body.reason ?? 'Not specified'}.`,
    );
    return entry;
  }

  // ---- Absences ----
  @Get('absences')
  listAbsences(@Query('date') date?: string, @Query('teacherId') teacherId?: string) {
    let list = this.store.absences;
    if (date) list = list.filter((a) => a.date === date);
    if (teacherId) list = list.filter((a) => a.teacherId === teacherId);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  @Post('absences')
  markAbsent(
    @Body()
    body: {
      teacherId: string;
      date: string;
      wholeDay: boolean;
      periodIds?: string[];
      reason: string;
      remarks?: string;
      requiresApproval?: boolean;
    },
  ) {
    const teacher = this.store.teachers.find((t) => t.id === body.teacherId);
    if (!teacher) throw new NotFoundException('Teacher not found');
    const day = dayOf(body.date);
    if (!day) throw new BadRequestException('Not a working day');
    this.store.materializeDailyTimetable(body.date, day);

    const teacherEntries = this.store.dailyTimetable.filter(
      (e) => e.date === body.date && e.originalTeacherId === body.teacherId,
    );
    const affected = body.wholeDay
      ? teacherEntries
      : teacherEntries.filter((e) => body.periodIds?.includes(e.periodId));

    const status = body.requiresApproval === false ? 'APPROVED' : 'PENDING';

    const absence: Absence = {
      id: this.store.id(),
      teacherId: body.teacherId,
      date: body.date,
      wholeDay: body.wholeDay,
      periodIds: body.wholeDay ? teacherEntries.map((e) => e.periodId) : (body.periodIds ?? []),
      reason: body.reason,
      remarks: body.remarks,
      status,
      createdAt: new Date().toISOString(),
      termId: this.store.currentTermId,
    };
    this.store.absences.push(absence);

    for (const entry of affected) {
      entry.status = 'TEACHER_ABSENT';
      entry.absenceId = absence.id;
    }

    this.store.addAudit(
      'ABSENCE_SUBMITTED',
      teacher.name,
      `${teacher.name} marked absent on ${body.date} (${body.reason}). ${affected.length} lesson(s) affected.`,
    );
    this.store.addNotification(
      `${teacher.name} marked absent on ${body.date}. ${affected.length} lesson(s) need relief.`,
      'ABSENCE',
      'VICE_PRINCIPAL',
    );

    return { absence, affectedEntries: affected };
  }

  @Put('absences/:id/decision')
  decideAbsence(@Param('id') id: string, @Body() body: { approve: boolean; decidedBy: string }) {
    const absence = this.store.absences.find((a) => a.id === id);
    if (!absence) throw new NotFoundException();
    absence.status = body.approve ? 'APPROVED' : 'REJECTED';

    if (!body.approve) {
      const entries = this.store.dailyTimetable.filter((e) => e.absenceId === id);
      for (const e of entries) {
        e.status = 'SCHEDULED';
        e.teacherId = e.originalTeacherId;
        e.isRelief = false;
        e.absenceId = undefined;
      }
    }

    const teacher = this.store.teachers.find((t) => t.id === absence.teacherId);
    this.store.addAudit(
      body.approve ? 'ABSENCE_APPROVED' : 'ABSENCE_REJECTED',
      body.decidedBy,
      `Absence for ${teacher?.name} on ${absence.date} was ${body.approve ? 'approved' : 'rejected'}.`,
    );
    this.store.addNotification(
      `Your absence request for ${absence.date} was ${body.approve ? 'approved' : 'rejected'}.`,
      'ABSENCE',
      undefined,
      undefined,
    );
    return absence;
  }

  // ---- Relief ----
  @Get('relief-candidates')
  reliefCandidates(@Query('dailyEntryId') dailyEntryId: string) {
    const entry = this.store.dailyTimetable.find((e) => e.id === dailyEntryId);
    if (!entry) throw new NotFoundException('Daily entry not found');
    if (!entry.subjectId) throw new BadRequestException('This period has no subject/teacher to relieve.');
    const subjectId = entry.subjectId;

    const cls = this.store.classes.find((c) => c.id === entry.classId);
    const busyTeacherIds = new Set(
      this.store.dailyTimetable
        .filter((e) => e.date === entry.date && e.periodId === entry.periodId && e.id !== entry.id)
        .map((e) => e.teacherId),
    );

    const candidates = this.store.teachers
      .filter((t) => t.active && t.id !== entry.originalTeacherId)
      .map((t) => {
        const subjectQualified = t.subjectIds.includes(subjectId);
        const gradeExperience = t.gradeIds.includes(cls!.gradeId) || t.classIds.includes(cls!.id);
        const isAvailable = !t.unavailable.some((u) => u.day === entry.day && u.periodId === entry.periodId);
        const free = !busyTeacherIds.has(t.id) && isAvailable;
        const weeklyLoad = this.store.masterTimetable.filter((m) => m.teacherId === t.id).length;
        const lowWorkload = weeklyLoad < t.maxPeriodsPerWeek * 0.85;

        let score = 0;
        if (subjectQualified) score += 45;
        if (free) score += 30;
        if (gradeExperience) score += 15;
        if (lowWorkload) score += 10;

        let recommendation: string;
        if (!isAvailable) recommendation = 'Unavailable (declared)';
        else if (!free) recommendation = 'Unavailable';
        else if (subjectQualified && gradeExperience) recommendation = 'Best';
        else if (subjectQualified) recommendation = 'Good';
        else recommendation = 'Not recommended';

        return {
          teacherId: t.id,
          name: t.name,
          subjectQualified,
          free,
          gradeExperience,
          lowWorkload,
          weeklyLoad,
          maxPeriodsPerWeek: t.maxPeriodsPerWeek,
          score,
          recommendation,
        };
      })
      .filter((c) => c.free)
      .sort((a, b) => b.score - a.score);

    return candidates;
  }

  @Post('relief-assign')
  assignRelief(
    @Body() body: { dailyEntryId: string; reliefTeacherId: string; assignedBy: string },
  ) {
    const entry = this.store.dailyTimetable.find((e) => e.id === body.dailyEntryId);
    if (!entry) throw new NotFoundException('Daily entry not found');
    const teacher = this.store.teachers.find((t) => t.id === body.reliefTeacherId);
    if (!teacher) throw new NotFoundException('Relief teacher not found');

    const conflict = this.store.dailyTimetable.find(
      (e) =>
        e.id !== entry.id &&
        e.date === entry.date &&
        e.periodId === entry.periodId &&
        e.teacherId === body.reliefTeacherId,
    );
    if (conflict) {
      throw new BadRequestException(`${teacher.name} is already assigned during this period.`);
    }

    entry.teacherId = body.reliefTeacherId;
    entry.isRelief = true;
    entry.status = 'RELIEF_ASSIGNED';

    this.store.reliefAssignments.push({
      id: this.store.id(),
      absenceId: entry.absenceId!,
      dailyEntryId: entry.id,
      reliefTeacherId: body.reliefTeacherId,
      assignedBy: body.assignedBy,
      assignedAt: new Date().toISOString(),
      termId: this.store.currentTermId,
    });

    const cls = this.store.classes.find((c) => c.id === entry.classId);
    this.store.addAudit(
      'RELIEF_ASSIGNED',
      body.assignedBy,
      `${teacher.name} assigned as relief for ${cls?.name} on ${entry.date}.`,
    );
    this.store.addNotification(
      `You have been assigned as relief teacher for ${cls?.name} on ${entry.date}.`,
      'RELIEF',
      undefined,
    );
    return entry;
  }

  // ---- Lesson attendance ----
  @Post('timetable/:id/check-in')
  checkIn(@Param('id') id: string) {
    const entry = this.store.dailyTimetable.find((e) => e.id === id);
    if (!entry) throw new NotFoundException();
    entry.checkIn = new Date().toISOString();
    entry.status = 'CHECKED_IN';
    this.store.addAudit('LESSON_CHECK_IN', entry.teacherId ?? 'Unknown', `Checked in for ${entry.date} period.`);
    return entry;
  }

  @Post('timetable/:id/check-out')
  checkOut(@Param('id') id: string) {
    const entry = this.store.dailyTimetable.find((e) => e.id === id);
    if (!entry) throw new NotFoundException();
    entry.checkOut = new Date().toISOString();
    entry.status = 'COMPLETED';
    this.store.addAudit('LESSON_CHECK_OUT', entry.teacherId ?? 'Unknown', `Checked out for ${entry.date} period.`);
    return entry;
  }
}
