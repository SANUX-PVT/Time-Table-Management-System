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
import { Body, Controller, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let TermsController = class TermsController {
    store;
    constructor(store) {
        this.store = store;
    }
    list() {
        return this.store.terms;
    }
    create(body) {
        const term = {
            id: this.store.id(),
            academicYear: body.academicYear ?? this.store.schoolConfig.academicYear,
            name: body.name ?? 'New Term',
            startDate: body.startDate ?? '',
            endDate: body.endDate ?? '',
            active: false,
        };
        this.store.terms.push(term);
        this.store.addAudit('TERM_CREATED', 'Admin User', `Term "${term.name}" (${term.academicYear}) created.`);
        return term;
    }
    update(id, body) {
        const term = this.store.terms.find((t) => t.id === id);
        if (!term)
            throw new NotFoundException();
        Object.assign(term, body, { id: term.id, active: term.active });
        return term;
    }
    activate(id) {
        const term = this.store.terms.find((t) => t.id === id);
        if (!term)
            throw new NotFoundException();
        for (const t of this.store.terms)
            t.active = t.id === id;
        this.store.currentTermId = id;
        this.store.addAudit('TERM_ACTIVATED', 'Admin User', `Switched active term to "${term.name}" (${term.academicYear}).`);
        return term;
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "update", null);
__decorate([
    Put(':id/activate'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TermsController.prototype, "activate", null);
TermsController = __decorate([
    Controller('api/terms'),
    __metadata("design:paramtypes", [StoreService])
], TermsController);
export { TermsController };
//# sourceMappingURL=terms.controller.js.map