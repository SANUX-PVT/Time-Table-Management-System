import { Module } from '@nestjs/common';
import { SwapRequestsController } from './swap-requests.controller.js';

@Module({ controllers: [SwapRequestsController] })
export class SwapRequestsModule {}
