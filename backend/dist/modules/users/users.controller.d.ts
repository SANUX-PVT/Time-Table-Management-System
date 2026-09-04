import { StoreService } from '../../store/store.service.js';
import { User } from '../../common/types.js';
export declare class UsersController {
    private store;
    constructor(store: StoreService);
    list(): User[];
    get(id: string): User | null;
    update(id: string, body: Partial<User>): User;
}
