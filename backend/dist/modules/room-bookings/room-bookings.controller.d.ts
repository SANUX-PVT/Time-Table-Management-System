import { StoreService } from '../../store/store.service.js';
import type { RoomBooking } from '../../common/types.js';
export declare class RoomBookingsController {
    private store;
    constructor(store: StoreService);
    list(roomId?: string, date?: string): RoomBooking[];
    create(body: Partial<RoomBooking>): RoomBooking;
    cancel(id: string): {
        success: boolean;
    };
}
