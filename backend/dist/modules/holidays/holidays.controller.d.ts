import { StoreService } from '../../store/store.service.js';
import type { Holiday } from '../../common/types.js';
export declare class HolidaysController {
    private store;
    constructor(store: StoreService);
    list(): Holiday[];
    create(body: Partial<Holiday>): Holiday;
    remove(id: string): {
        success: boolean;
    };
}
