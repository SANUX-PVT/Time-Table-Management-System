import { StoreService } from '../../store/store.service.js';
import type { SyllabusItem } from '../../common/types.js';
export declare class SyllabusController {
    private store;
    constructor(store: StoreService);
    list(gradeSubjectConfigId?: string): SyllabusItem[];
    create(body: Partial<SyllabusItem>): SyllabusItem;
    update(id: string, body: Partial<SyllabusItem>): SyllabusItem;
    remove(id: string): {
        success: boolean;
    };
    coverage(classId: string, subjectId: string): {
        total: number;
        completed: number;
        coveragePercent: number;
        behindTarget: boolean;
    };
}
