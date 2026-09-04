import { Module } from '@nestjs/common';
import { StoreModule } from './store/store.module.js';
import { ConfigModule } from './modules/config/config.module.js';
import { AcademicModule } from './modules/academic/academic.module.js';
import { TeachersModule } from './modules/teachers/teachers.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { TimetableModule } from './modules/timetable/timetable.module.js';
import { DailyModule } from './modules/daily/daily.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { LessonPlansModule } from './modules/lesson-plans/lesson-plans.module.js';
import { TermsModule } from './modules/terms/terms.module.js';
import { GroupsModule } from './modules/groups/groups.module.js';
import { HolidaysModule } from './modules/holidays/holidays.module.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { RoomBookingsModule } from './modules/room-bookings/room-bookings.module.js';
import { SwapRequestsModule } from './modules/swap-requests/swap-requests.module.js';
import { SyllabusModule } from './modules/syllabus/syllabus.module.js';
import { AssignmentsModule } from './modules/assignments/assignments.module.js';

@Module({
  imports: [
    StoreModule,
    ConfigModule,
    AcademicModule,
    TeachersModule,
    UsersModule,
    TimetableModule,
    DailyModule,
    DashboardModule,
    AuditModule,
    NotificationsModule,
    ReportsModule,
    PermissionsModule,
    LessonPlansModule,
    TermsModule,
    GroupsModule,
    HolidaysModule,
    ExamsModule,
    RoomBookingsModule,
    SwapRequestsModule,
    SyllabusModule,
    AssignmentsModule,
  ],
})
export class AppModule {}
