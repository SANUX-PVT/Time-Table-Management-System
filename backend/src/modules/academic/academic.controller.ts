import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import {
  Grade,
  GradeSubjectConfig,
  Room,
  SchoolClass,
  Subject,
} from '../../common/types.js';

@Controller('api/academic')
export class AcademicController {
  constructor(private store: StoreService) {}

  // ---- Grades ----
  @Get('grades')
  listGrades() {
    return this.store.grades;
  }

  @Post('grades')
  createGrade(@Body() body: Partial<Grade>) {
    const grade: Grade = {
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

  @Put('grades/:id')
  updateGrade(@Param('id') id: string, @Body() body: Partial<Grade>) {
    const grade = this.store.grades.find((g) => g.id === id);
    if (!grade) throw new NotFoundException();
    Object.assign(grade, body);
    this.store.addAudit('GRADE_UPDATED', 'Admin User', `Grade "${grade.name}" updated.`);
    return grade;
  }

  @Delete('grades/:id')
  deleteGrade(@Param('id') id: string) {
    const grade = this.store.grades.find((g) => g.id === id);
    if (!grade) throw new NotFoundException();
    if (this.store.classes.some((c) => c.gradeId === id)) {
      throw new BadRequestException('Cannot delete: this grade still has classes assigned to it.');
    }
    this.store.grades = this.store.grades.filter((g) => g.id !== id);
    this.store.gradeSubjects = this.store.gradeSubjects.filter((g) => g.gradeId !== id);
    this.store.addAudit('GRADE_DELETED', 'Admin User', `Grade "${grade.name}" deleted.`);
    return { success: true };
  }

  // ---- Classes ----
  @Get('classes')
  listClasses() {
    return this.store.classes;
  }

  @Post('classes')
  createClass(@Body() body: Partial<SchoolClass>) {
    const cls: SchoolClass = {
      id: this.store.id(),
      name: body.name ?? 'New Class',
      gradeId: body.gradeId!,
      classTeacherId: body.classTeacherId,
      roomId: body.roomId,
      studentCount: body.studentCount ?? 0,
    };
    this.store.classes.push(cls);
    this.store.addAudit('CLASS_CREATED', 'Admin User', `Class "${cls.name}" created.`);
    return cls;
  }

  @Put('classes/:id')
  updateClass(@Param('id') id: string, @Body() body: Partial<SchoolClass>) {
    const cls = this.store.classes.find((c) => c.id === id);
    if (!cls) throw new NotFoundException();
    Object.assign(cls, body);
    this.store.addAudit('CLASS_UPDATED', 'Admin User', `Class "${cls.name}" updated.`);
    return cls;
  }

  @Delete('classes/:id')
  deleteClass(@Param('id') id: string) {
    const cls = this.store.classes.find((c) => c.id === id);
    if (!cls) throw new NotFoundException();
    if (this.store.masterTimetable.some((m) => m.classId === id)) {
      throw new BadRequestException('Cannot delete: this class still has lessons in the master timetable.');
    }
    this.store.classes = this.store.classes.filter((c) => c.id !== id);
    this.store.addAudit('CLASS_DELETED', 'Admin User', `Class "${cls.name}" deleted.`);
    return { success: true };
  }

  // ---- Subjects ----
  @Get('subjects')
  listSubjects() {
    return this.store.subjects;
  }

  @Post('subjects')
  createSubject(@Body() body: Partial<Subject>) {
    const subject: Subject = {
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

  @Put('subjects/:id')
  updateSubject(@Param('id') id: string, @Body() body: Partial<Subject>) {
    const subject = this.store.subjects.find((s) => s.id === id);
    if (!subject) throw new NotFoundException();
    Object.assign(subject, body);
    return subject;
  }

  @Delete('subjects/:id')
  deleteSubject(@Param('id') id: string) {
    const subject = this.store.subjects.find((s) => s.id === id);
    if (!subject) throw new NotFoundException();
    if (this.store.gradeSubjects.some((g) => g.subjectId === id) || this.store.masterTimetable.some((m) => m.subjectId === id)) {
      throw new BadRequestException('Cannot delete: this subject is still allocated to a grade or scheduled in the master timetable.');
    }
    this.store.subjects = this.store.subjects.filter((s) => s.id !== id);
    this.store.addAudit('SUBJECT_DELETED', 'Admin User', `Subject "${subject.name}" deleted.`);
    return { success: true };
  }

  // ---- Grade-Subject config ----
  @Get('grade-subjects')
  listGradeSubjects() {
    return this.store.gradeSubjects;
  }

  @Post('grade-subjects')
  createGradeSubject(@Body() body: Partial<GradeSubjectConfig>) {
    const gsc: GradeSubjectConfig = {
      id: this.store.id(),
      gradeId: body.gradeId!,
      subjectId: body.subjectId!,
      periodsPerWeek: body.periodsPerWeek ?? 1,
      maxPeriodsPerDay: body.maxPeriodsPerDay ?? 1,
    };
    this.store.gradeSubjects.push(gsc);
    return gsc;
  }

  @Put('grade-subjects/:id')
  updateGradeSubject(@Param('id') id: string, @Body() body: Partial<GradeSubjectConfig>) {
    const gsc = this.store.gradeSubjects.find((g) => g.id === id);
    if (!gsc) throw new NotFoundException();
    Object.assign(gsc, body);
    return gsc;
  }

  @Delete('grade-subjects/:id')
  deleteGradeSubject(@Param('id') id: string) {
    this.store.gradeSubjects = this.store.gradeSubjects.filter((g) => g.id !== id);
    return { success: true };
  }

  // ---- Rooms ----
  @Get('rooms')
  listRooms() {
    return this.store.rooms;
  }

  @Post('rooms')
  createRoom(@Body() body: Partial<Room>) {
    const room: Room = {
      id: this.store.id(),
      name: body.name ?? 'New Room',
      type: body.type ?? 'CLASSROOM',
      capacity: body.capacity ?? 30,
    };
    this.store.rooms.push(room);
    return room;
  }

  @Put('rooms/:id')
  updateRoom(@Param('id') id: string, @Body() body: Partial<Room>) {
    const room = this.store.rooms.find((r) => r.id === id);
    if (!room) throw new NotFoundException();
    Object.assign(room, body);
    return room;
  }

  @Delete('rooms/:id')
  deleteRoom(@Param('id') id: string) {
    const room = this.store.rooms.find((r) => r.id === id);
    if (!room) throw new NotFoundException();
    if (this.store.classes.some((c) => c.roomId === id) || this.store.masterTimetable.some((m) => m.roomId === id)) {
      throw new BadRequestException('Cannot delete: this room is still assigned to a class or scheduled in the master timetable.');
    }
    this.store.rooms = this.store.rooms.filter((r) => r.id !== id);
    this.store.addAudit('ROOM_DELETED', 'Admin User', `Room "${room.name}" deleted.`);
    return { success: true };
  }
}
