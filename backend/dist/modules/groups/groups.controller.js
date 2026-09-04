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
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let GroupsController = class GroupsController {
    store;
    constructor(store) {
        this.store = store;
    }
    list() {
        return this.store.studentGroups;
    }
    create(body) {
        if (!body.name || !body.subjectId || !body.memberClassIds?.length) {
            throw new BadRequestException('name, subjectId and at least one member class are required.');
        }
        const group = {
            id: this.store.id(),
            name: body.name,
            subjectId: body.subjectId,
            memberClassIds: body.memberClassIds,
        };
        this.store.studentGroups.push(group);
        this.store.addAudit('STUDENT_GROUP_CREATED', 'Admin User', `Student group "${group.name}" created with ${group.memberClassIds.length} member classes.`);
        return group;
    }
    update(id, body) {
        const group = this.store.studentGroups.find((g) => g.id === id);
        if (!group)
            throw new NotFoundException();
        Object.assign(group, body, { id: group.id });
        return group;
    }
    remove(id) {
        const inUse = this.store.masterTimetable.some((e) => e.groupId === id);
        if (inUse)
            throw new BadRequestException('This group has scheduled lessons — remove them from the Master Timetable first.');
        this.store.studentGroups = this.store.studentGroups.filter((g) => g.id !== id);
        return { success: true };
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "remove", null);
GroupsController = __decorate([
    Controller('api/groups'),
    __metadata("design:paramtypes", [StoreService])
], GroupsController);
export { GroupsController };
//# sourceMappingURL=groups.controller.js.map