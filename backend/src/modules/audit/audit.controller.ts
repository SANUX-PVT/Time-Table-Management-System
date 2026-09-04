import { Controller, Get, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';

@Controller('api/audit')
export class AuditController {
  constructor(private store: StoreService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 100;
    return this.store.auditLog.slice(0, n);
  }
}
