import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private store: StoreService) {}

  @Get()
  list(@Query('role') role?: string) {
    let list = this.store.notifications;
    if (role) list = list.filter((n) => !n.toRole || n.toRole === role);
    return list;
  }

  @Post(':id/read')
  markRead(@Param('id') id: string) {
    const n = this.store.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return n ?? null;
  }
}
