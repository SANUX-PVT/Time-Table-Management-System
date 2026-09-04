import { Body, Controller, Get, NotFoundException, Param, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import { User } from '../../common/types.js';

@Controller('api/users')
export class UsersController {
  constructor(private store: StoreService) {}

  @Get()
  list() {
    return this.store.users;
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.store.users.find((u) => u.id === id) ?? null;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<User>) {
    const user = this.store.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException();
    Object.assign(user, body);
    this.store.addAudit('USER_UPDATED', 'Admin User', `User "${user.name}" role/access updated.`);
    return user;
  }
}
