import { Module } from '@nestjs/common';
import { RoomBookingsController } from './room-bookings.controller.js';

@Module({ controllers: [RoomBookingsController] })
export class RoomBookingsModule {}
