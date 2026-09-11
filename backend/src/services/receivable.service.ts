import { z } from 'zod';
import {
  ReceivableSummary,
  AgingReport,
  ReceivableListFilters,
} from '../models/receivable.model.js';
import { IReceivableRepository, receivableRepository, ReceivableListResult } from '../repositories/receivable.repository.js';
import { ValidationError } from '../utils/errors.js';

export const receivableStatusEnum = z.enum(['chua_thanh_toan', 'mot_phan', 'da_thanh_toan', 'qua_han']);

export const receivableQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  ma_khach_hang: z.coerce.number().int().positive().optional(),
  ma_hoa_don: z.coerce.number().int().positive().optional(),
  trang_thai: receivableStatusEnum.optional(),
  dueFromDate: z.string().optional(),
  dueToDate: z.string().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export const receivableSummaryQuerySchema = z.object({
  ma_khach_hang: z.coerce.number().int().positive().optional(),
});

export class ReceivableService {
  constructor(private readonly receivableRepo: IReceivableRepository = receivableRepository) {}

  async listReceivables(queryFilters: ReceivableListFilters): Promise<ReceivableListResult> {
    const parseResult = receivableQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return this.receivableRepo.list(parseResult.data);
  }

  async getSummary(customerId?: number): Promise<ReceivableSummary> {
    return this.receivableRepo.getSummary(customerId);
  }

  async getSummaryForQuery(rawQuery: unknown): Promise<ReceivableSummary> {
    const parseResult = receivableSummaryQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return this.receivableRepo.getSummary(parseResult.data.ma_khach_hang);
  }

  async getAgingReport(): Promise<AgingReport> {
    return this.receivableRepo.getAgingReport();
  }

  async getCustomerReceivables(customerId: number, filters: ReceivableListFilters = {}): Promise<ReceivableListResult> {
    return this.listReceivables({
      ...filters,
      ma_khach_hang: customerId,
    });
  }
}

export const receivableService = new ReceivableService();
