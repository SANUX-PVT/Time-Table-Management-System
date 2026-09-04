import { Body, Controller, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { StoreService } from '../../store/store.service.js';
import type { Term } from '../../common/types.js';

@Controller('api/terms')
export class TermsController {
  constructor(private store: StoreService) {}

  @Get()
  list() {
    return this.store.terms;
  }

  @Post()
  create(@Body() body: Partial<Term>) {
    const term: Term = {
      id: this.store.id(),
      academicYear: body.academicYear ?? this.store.schoolConfig.academicYear,
      name: body.name ?? 'New Term',
      startDate: body.startDate ?? '',
      endDate: body.endDate ?? '',
      active: false,
    };
    this.store.terms.push(term);
    this.store.addAudit('TERM_CREATED', 'Admin User', `Term "${term.name}" (${term.academicYear}) created.`);
    return term;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<Term>) {
    const term = this.store.terms.find((t) => t.id === id);
    if (!term) throw new NotFoundException();
    Object.assign(term, body, { id: term.id, active: term.active });
    return term;
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    const term = this.store.terms.find((t) => t.id === id);
    if (!term) throw new NotFoundException();
    for (const t of this.store.terms) t.active = t.id === id;
    this.store.currentTermId = id;
    this.store.addAudit('TERM_ACTIVATED', 'Admin User', `Switched active term to "${term.name}" (${term.academicYear}).`);
    return term;
  }
}
