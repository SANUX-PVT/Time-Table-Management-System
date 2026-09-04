import { StoreService } from '../../store/store.service.js';
export declare class ReportsController {
    private store;
    constructor(store: StoreService);
    teacherWorkload(): {
        teacherId: string;
        name: string;
        periodsPerWeek: number;
        maxPeriodsPerWeek: number;
        freePeriods: number;
        overLimit: boolean;
        subjects: (string | undefined)[];
        classCount: number;
    }[];
    absenceReport(): {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        teacherId: string;
        name: string;
    }[];
    reliefReport(): {
        providedByTeacher: {
            teacherId: string;
            name: string;
            reliefCount: number;
        }[];
        totalReliefAssigned: number;
        totalPendingRelief: number;
        utilizationRate: number;
    };
    attendanceReport(): {
        rows: {
            id: string;
            date: string;
            teacherId: string | undefined;
            teacherName: string;
            className: string;
            subjectName: string;
            periodLabel: string;
            checkIn: string | undefined;
            checkOut: string | undefined;
            minutesLate: number;
            isLate: boolean;
            status: import("../../common/types.js").LessonStatus;
        }[];
        lateCount: number;
        completedCount: number;
    };
    trends(metric?: 'absences' | 'relief' | 'lessonPlanCompletion', bucket?: 'week' | 'month'): {
        bucket: string;
        count: number;
    }[] | {
        bucket: string;
        total: number;
        completed: number;
        rate: number;
    }[];
    operationalReport(): {
        totalAbsences: number;
        pendingAbsences: number;
        cancelledLessons: number;
        rescheduledLessons: number;
        timetableChangeEvents: number;
    };
}
