import { Controller, Get, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import { LESSON_LIKE_TYPES } from '../../common/types.js';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private store: StoreService) {}

  @Get()
  summary(@Query('date') date?: string) {
    const d = date ?? new Date().toISOString().slice(0, 10);
    const dayEntries = this.store.dailyTimetable.filter((e) => e.date === d && LESSON_LIKE_TYPES.includes(e.type));
    const absencesToday = this.store.absences.filter((a) => a.date === d);
    const teachersAbsent = new Set(absencesToday.map((a) => a.teacherId)).size;
    const reliefRequired = dayEntries.filter((e) => e.status === 'TEACHER_ABSENT').length;
    const reliefAssigned = dayEntries.filter(
      (e) => e.isRelief && (e.status === 'RELIEF_ASSIGNED' || e.status === 'CHECKED_IN' || e.status === 'COMPLETED'),
    ).length;
    const totalTeachers = this.store.teachers.filter((t) => t.active).length;

    const completed = dayEntries.filter((e) => e.status === 'COMPLETED').length;
    const inProgress = dayEntries.filter((e) => e.status === 'CHECKED_IN').length;

    const overWorkloadTeachers = this.store.teachers.filter((t) => {
      const count = this.store.masterTimetable.filter((m) => m.teacherId === t.id).length;
      return count > t.maxPeriodsPerWeek;
    });

    const alerts: { level: 'red' | 'yellow' | 'green'; message: string }[] = [];
    const pending = reliefRequired - reliefAssigned;
    if (pending > 0) alerts.push({ level: 'red', message: `${pending} relief assignment(s) pending` });
    if (absencesToday.some((a) => a.status === 'PENDING'))
      alerts.push({ level: 'yellow', message: `${absencesToday.filter((a) => a.status === 'PENDING').length} absence request(s) awaiting approval` });
    if (overWorkloadTeachers.length)
      alerts.push({ level: 'yellow', message: `${overWorkloadTeachers.length} teacher(s) exceeded workload limit` });
    if (reliefAssigned > 0) alerts.push({ level: 'green', message: `${reliefAssigned} relief assignment(s) completed` });

    return {
      date: d,
      teachers: {
        present: totalTeachers - teachersAbsent,
        absent: teachersAbsent,
        pending: absencesToday.filter((a) => a.status === 'PENDING').length,
        total: totalTeachers,
      },
      lessons: {
        scheduled: dayEntries.length,
        completed,
        inProgress,
      },
      relief: {
        required: reliefRequired,
        assigned: reliefAssigned,
        pending: Math.max(pending, 0),
      },
      alerts,
    };
  }
}
