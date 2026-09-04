import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { SwapRequest } from '../../common/types.js';

@Controller('api/swap-requests')
export class SwapRequestsController {
  constructor(private store: StoreService) {}

  @Get()
  list(@Query('teacherId') teacherId?: string) {
    let list = this.store.swapRequests;
    if (teacherId) list = list.filter((s) => s.requestingTeacherId === teacherId || s.targetTeacherId === teacherId);
    return list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  @Post()
  create(@Body() body: { requestingTeacherId: string; requestingEntryId: string; targetTeacherId: string; targetEntryId: string }) {
    const { requestingTeacherId, requestingEntryId, targetTeacherId, targetEntryId } = body;
    if (!requestingTeacherId || !requestingEntryId || !targetTeacherId || !targetEntryId) {
      throw new BadRequestException('requestingTeacherId, requestingEntryId, targetTeacherId and targetEntryId are required.');
    }
    const reqEntry = this.store.masterTimetable.find((e) => e.id === requestingEntryId);
    const targetEntry = this.store.masterTimetable.find((e) => e.id === targetEntryId);
    if (!reqEntry || !targetEntry) throw new NotFoundException('Timetable entry not found');
    if (reqEntry.locked || targetEntry.locked) throw new BadRequestException('One of these periods is locked and cannot be swapped.');

    const swap: SwapRequest = {
      id: this.store.id(),
      requestingTeacherId,
      requestingEntryId,
      targetTeacherId,
      targetEntryId,
      teacherDecision: 'PENDING',
      adminDecision: 'PENDING',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.store.swapRequests.push(swap);

    const reqTeacher = this.store.teachers.find((t) => t.id === requestingTeacherId);
    const targetTeacher = this.store.teachers.find((t) => t.id === targetTeacherId);
    this.store.addAudit(
      'SWAP_REQUESTED',
      reqTeacher?.name ?? 'Unknown',
      `${reqTeacher?.name} requested a period swap with ${targetTeacher?.name}. Requires both ${targetTeacher?.name} and an administrator to agree.`,
    );
    this.store.addNotification(`${reqTeacher?.name} would like to swap a period with you.`, 'SWAP', undefined, undefined);
    this.store.addNotification(`${reqTeacher?.name} requested a period swap with ${targetTeacher?.name} — needs admin approval.`, 'SWAP', 'VICE_PRINCIPAL');
    return swap;
  }

  private applyOutcome(swap: SwapRequest) {
    if (swap.teacherDecision === 'REJECTED' || swap.adminDecision === 'REJECTED') {
      swap.status = 'REJECTED';
      swap.decidedAt = new Date().toISOString();
      return;
    }
    if (swap.teacherDecision === 'ACCEPTED' && swap.adminDecision === 'ACCEPTED') {
      const reqEntry = this.store.masterTimetable.find((e) => e.id === swap.requestingEntryId);
      const targetEntry = this.store.masterTimetable.find((e) => e.id === swap.targetEntryId);
      if (reqEntry && targetEntry) {
        const tmp = reqEntry.teacherId;
        reqEntry.teacherId = targetEntry.teacherId;
        targetEntry.teacherId = tmp;
      }
      swap.status = 'ACCEPTED';
      swap.decidedAt = new Date().toISOString();
    }
    // otherwise still waiting on one side — status stays PENDING
  }

  @Put(':id/teacher-decision')
  teacherDecide(@Param('id') id: string, @Body() body: { accept: boolean }) {
    const swap = this.store.swapRequests.find((s) => s.id === id);
    if (!swap) throw new NotFoundException();
    if (swap.status !== 'PENDING') throw new BadRequestException('This request has already been finalized.');
    if (swap.teacherDecision !== 'PENDING') throw new BadRequestException('The teacher has already decided on this request.');

    swap.teacherDecision = body.accept ? 'ACCEPTED' : 'REJECTED';
    this.applyOutcome(swap);

    const reqTeacher = this.store.teachers.find((t) => t.id === swap.requestingTeacherId);
    const targetTeacher = this.store.teachers.find((t) => t.id === swap.targetTeacherId);
    this.store.addAudit(
      'SWAP_TEACHER_DECIDED',
      targetTeacher?.name ?? 'Unknown',
      `${targetTeacher?.name} ${body.accept ? 'accepted' : 'rejected'} the swap request from ${reqTeacher?.name}.` +
        (swap.status === 'PENDING' ? ' Awaiting admin approval.' : ''),
    );
    return swap;
  }

  @Put(':id/admin-decision')
  adminDecide(@Param('id') id: string, @Body() body: { accept: boolean; decidedBy: string }) {
    const swap = this.store.swapRequests.find((s) => s.id === id);
    if (!swap) throw new NotFoundException();
    if (swap.status !== 'PENDING') throw new BadRequestException('This request has already been finalized.');
    if (swap.adminDecision !== 'PENDING') throw new BadRequestException('An administrator has already decided on this request.');

    swap.adminDecision = body.accept ? 'ACCEPTED' : 'REJECTED';
    swap.adminDecidedBy = body.decidedBy;
    this.applyOutcome(swap);

    const reqTeacher = this.store.teachers.find((t) => t.id === swap.requestingTeacherId);
    const targetTeacher = this.store.teachers.find((t) => t.id === swap.targetTeacherId);
    this.store.addAudit(
      'SWAP_ADMIN_DECIDED',
      body.decidedBy,
      `${body.decidedBy} ${body.accept ? 'approved' : 'rejected'} the swap request between ${reqTeacher?.name} and ${targetTeacher?.name}.` +
        (swap.status === 'PENDING' ? ' Awaiting the teacher\'s decision.' : ''),
    );
    return swap;
  }
}
