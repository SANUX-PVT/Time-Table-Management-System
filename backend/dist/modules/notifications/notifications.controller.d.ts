import { StoreService } from '../../store/store.service.js';
export declare class NotificationsController {
    private store;
    constructor(store: StoreService);
    list(role?: string): import("../../common/types.js").NotificationItem[];
    markRead(id: string): import("../../common/types.js").NotificationItem | null;
}
