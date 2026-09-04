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
import { Body, Controller, Get, NotFoundException, Param, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let UsersController = class UsersController {
    store;
    constructor(store) {
        this.store = store;
    }
    list() {
        return this.store.users;
    }
    get(id) {
        return this.store.users.find((u) => u.id === id) ?? null;
    }
    update(id, body) {
        const user = this.store.users.find((u) => u.id === id);
        if (!user)
            throw new NotFoundException();
        Object.assign(user, body);
        this.store.addAudit('USER_UPDATED', 'Admin User', `User "${user.name}" role/access updated.`);
        return user;
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "list", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "get", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
UsersController = __decorate([
    Controller('api/users'),
    __metadata("design:paramtypes", [StoreService])
], UsersController);
export { UsersController };
//# sourceMappingURL=users.controller.js.map