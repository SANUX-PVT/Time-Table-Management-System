import { Module } from '@nestjs/common';
import { TermsController } from './terms.controller.js';

@Module({ controllers: [TermsController] })
export class TermsModule {}
