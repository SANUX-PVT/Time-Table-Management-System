import { StoreService } from '../../store/store.service.js';
export declare class AuditController {
    private store;
    constructor(store: StoreService);
    list(limit?: string): import("../../common/types.js").AuditLogEntry[];
}
