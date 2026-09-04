import { StoreService } from '../../store/store.service.js';
import { Absence } from '../../common/types.js';
export declare class DailyController {
    private store;
    constructor(store: StoreService);
    getDaily(date: string, classId?: string, teacherId?: string): import("../../common/types.js").DailyTimetableEntry[];
    override(id: string, body: {
        teacherId?: string;
        roomId?: string;
        subjectId?: string;
        status?: string;
        reason?: string;
    }): import("../../common/types.js").DailyTimetableEntry;
    listAbsences(date?: string, teacherId?: string): Absence[];
    markAbsent(body: {
        teacherId: string;
        date: string;
        wholeDay: boolean;
        periodIds?: string[];
        reason: string;
        remarks?: string;
        requiresApproval?: boolean;
    }): {
        absence: Absence;
        affectedEntries: import("../../common/types.js").DailyTimetableEntry[];
    };
    decideAbsence(id: string, body: {
        approve: boolean;
        decidedBy: string;
    }): Absence;
    reliefCandidates(dailyEntryId: string): {
        teacherId: string;
        name: string;
        subjectQualified: boolean;
        free: boolean;
        gradeExperience: boolean;
        lowWorkload: boolean;
        weeklyLoad: number;
        maxPeriodsPerWeek: number;
        score: number;
        recommendation: string;
    }[];
    assignRelief(body: {
        dailyEntryId: string;
        reliefTeacherId: string;
        assignedBy: string;
    }): import("../../common/types.js").DailyTimetableEntry;
    checkIn(id: string): import("../../common/types.js").DailyTimetableEntry;
    checkOut(id: string): import("../../common/types.js").DailyTimetableEntry;
}
