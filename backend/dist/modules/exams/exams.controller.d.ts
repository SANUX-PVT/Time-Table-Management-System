import { StoreService } from '../../store/store.service.js';
import type { ExamSession, ExamTimetableEntry } from '../../common/types.js';
export declare class ExamsController {
    private store;
    constructor(store: StoreService);
    listSessions(): ExamSession[];
    createSession(body: Partial<ExamSession>): ExamSession;
    listEntries(examSessionId?: string, classId?: string): ExamTimetableEntry[];
    generate(id: string, body: {
        classIds: string[];
        subjectIds: string[];
    }): {
        created: number;
        unresolved: string[];
    };
    updateEntry(id: string, body: Partial<ExamTimetableEntry>): ExamTimetableEntry;
    removeEntry(id: string): {
        success: boolean;
    };
}
