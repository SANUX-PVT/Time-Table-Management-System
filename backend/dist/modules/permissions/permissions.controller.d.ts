import { StoreService } from '../../store/store.service.js';
import type { PermissionKey, Role } from '../../common/types.js';
export declare class PermissionsController {
    private store;
    constructor(store: StoreService);
    get(): {
        permissions: import("../../common/types.js").RolePermissions;
        labels: Record<PermissionKey, string>;
    };
    update(role: Role, body: {
        permissions: PermissionKey[];
    }): {
        role: Role;
        permissions: PermissionKey[];
    };
}
