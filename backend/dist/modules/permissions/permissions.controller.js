var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import { PERMISSION_LABELS } from '../../common/types.js';
let PermissionsController = class PermissionsController {
    store;
    constructor(store) {
        this.store = store;
    }
    get() {
        return { permissions: this.store.rolePermissions, labels: PERMISSION_LABELS };
    }
    update(role, body) {
        this.store.rolePermissions[role] = body.permissions ?? [];
        this.store.addAudit('ROLE_PERMISSIONS_UPDATED', 'Admin User', `Permissions for role "${role}" updated to: ${(body.permissions ?? []).map((p) => PERMISSION_LABELS[p]).join(', ') || 'none'}.`);
        return { role, permissions: this.store.rolePermissions[role] };
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "get", null);
__decorate([
    Put(':role'),
    __param(0, Param('role')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "update", null);
PermissionsController = __decorate([
    Controller('api/permissions'),
    __metadata("design:paramtypes", [StoreService])
], PermissionsController);
export { PermissionsController };
//# sourceMappingURL=permissions.controller.js.map