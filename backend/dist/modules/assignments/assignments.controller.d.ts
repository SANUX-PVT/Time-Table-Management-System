import { StoreService } from '../../store/store.service.js';
import type { Assignment, AssignmentStatus } from '../../common/types.js';
export declare class AssignmentsController {
    private store;
    constructor(store: StoreService);
    list(lessonPlanId?: string, classId?: string): Assignment[];
    create(body: Partial<Assignment>): Assignment;
    updateStatus(id: string, body: {
        status: AssignmentStatus;
    }): Assignment;
    remove(id: string): {
        success: boolean;
    };
}
