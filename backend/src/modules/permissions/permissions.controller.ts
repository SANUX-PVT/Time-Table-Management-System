import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import { PERMISSION_LABELS } from '../../common/types.js';
import type { PermissionKey, Role } from '../../common/types.js';

@Controller('api/permissions')
export class PermissionsController {
  constructor(private store: StoreService) {}

  @Get()
  get() {
    return { permissions: this.store.rolePermissions, labels: PERMISSION_LABELS };
  }

  @Put(':role')
  update(@Param('role') role: Role, @Body() body: { permissions: PermissionKey[] }) {
    this.store.rolePermissions[role] = body.permissions ?? [];
    this.store.addAudit(
      'ROLE_PERMISSIONS_UPDATED',
      'Admin User',
      `Permissions for role "${role}" updated to: ${(body.permissions ?? []).map((p) => PERMISSION_LABELS[p]).join(', ') || 'none'}.`,
    );
    return { role, permissions: this.store.rolePermissions[role] };
  }
}
