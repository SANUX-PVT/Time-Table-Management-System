import { StoreService } from '../../store/store.service.js';
import type { Term } from '../../common/types.js';
export declare class TermsController {
    private store;
    constructor(store: StoreService);
    list(): Term[];
    create(body: Partial<Term>): Term;
    update(id: string, body: Partial<Term>): Term;
    activate(id: string): Term;
}
