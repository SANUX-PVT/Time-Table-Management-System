import { Controller, Get, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';

function bucketOf(dateStr: string, bucket: 'week' | 'month'): string {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  if (bucket === 'month') return dateStr.slice(0, 7);
  // week bucket: label by the Monday of that week
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

const LATE_THRESHOLD_MIN = 3;

function minutesLate(slotStart: string, checkInIso: string): number {
  const [h, m] = slotStart.split(':').map(Number);
  const checkIn = new Date(checkInIso);
  const scheduled = new Date(checkIn);
  scheduled.setHours(h, m, 0, 0);
  return Math.round((checkIn.getTime() - scheduled.getTime()) / 60000);
}

@Controller('api/reports')
export class ReportsController {
  constructor(private store: StoreService) {}

  @Get('teacher-workload')
  teacherWorkload() {
    return this.store.teachers
      .filter((t) => t.active)
      .map((t) => {
        const entries = this.store.masterTimetable.filter((e) => e.teacherId === t.id);
        const subjectNames = Array.from(new Set(entries.map((e) => e.subjectId).filter(Boolean))).map(
          (sid) => this.store.subjects.find((s) => s.id === sid)?.name ?? sid,
        );
        return {
          teacherId: t.id,
          name: t.name,
          periodsPerWeek: entries.length,
          maxPeriodsPerWeek: t.maxPeriodsPerWeek,
          freePeriods: Math.max(0, t.maxPeriodsPerWeek - entries.length),
          overLimit: entries.length > t.maxPeriodsPerWeek,
          subjects: subjectNames,
          classCount: new Set(entries.map((e) => e.classId)).size,
        };
      })
      .sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);
  }

  @Get('absences')
  absenceReport() {
    const byTeacher = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();
    for (const a of this.store.absences) {
      if (!byTeacher.has(a.teacherId)) byTeacher.set(a.teacherId, { total: 0, approved: 0, pending: 0, rejected: 0 });
      const row = byTeacher.get(a.teacherId)!;
      row.total += 1;
      if (a.status === 'APPROVED') row.approved += 1;
      else if (a.status === 'PENDING') row.pending += 1;
      else row.rejected += 1;
    }
    return Array.from(byTeacher.entries()).map(([teacherId, row]) => ({
      teacherId,
      name: this.store.teachers.find((t) => t.id === teacherId)?.name ?? 'Unknown',
      ...row,
    })).sort((a, b) => b.total - a.total);
  }

  @Get('relief')
  reliefReport() {
    const byTeacher = new Map<string, number>();
    for (const r of this.store.reliefAssignments) {
      byTeacher.set(r.reliefTeacherId, (byTeacher.get(r.reliefTeacherId) ?? 0) + 1);
    }
    const providedByTeacher = Array.from(byTeacher.entries())
      .map(([teacherId, count]) => ({ teacherId, name: this.store.teachers.find((t) => t.id === teacherId)?.name ?? 'Unknown', reliefCount: count }))
      .sort((a, b) => b.reliefCount - a.reliefCount);

    const totalAbsentLessons = this.store.dailyTimetable.filter((e) => e.status === 'TEACHER_ABSENT').length;
    const totalReliefAssigned = this.store.reliefAssignments.length;

    return {
      providedByTeacher,
      totalReliefAssigned,
      totalPendingRelief: totalAbsentLessons,
      utilizationRate: totalReliefAssigned + totalAbsentLessons > 0
        ? Math.round((totalReliefAssigned / (totalReliefAssigned + totalAbsentLessons)) * 100)
        : 100,
    };
  }

  @Get('attendance')
  attendanceReport() {
    const rows = this.store.dailyTimetable
      .filter((e) => e.checkIn)
      .map((e) => {
        const slot = this.store.timeSlots.find((s) => s.id === e.periodId);
        const late = slot ? minutesLate(slot.start, e.checkIn!) : 0;
        return {
          id: e.id,
          date: e.date,
          teacherId: e.teacherId,
          teacherName: this.store.teachers.find((t) => t.id === e.teacherId)?.name ?? 'Unknown',
          className: this.store.classes.find((c) => c.id === e.classId)?.name ?? '—',
          subjectName: this.store.subjects.find((s) => s.id === e.subjectId)?.name ?? '—',
          periodLabel: slot?.label ?? '—',
          checkIn: e.checkIn,
          checkOut: e.checkOut,
          minutesLate: late,
          isLate: late > LATE_THRESHOLD_MIN,
          status: e.status,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      rows,
      lateCount: rows.filter((r) => r.isLate).length,
      completedCount: rows.filter((r) => r.status === 'COMPLETED').length,
    };
  }

  @Get('trends')
  trends(@Query('metric') metric: 'absences' | 'relief' | 'lessonPlanCompletion' = 'absences', @Query('bucket') bucket: 'week' | 'month' = 'week') {
    if (metric === 'absences') {
      const byBucket = new Map<string, number>();
      for (const a of this.store.absences) {
        const b = bucketOf(a.date, bucket);
        byBucket.set(b, (byBucket.get(b) ?? 0) + 1);
      }
      return [...byBucket.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, count]) => ({ bucket, count }));
    }
    if (metric === 'relief') {
      const byBucket = new Map<string, number>();
      for (const r of this.store.reliefAssignments) {
        const b = bucketOf(r.assignedAt, bucket);
        byBucket.set(b, (byBucket.get(b) ?? 0) + 1);
      }
      return [...byBucket.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([bucket, count]) => ({ bucket, count }));
    }
    // lessonPlanCompletion
    const byBucket = new Map<string, { total: number; completed: number }>();
    for (const p of this.store.lessonPlans) {
      const b = bucketOf(p.date, bucket);
      if (!byBucket.has(b)) byBucket.set(b, { total: 0, completed: 0 });
      const row = byBucket.get(b)!;
      row.total += 1;
      if (p.status === 'COMPLETED') row.completed += 1;
    }
    return [...byBucket.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, row]) => ({ bucket, total: row.total, completed: row.completed, rate: row.total ? Math.round((row.completed / row.total) * 100) : 0 }));
  }

  @Get('operational')
  operationalReport() {
    const cancelled = this.store.dailyTimetable.filter((e) => e.status === 'CANCELLED').length;
    const rescheduled = this.store.dailyTimetable.filter((e) => e.status === 'RESCHEDULED').length;
    const pendingAbsences = this.store.absences.filter((a) => a.status === 'PENDING').length;
    const overrideEvents = this.store.auditLog.filter((a) => a.action === 'DAILY_TIMETABLE_OVERRIDDEN').length;
    return {
      totalAbsences: this.store.absences.length,
      pendingAbsences,
      cancelledLessons: cancelled,
      rescheduledLessons: rescheduled,
      timetableChangeEvents: overrideEvents,
    };
  }
}
