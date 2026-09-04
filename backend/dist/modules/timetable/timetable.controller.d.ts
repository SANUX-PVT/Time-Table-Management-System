import { StoreService } from '../../store/store.service.js';
import { MasterTimetableEntry } from '../../common/types.js';
export declare class TimetableController {
    private store;
    constructor(store: StoreService);
    listMaster(classId?: string, day?: string): MasterTimetableEntry[];
    versions(): import("../../common/types.js").TimetableVersion[];
    private conflictCheck;
    private availabilityConflict;
    create(body: Partial<MasterTimetableEntry> & {
        directPublish?: boolean;
        proposedBy?: string;
    }): MasterTimetableEntry | {
        pending: boolean;
        change: {
            id: `${string}-${string}-${string}-${string}-${string}`;
            entryId: string | undefined;
            proposedBy: string;
            proposedChange: any;
            status: "PENDING";
            createdAt: string;
        };
    };
    update(id: string, body: Partial<MasterTimetableEntry> & {
        directPublish?: boolean;
        proposedBy?: string;
    }): MasterTimetableEntry | {
        pending: boolean;
        change: {
            id: `${string}-${string}-${string}-${string}-${string}`;
            entryId: string | undefined;
            proposedBy: string;
            proposedChange: any;
            status: "PENDING";
            createdAt: string;
        };
    };
    private queuePendingChange;
    listPending(): import("../../common/types.js").PendingTimetableChange[];
    decidePending(id: string, body: {
        approve: boolean;
        decidedBy: string;
    }): import("../../common/types.js").PendingTimetableChange;
    createGroupLesson(body: {
        day: MasterTimetableEntry['day'];
        periodId: string;
        groupId: string;
        teacherId: string;
        roomId?: string;
        locked?: boolean;
    }): MasterTimetableEntry[];
    removeGroupLesson(groupId: string, day: string, periodId: string): {
        removed: number;
    };
    remove(id: string): {
        success: boolean;
    };
    validate(): {
        valid: boolean;
        errorCount: number;
        warningCount: number;
        issues: {
            level: "error" | "warning";
            message: string;
        }[];
    };
    generate(body: {
        scope: 'ALL' | 'CLASS';
        classId?: string;
        mode: 'FILL_GAPS' | 'REGENERATE';
    }): {
        created: number;
        cleared: number;
        unresolved: string[];
    };
    copyDay(body: {
        classId: string;
        fromDay: string;
        toDay: string;
    }): {
        copied: number;
        skipped: string[];
    };
    publish(body: {
        notes?: string;
    }): {
        id: `${string}-${string}-${string}-${string}-${string}`;
        version: number;
        status: "PUBLISHED";
        createdAt: string;
        createdBy: string;
        publishedAt: string;
        notes: string | undefined;
        termId: string;
    };
}
