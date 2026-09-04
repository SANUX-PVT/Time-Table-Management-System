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
import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let NotificationsController = class NotificationsController {
    store;
    constructor(store) {
        this.store = store;
    }
    list(role) {
        let list = this.store.notifications;
        if (role)
            list = list.filter((n) => !n.toRole || n.toRole === role);
        return list;
    }
    markRead(id) {
        const n = this.store.notifications.find((x) => x.id === id);
        if (n)
            n.read = true;
        return n ?? null;
    }
};
__decorate([
    Get(),
    __param(0, Query('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "list", null);
__decorate([
    Post(':id/read'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markRead", null);
NotificationsController = __decorate([
    Controller('api/notifications'),
    __metadata("design:paramtypes", [StoreService])
], NotificationsController);
export { NotificationsController };
//# sourceMappingURL=notifications.controller.js.map