import { StoreService } from '../../store/store.service.js';
import type { StudentGroup } from '../../common/types.js';
export declare class GroupsController {
    private store;
    constructor(store: StoreService);
    list(): StudentGroup[];
    create(body: Partial<StudentGroup>): StudentGroup;
    update(id: string, body: Partial<StudentGroup>): StudentGroup;
    remove(id: string): {
        success: boolean;
    };
}
