import { StoreService } from '../../store/store.service.js';
export declare class DashboardController {
    private store;
    constructor(store: StoreService);
    summary(date?: string): {
        date: string;
        teachers: {
            present: number;
            absent: number;
            pending: number;
            total: number;
        };
        lessons: {
            scheduled: number;
            completed: number;
            inProgress: number;
        };
        relief: {
            required: number;
            assigned: number;
            pending: number;
        };
        alerts: {
            level: "red" | "yellow" | "green";
            message: string;
        }[];
    };
}
