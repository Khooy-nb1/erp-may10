'use strict';

const { v } = require('../../utils/sales/validate');
const { ValidationError } = require('../../utils/sales/errors');
const receivableRepository = require('../../repositories/sales/receivable.repository');

/**
 * Receivable service (ported from PH1 `services/receivable.service.ts`).
 *
 * Read-only: the module exposes summaries, aging buckets and the filtered list.
 * Settlements belong to Finance (`accounting.receivable`), see ruling R-2.
 */

const receivableStatusEnum = v.enum(['chua_thanh_toan', 'mot_phan', 'da_thanh_toan', 'qua_han']);

const receivableQuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  pageSize: v.coerce.number().int().min(1).max(100).default(20),
  search: v.string().optional(),
  ma_khach_hang: v.coerce.number().int().positive().optional(),
  ma_hoa_don: v.coerce.number().int().positive().optional(),
  trang_thai: receivableStatusEnum.optional(),
  dueFromDate: v.string().optional(),
  dueToDate: v.string().optional(),
  overdueOnly: v.coerce.boolean().optional(),
  sortBy: v.string().optional(),
  sortOrder: v.enum(['ASC', 'DESC']).default('DESC'),
});

const receivableSummaryQuerySchema = v.object({
  ma_khach_hang: v.coerce.number().int().positive().optional(),
});

function invalidQuery(issues) {
  return new ValidationError('Validation failed for one or more query parameters.', issues);
}

async function listReceivables(queryFilters) {
  const parsed = receivableQuerySchema.safeParse(queryFilters);
  if (!parsed.success) {
    throw invalidQuery(parsed.error.errors);
  }
  return receivableRepository.list(parsed.data);
}

async function getSummary(customerId) {
  return receivableRepository.getSummary(customerId);
}

async function getSummaryForQuery(rawQuery) {
  const parsed = receivableSummaryQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw invalidQuery(parsed.error.errors);
  }
  return receivableRepository.getSummary(parsed.data.ma_khach_hang);
}

async function getAgingReport() {
  return receivableRepository.getAgingReport();
}

async function getCustomerReceivables(customerId, filters = {}) {
  return listReceivables({
    ...filters,
    ma_khach_hang: customerId,
  });
}

module.exports = {
  receivableStatusEnum,
  receivableQuerySchema,
  receivableSummaryQuerySchema,
  listReceivables,
  getSummary,
  getSummaryForQuery,
  getAgingReport,
  getCustomerReceivables,
  receivableService: {
    listReceivables,
    getSummary,
    getSummaryForQuery,
    getAgingReport,
    getCustomerReceivables,
  },
};
