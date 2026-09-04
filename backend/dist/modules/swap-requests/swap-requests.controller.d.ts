import { StoreService } from '../../store/store.service.js';
import type { SwapRequest } from '../../common/types.js';
export declare class SwapRequestsController {
    private store;
    constructor(store: StoreService);
    list(teacherId?: string): SwapRequest[];
    create(body: {
        requestingTeacherId: string;
        requestingEntryId: string;
        targetTeacherId: string;
        targetEntryId: string;
    }): SwapRequest;
    private applyOutcome;
    teacherDecide(id: string, body: {
        accept: boolean;
    }): SwapRequest;
    adminDecide(id: string, body: {
        accept: boolean;
        decidedBy: string;
    }): SwapRequest;
}
