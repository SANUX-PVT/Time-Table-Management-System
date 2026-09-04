import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { StudentGroup } from '../../common/types.js';

@Controller('api/groups')
export class GroupsController {
  constructor(private store: StoreService) {}

  @Get()
  list() {
    return this.store.studentGroups;
  }

  @Post()
  create(@Body() body: Partial<StudentGroup>) {
    if (!body.name || !body.subjectId || !body.memberClassIds?.length) {
      throw new BadRequestException('name, subjectId and at least one member class are required.');
    }
    const group: StudentGroup = {
      id: this.store.id(),
      name: body.name,
      subjectId: body.subjectId,
      memberClassIds: body.memberClassIds,
    };
    this.store.studentGroups.push(group);
    this.store.addAudit('STUDENT_GROUP_CREATED', 'Admin User', `Student group "${group.name}" created with ${group.memberClassIds.length} member classes.`);
    return group;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<StudentGroup>) {
    const group = this.store.studentGroups.find((g) => g.id === id);
    if (!group) throw new NotFoundException();
    Object.assign(group, body, { id: group.id });
    return group;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const inUse = this.store.masterTimetable.some((e) => e.groupId === id);
    if (inUse) throw new BadRequestException('This group has scheduled lessons — remove them from the Master Timetable first.');
    this.store.studentGroups = this.store.studentGroups.filter((g) => g.id !== id);
    return { success: true };
  }
}
