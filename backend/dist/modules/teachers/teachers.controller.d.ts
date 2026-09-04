import { StoreService } from '../../store/store.service.js';
import { Teacher } from '../../common/types.js';
import type { TeacherPreference } from '../../common/types.js';
export declare class TeachersController {
    private store;
    constructor(store: StoreService);
    list(): Teacher[];
    get(id: string): Teacher;
    masterTimetable(id: string): import("../../common/types.js").MasterTimetableEntry[];
    workload(id: string): {
        teacherId: string;
        totalPeriodsPerWeek: number;
        maxPeriodsPerWeek: number;
        periodsPerDay: Record<string, number>;
        maxPeriodsPerDay: number;
        overWeeklyLimit: boolean;
    };
    getPreferences(id: string): TeacherPreference[];
    setPreferences(id: string, body: {
        preferences: Omit<TeacherPreference, 'id' | 'teacherId'>[];
    }): {
        preference: import("../../common/types.js").PreferenceLevel;
        day: import("../../common/types.js").Day;
        periodId: string;
        id: `${string}-${string}-${string}-${string}-${string}`;
        teacherId: string;
    }[];
    create(body: Partial<Teacher>): Teacher;
    update(id: string, body: Partial<Teacher>): Teacher;
    remove(id: string): {
        success: boolean;
    };
}
