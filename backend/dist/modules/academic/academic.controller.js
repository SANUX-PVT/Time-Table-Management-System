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
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
let AcademicController = class AcademicController {
    store;
    constructor(store) {
        this.store = store;
    }
    listGrades() {
        return this.store.grades;
    }
    createGrade(body) {
        const grade = {
            id: this.store.id(),
            name: body.name ?? 'New Grade',
            order: body.order ?? this.store.grades.length + 1,
            active: body.active ?? true,
            headTeacherId: body.headTeacherId,
        };
        this.store.grades.push(grade);
        this.store.addAudit('GRADE_CREATED', 'Admin User', `Grade "${grade.name}" created.`);
        return grade;
    }
    updateGrade(id, body) {
        const grade = this.store.grades.find((g) => g.id === id);
        if (!grade)
            throw new NotFoundException();
        Object.assign(grade, body);
        this.store.addAudit('GRADE_UPDATED', 'Admin User', `Grade "${grade.name}" updated.`);
        return grade;
    }
    deleteGrade(id) {
        const grade = this.store.grades.find((g) => g.id === id);
        if (!grade)
            throw new NotFoundException();
        if (this.store.classes.some((c) => c.gradeId === id)) {
            throw new BadRequestException('Cannot delete: this grade still has classes assigned to it.');
        }
        this.store.grades = this.store.grades.filter((g) => g.id !== id);
        this.store.gradeSubjects = this.store.gradeSubjects.filter((g) => g.gradeId !== id);
        this.store.addAudit('GRADE_DELETED', 'Admin User', `Grade "${grade.name}" deleted.`);
        return { success: true };
    }
    listClasses() {
        return this.store.classes;
    }
    createClass(body) {
        const cls = {
            id: this.store.id(),
            name: body.name ?? 'New Class',
            gradeId: body.gradeId,
            classTeacherId: body.classTeacherId,
            roomId: body.roomId,
            studentCount: body.studentCount ?? 0,
        };
        this.store.classes.push(cls);
        this.store.addAudit('CLASS_CREATED', 'Admin User', `Class "${cls.name}" created.`);
        return cls;
    }
    updateClass(id, body) {
        const cls = this.store.classes.find((c) => c.id === id);
        if (!cls)
            throw new NotFoundException();
        Object.assign(cls, body);
        this.store.addAudit('CLASS_UPDATED', 'Admin User', `Class "${cls.name}" updated.`);
        return cls;
    }
    deleteClass(id) {
        const cls = this.store.classes.find((c) => c.id === id);
        if (!cls)
            throw new NotFoundException();
        if (this.store.masterTimetable.some((m) => m.classId === id)) {
            throw new BadRequestException('Cannot delete: this class still has lessons in the master timetable.');
        }
        this.store.classes = this.store.classes.filter((c) => c.id !== id);
        this.store.addAudit('CLASS_DELETED', 'Admin User', `Class "${cls.name}" deleted.`);
        return { success: true };
    }
    listSubjects() {
        return this.store.subjects;
    }
    createSubject(body) {
        const subject = {
            id: this.store.id(),
            name: body.name ?? 'New Subject',
            code: body.code ?? 'SUBJ',
            requiresSpecialRoom: body.requiresSpecialRoom ?? false,
            allowConsecutive: body.allowConsecutive ?? false,
        };
        this.store.subjects.push(subject);
        this.store.addAudit('SUBJECT_CREATED', 'Admin User', `Subject "${subject.name}" created.`);
        return subject;
    }
    updateSubject(id, body) {
        const subject = this.store.subjects.find((s) => s.id === id);
        if (!subject)
            throw new NotFoundException();
        Object.assign(subject, body);
        return subject;
    }
    deleteSubject(id) {
        const subject = this.store.subjects.find((s) => s.id === id);
        if (!subject)
            throw new NotFoundException();
        if (this.store.gradeSubjects.some((g) => g.subjectId === id) || this.store.masterTimetable.some((m) => m.subjectId === id)) {
            throw new BadRequestException('Cannot delete: this subject is still allocated to a grade or scheduled in the master timetable.');
        }
        this.store.subjects = this.store.subjects.filter((s) => s.id !== id);
        this.store.addAudit('SUBJECT_DELETED', 'Admin User', `Subject "${subject.name}" deleted.`);
        return { success: true };
    }
    listGradeSubjects() {
        return this.store.gradeSubjects;
    }
    createGradeSubject(body) {
        const gsc = {
            id: this.store.id(),
            gradeId: body.gradeId,
            subjectId: body.subjectId,
            periodsPerWeek: body.periodsPerWeek ?? 1,
            maxPeriodsPerDay: body.maxPeriodsPerDay ?? 1,
        };
        this.store.gradeSubjects.push(gsc);
        return gsc;
    }
    updateGradeSubject(id, body) {
        const gsc = this.store.gradeSubjects.find((g) => g.id === id);
        if (!gsc)
            throw new NotFoundException();
        Object.assign(gsc, body);
        return gsc;
    }
    deleteGradeSubject(id) {
        this.store.gradeSubjects = this.store.gradeSubjects.filter((g) => g.id !== id);
        return { success: true };
    }
    listRooms() {
        return this.store.rooms;
    }
    createRoom(body) {
        const room = {
            id: this.store.id(),
            name: body.name ?? 'New Room',
            type: body.type ?? 'CLASSROOM',
            capacity: body.capacity ?? 30,
        };
        this.store.rooms.push(room);
        return room;
    }
    updateRoom(id, body) {
        const room = this.store.rooms.find((r) => r.id === id);
        if (!room)
            throw new NotFoundException();
        Object.assign(room, body);
        return room;
    }
    deleteRoom(id) {
        const room = this.store.rooms.find((r) => r.id === id);
        if (!room)
            throw new NotFoundException();
        if (this.store.classes.some((c) => c.roomId === id) || this.store.masterTimetable.some((m) => m.roomId === id)) {
            throw new BadRequestException('Cannot delete: this room is still assigned to a class or scheduled in the master timetable.');
        }
        this.store.rooms = this.store.rooms.filter((r) => r.id !== id);
        this.store.addAudit('ROOM_DELETED', 'Admin User', `Room "${room.name}" deleted.`);
        return { success: true };
    }
};
__decorate([
    Get('grades'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "listGrades", null);
__decorate([
    Post('grades'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "createGrade", null);
__decorate([
    Put('grades/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "updateGrade", null);
__decorate([
    Delete('grades/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "deleteGrade", null);
__decorate([
    Get('classes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "listClasses", null);
__decorate([
    Post('classes'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "createClass", null);
__decorate([
    Put('classes/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "updateClass", null);
__decorate([
    Delete('classes/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "deleteClass", null);
__decorate([
    Get('subjects'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "listSubjects", null);
__decorate([
    Post('subjects'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "createSubject", null);
__decorate([
    Put('subjects/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "updateSubject", null);
__decorate([
    Delete('subjects/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "deleteSubject", null);
__decorate([
    Get('grade-subjects'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "listGradeSubjects", null);
__decorate([
    Post('grade-subjects'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "createGradeSubject", null);
__decorate([
    Put('grade-subjects/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "updateGradeSubject", null);
__decorate([
    Delete('grade-subjects/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "deleteGradeSubject", null);
__decorate([
    Get('rooms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "listRooms", null);
__decorate([
    Post('rooms'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "createRoom", null);
__decorate([
    Put('rooms/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "updateRoom", null);
__decorate([
    Delete('rooms/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AcademicController.prototype, "deleteRoom", null);
AcademicController = __decorate([
    Controller('api/academic'),
    __metadata("design:paramtypes", [StoreService])
], AcademicController);
export { AcademicController };
//# sourceMappingURL=academic.controller.js.map