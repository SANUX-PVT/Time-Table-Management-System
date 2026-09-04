import { StoreService } from '../../store/store.service.js';
import { TimeSlot } from '../../common/types.js';
export declare class ConfigController {
    private store;
    constructor(store: StoreService);
    getConfig(): import("../../common/types.js").SchoolConfig;
    updateConfig(body: Partial<typeof this.store.schoolConfig>): import("../../common/types.js").SchoolConfig;
    getTimeSlots(): TimeSlot[];
    createTimeSlot(body: Partial<TimeSlot>): TimeSlot;
    updateTimeSlot(id: string, body: Partial<TimeSlot>): TimeSlot;
    deleteTimeSlot(id: string): {
        success: boolean;
    };
}
