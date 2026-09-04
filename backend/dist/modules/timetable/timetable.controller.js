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
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import { LESSON_LIKE_TYPES } from '../../common/types.js';
let TimetableController = class TimetableController {
    store;
    constructor(store) {
        this.store = store;
    }
    listMaster(classId, day) {
        let entries = this.store.masterTimetable;
        if (classId)
            entries = entries.filter((e) => e.classId === classId);
        if (day)
            entries = entries.filter((e) => e.day === day);
        return entries;
    }
    versions() {
        return this.store.timetableVersions;
    }
    conflictCheck(entry, ignoreId) {
        const clashes = this.store.masterTimetable.filter((e) => e.id !== ignoreId &&
            e.day === entry.day &&
            e.periodId === entry.periodId &&
            ((entry.teacherId && e.teacherId === entry.teacherId) ||
                e.classId === entry.classId ||
                (entry.roomId && e.roomId === entry.roomId)));
        return clashes;
    }
    availabilityConflict(entry) {
        if (!entry.teacherId || !entry.day || !entry.periodId)
            return null;
        const teacher = this.store.teachers.find((t) => t.id === entry.teacherId);
        if (!teacher)
            return null;
        const unavailable = teacher.unavailable.some((u) => u.day === entry.day && u.periodId === entry.periodId);
        return unavailable ? teacher : null;
    }
    create(body) {
        if (!body.day || !body.periodId || !body.classId || !body.type) {
            throw new BadRequestException('day, periodId, classId and type are required');
        }
        const needsSubjectTeacher = LESSON_LIKE_TYPES.includes(body.type);
        if (needsSubjectTeacher && (!body.subjectId || !body.teacherId)) {
            throw new BadRequestException('Subject and teacher are required for lesson/activity periods.');
        }
        const clashes = this.conflictCheck(body);
        if (clashes.length) {
            throw new BadRequestException({
                message: 'Timetable conflict detected',
                clashes,
            });
        }
        const unavailableTeacher = this.availabilityConflict(body);
        if (unavailableTeacher) {
            throw new BadRequestException(`${unavailableTeacher.name} has declared themselves unavailable during this period.`);
        }
        if (body.directPublish === false) {
            return this.queuePendingChange(undefined, body, body.proposedBy ?? 'Unknown');
        }
        const entry = {
            id: this.store.id(),
            day: body.day,
            periodId: body.periodId,
            classId: body.classId,
            type: body.type,
            subjectId: needsSubjectTeacher ? body.subjectId : undefined,
            teacherId: needsSubjectTeacher ? body.teacherId : undefined,
            roomId: body.roomId,
            locked: body.locked ?? false,
        };
        this.store.masterTimetable.push(entry);
        this.store.addAudit('MASTER_ENTRY_CREATED', body.proposedBy ?? 'Admin User', `Timetable entry created for ${entry.day}.`);
        return entry;
    }
    update(id, body) {
        const entry = this.store.masterTimetable.find((e) => e.id === id);
        if (!entry)
            throw new NotFoundException();
        if (entry.locked && body.locked !== false) {
            throw new BadRequestException('Entry is locked. Unlock before editing.');
        }
        const merged = { ...entry, ...body };
        const needsSubjectTeacher = LESSON_LIKE_TYPES.includes(merged.type);
        if (needsSubjectTeacher && (!merged.subjectId || !merged.teacherId)) {
            throw new BadRequestException('Subject and teacher are required for lesson/activity periods.');
        }
        if (!needsSubjectTeacher) {
            merged.subjectId = undefined;
            merged.teacherId = undefined;
        }
        const clashes = this.conflictCheck(merged, id);
        if (clashes.length) {
            throw new BadRequestException({
                message: 'Timetable conflict detected',
                clashes,
            });
        }
        const unavailableTeacher = this.availabilityConflict(merged);
        if (unavailableTeacher) {
            throw new BadRequestException(`${unavailableTeacher.name} has declared themselves unavailable during this period.`);
        }
        if (body.directPublish === false) {
            return this.queuePendingChange(id, body, body.proposedBy ?? 'Unknown');
        }
        Object.assign(entry, merged);
        this.store.addAudit('MASTER_ENTRY_UPDATED', body.proposedBy ?? 'Admin User', `Timetable entry updated (${entry.day}).`);
        return entry;
    }
    queuePendingChange(entryId, proposedChange, proposedBy) {
        const { directPublish, proposedBy: _pb, ...change } = proposedChange;
        const pending = {
            id: this.store.id(),
            entryId,
            proposedBy,
            proposedChange: change,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };
        this.store.pendingTimetableChanges.push(pending);
        this.store.addAudit('TIMETABLE_CHANGE_SUBMITTED', proposedBy, `Submitted a master timetable change for approval (${entryId ? 'edit' : 'new entry'}).`);
        return { pending: true, change: pending };
    }
    listPending() {
        return this.store.pendingTimetableChanges.filter((c) => c.status === 'PENDING');
    }
    decidePending(id, body) {
        const change = this.store.pendingTimetableChanges.find((c) => c.id === id);
        if (!change)
            throw new NotFoundException();
        if (change.status !== 'PENDING')
            throw new BadRequestException('This change has already been decided.');
        change.status = body.approve ? 'APPROVED' : 'REJECTED';
        change.decidedAt = new Date().toISOString();
        change.decidedBy = body.decidedBy;
        if (body.approve) {
            if (change.entryId) {
                const entry = this.store.masterTimetable.find((e) => e.id === change.entryId);
                if (entry)
                    Object.assign(entry, change.proposedChange);
            }
            else {
                this.store.masterTimetable.push({ ...change.proposedChange, id: this.store.id() });
            }
        }
        this.store.addAudit('TIMETABLE_CHANGE_DECIDED', body.decidedBy, `${body.decidedBy} ${body.approve ? 'approved' : 'rejected'} a master timetable change proposed by ${change.proposedBy}.`);
        return change;
    }
    createGroupLesson(body) {
        if (!body.day || !body.periodId || !body.groupId || !body.teacherId) {
            throw new BadRequestException('day, periodId, groupId and teacherId are required.');
        }
        const group = this.store.studentGroups.find((g) => g.id === body.groupId);
        if (!group)
            throw new NotFoundException('Student group not found');
        if (!group.memberClassIds.length)
            throw new BadRequestException('This group has no member classes.');
        for (const classId of group.memberClassIds) {
            const clashes = this.conflictCheck({ day: body.day, periodId: body.periodId, classId, teacherId: body.teacherId, roomId: body.roomId });
            if (clashes.length) {
                const cls = this.store.classes.find((c) => c.id === classId);
                throw new BadRequestException(`Conflict scheduling ${group.name}: ${cls?.name} already has something in this period.`);
            }
        }
        const unavailableTeacher = this.availabilityConflict({ day: body.day, periodId: body.periodId, teacherId: body.teacherId });
        if (unavailableTeacher) {
            throw new BadRequestException(`${unavailableTeacher.name} has declared themselves unavailable during this period.`);
        }
        const entries = group.memberClassIds.map((classId) => ({
            id: this.store.id(),
            day: body.day,
            periodId: body.periodId,
            classId,
            type: 'LESSON',
            subjectId: group.subjectId,
            teacherId: body.teacherId,
            roomId: body.roomId,
            locked: body.locked ?? false,
            groupId: group.id,
        }));
        this.store.masterTimetable.push(...entries);
        this.store.addAudit('GROUP_LESSON_CREATED', 'Admin User', `Group lesson "${group.name}" scheduled on ${body.day} across ${group.memberClassIds.length} classes.`);
        return entries;
    }
    removeGroupLesson(groupId, day, periodId) {
        const before = this.store.masterTimetable.length;
        this.store.masterTimetable = this.store.masterTimetable.filter((e) => !(e.groupId === groupId && e.day === day && e.periodId === periodId));
        const removed = before - this.store.masterTimetable.length;
        this.store.addAudit('GROUP_LESSON_REMOVED', 'Admin User', `Group lesson removed from ${day} (${removed} class legs).`);
        return { removed };
    }
    remove(id) {
        const entry = this.store.masterTimetable.find((e) => e.id === id);
        if (entry?.locked)
            throw new BadRequestException('Entry is locked.');
        this.store.masterTimetable = this.store.masterTimetable.filter((e) => e.id !== id);
        return { success: true };
    }
    validate() {
        const issues = [];
        const seen = new Map();
        for (const e of this.store.masterTimetable) {
            for (const dim of ['teacherId', 'classId', 'roomId']) {
                const val = e[dim];
                if (!val)
                    continue;
                const key = `${dim}|${e.day}|${e.periodId}|${val}`;
                if (!seen.has(key))
                    seen.set(key, []);
                seen.get(key).push(e);
            }
        }
        for (const [key, entries] of seen) {
            const allSameGroup = entries.length > 1 && entries.every((e) => e.groupId && e.groupId === entries[0].groupId);
            if (entries.length > 1 && !allSameGroup) {
                issues.push({
                    level: 'error',
                    message: `Conflict: ${entries.length} entries clash on ${key}`,
                });
            }
        }
        for (const cls of this.store.classes) {
            const grade = this.store.grades.find((g) => g.id === cls.gradeId);
            const configs = this.store.gradeSubjects.filter((g) => g.gradeId === cls.gradeId);
            for (const conf of configs) {
                const actual = this.store.masterTimetable.filter((e) => e.classId === cls.id && e.subjectId === conf.subjectId).length;
                if (actual < conf.periodsPerWeek) {
                    const subject = this.store.subjects.find((s) => s.id === conf.subjectId);
                    issues.push({
                        level: 'warning',
                        message: `${cls.name} (${grade?.name}): ${subject?.name} has ${actual}/${conf.periodsPerWeek} periods/week scheduled.`,
                    });
                }
            }
        }
        for (const teacher of this.store.teachers) {
            const count = this.store.masterTimetable.filter((e) => e.teacherId === teacher.id).length;
            if (count > teacher.maxPeriodsPerWeek) {
                issues.push({
                    level: 'warning',
                    message: `${teacher.name} exceeds preferred weekly workload (${count}/${teacher.maxPeriodsPerWeek}).`,
                });
            }
        }
        for (const teacher of this.store.teachers) {
            if (!teacher.unavailable.length)
                continue;
            const violations = this.store.masterTimetable.filter((e) => e.teacherId === teacher.id && teacher.unavailable.some((u) => u.day === e.day && u.periodId === e.periodId));
            for (const v of violations) {
                const cls = this.store.classes.find((c) => c.id === v.classId);
                issues.push({
                    level: 'error',
                    message: `${teacher.name} is scheduled for ${cls?.name} on ${v.day} during a period they declared unavailable.`,
                });
            }
        }
        for (const teacher of this.store.teachers) {
            const byDay = new Map();
            for (const e of this.store.masterTimetable.filter((e) => e.teacherId === teacher.id)) {
                if (!byDay.has(e.day))
                    byDay.set(e.day, []);
                byDay.get(e.day).push(e);
            }
            for (const [day, dayEntries] of byDay) {
                const slotOrders = dayEntries
                    .map((e) => this.store.timeSlots.find((s) => s.id === e.periodId)?.order)
                    .filter((o) => o !== undefined)
                    .sort((a, b) => a - b);
                let run = 1;
                let maxRun = 1;
                for (let i = 1; i < slotOrders.length; i++) {
                    run = slotOrders[i] === slotOrders[i - 1] + 1 ? run + 1 : 1;
                    maxRun = Math.max(maxRun, run);
                }
                if (maxRun > teacher.maxConsecutivePeriods) {
                    issues.push({
                        level: 'warning',
                        message: `${teacher.name} has ${maxRun} consecutive periods on ${day} (limit ${teacher.maxConsecutivePeriods}).`,
                    });
                }
            }
        }
        const errors = issues.filter((i) => i.level === 'error').length;
        const warnings = issues.filter((i) => i.level === 'warning').length;
        return {
            valid: errors === 0,
            errorCount: errors,
            warningCount: warnings,
            issues,
        };
    }
    generate(body) {
        if (body.scope === 'CLASS' && !body.classId) {
            throw new BadRequestException('classId is required when scope is CLASS');
        }
        const targetClassIds = body.scope === 'ALL' ? this.store.classes.map((c) => c.id) : [body.classId];
        const invalid = targetClassIds.find((id) => !this.store.classes.some((c) => c.id === id));
        if (invalid)
            throw new NotFoundException('Class not found');
        const result = this.store.generateLessons(targetClassIds, body.mode);
        const scopeLabel = body.scope === 'ALL' ? 'the entire school' : this.store.classes.find((c) => c.id === body.classId)?.name ?? 'a class';
        this.store.addAudit('TIMETABLE_GENERATED', 'Admin User', `Auto-generated timetable for ${scopeLabel} (${body.mode === 'REGENERATE' ? 'full regenerate' : 'fill gaps'}) — ${result.created} period(s) created${result.cleared ? `, ${result.cleared} cleared first` : ''}${result.unresolved.length ? `, ${result.unresolved.length} subject requirement(s) unresolved` : ''}.`);
        return result;
    }
    copyDay(body) {
        const { classId, fromDay, toDay } = body;
        if (!classId || !fromDay || !toDay)
            throw new BadRequestException('classId, fromDay and toDay are required');
        if (fromDay === toDay)
            throw new BadRequestException('Source and target day must differ');
        const sourceEntries = this.store.masterTimetable.filter((e) => e.classId === classId && e.day === fromDay);
        const targetSlotsByLabel = new Map(this.store.timeSlots.filter((s) => s.day === toDay).map((s) => [s.label, s]));
        let copied = 0;
        const skipped = [];
        for (const src of sourceEntries) {
            const srcSlot = this.store.timeSlots.find((s) => s.id === src.periodId);
            const targetSlot = srcSlot ? targetSlotsByLabel.get(srcSlot.label) : undefined;
            if (!targetSlot) {
                skipped.push(`${srcSlot?.label ?? 'period'} (no matching slot on ${toDay})`);
                continue;
            }
            const existing = this.store.masterTimetable.find((e) => e.classId === classId && e.day === toDay && e.periodId === targetSlot.id);
            if (existing?.locked) {
                skipped.push(`${targetSlot.label} (target is locked)`);
                continue;
            }
            const candidate = {
                day: toDay,
                periodId: targetSlot.id,
                classId,
                type: src.type,
                subjectId: src.subjectId,
                teacherId: src.teacherId,
                roomId: src.roomId,
            };
            const clashes = this.conflictCheck(candidate, existing?.id);
            const unavailableTeacher = this.availabilityConflict(candidate);
            if (clashes.length || unavailableTeacher) {
                skipped.push(`${targetSlot.label} (${unavailableTeacher ? unavailableTeacher.name + ' unavailable' : 'conflict on ' + toDay})`);
                continue;
            }
            if (existing) {
                Object.assign(existing, candidate);
            }
            else {
                this.store.masterTimetable.push({ ...candidate, id: this.store.id(), locked: false });
            }
            copied += 1;
        }
        const cls = this.store.classes.find((c) => c.id === classId);
        this.store.addAudit('MASTER_DAY_COPIED', 'Admin User', `Copied ${cls?.name}'s ${fromDay} schedule to ${toDay} — ${copied} period(s) copied, ${skipped.length} skipped.`);
        return { copied, skipped };
    }
    publish(body) {
        const validation = this.validate();
        if (!validation.valid) {
            throw new BadRequestException('Cannot publish: unresolved conflicts exist.');
        }
        const version = {
            id: this.store.id(),
            version: this.store.timetableVersions.length + 1,
            status: 'PUBLISHED',
            createdAt: new Date().toISOString(),
            createdBy: 'Admin User',
            publishedAt: new Date().toISOString(),
            notes: body.notes,
            termId: this.store.currentTermId,
        };
        this.store.timetableVersions.push(version);
        this.store.addAudit('MASTER_TIMETABLE_PUBLISHED', 'Admin User', `Master timetable v${version.version} published.`);
        return version;
    }
};
__decorate([
    Get('master'),
    __param(0, Query('classId')),
    __param(1, Query('day')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "listMaster", null);
__decorate([
    Get('versions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "versions", null);
__decorate([
    Post('master'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "create", null);
__decorate([
    Put('master/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "update", null);
__decorate([
    Get('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "listPending", null);
__decorate([
    Put('pending/:id/decision'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "decidePending", null);
__decorate([
    Post('group-lesson'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "createGroupLesson", null);
__decorate([
    Delete('group-lesson/:groupId/:day/:periodId'),
    __param(0, Param('groupId')),
    __param(1, Param('day')),
    __param(2, Param('periodId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "removeGroupLesson", null);
__decorate([
    Delete('master/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "remove", null);
__decorate([
    Get('validate'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "validate", null);
__decorate([
    Post('generate'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "generate", null);
__decorate([
    Post('copy-day'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "copyDay", null);
__decorate([
    Post('publish'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TimetableController.prototype, "publish", null);
TimetableController = __decorate([
    Controller('api/timetable'),
    __metadata("design:paramtypes", [StoreService])
], TimetableController);
export { TimetableController };
//# sourceMappingURL=timetable.controller.js.map