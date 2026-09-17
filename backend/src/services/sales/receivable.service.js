'use strict';

const { v } = require('../../utils/sales/validate');
const { ValidationError } = require('../../utils/sales/errors');
const { INVALID_QUERY_MESSAGE, fieldIssues } = require('../../utils/sales/request');
const receivableRepository = require('../../repositories/sales/receivable.repository');

/**
 * Receivable service (ported from PH1 `services/receivable.service.ts`).
 *
 * Read-only: the module exposes summaries, aging buckets and the filtered list.
 * Settlements belong to Finance (`accounting.receivable`), see ruling R-2.
 */

const receivableStatusEnum = v.enum(['chua_thanh_toan', 'mot_phan', 'da_thanh_toan', 'qua_han']);

const receivableQuerySchema = v
  .object({
    page: v.coerce.number().int('Số trang phải là số nguyên').min(1, 'Số trang tối thiểu là 1').default(1),
    pageSize: v.coerce
      .number()
      .int('Kích thước trang phải là số nguyên')
      .min(1, 'Kích thước trang tối thiểu là 1')
      .max(100, 'Kích thước trang tối đa là 100')
      .default(20),
    search: v.string().trim().max(100, 'Từ khóa tìm kiếm tối đa 100 ký tự').optional(),
    ma_khach_hang: v.coerce.number().int().positive('Mã khách hàng không hợp lệ').optional(),
    ma_hoa_don: v.coerce.number().int().positive('Mã hóa đơn không hợp lệ').optional(),
    trang_thai: receivableStatusEnum.optional(),
    dueFromDate: v.dateISO('Ngày đáo hạn bắt đầu không đúng định dạng (YYYY-MM-DD)').optional(),
    dueToDate: v.dateISO('Ngày đáo hạn kết thúc không đúng định dạng (YYYY-MM-DD)').optional(),
    overdueOnly: v.coerce.boolean().optional(),
    sortBy: v.string().trim().max(64, 'Cột sắp xếp không hợp lệ').optional(),
    sortOrder: v.enum(['ASC', 'DESC'], 'Thứ tự sắp xếp không hợp lệ').default('DESC'),
  })
  .refine((data) => !data.dueFromDate || !data.dueToDate || data.dueFromDate <= data.dueToDate, {
    message: 'Ngày đáo hạn kết thúc không được trước ngày bắt đầu',
    path: ['dueToDate'],
  });

const receivableSummaryQuerySchema = v
  .object({
    ma_khach_hang: v.coerce.number().int().positive('Mã khách hàng không hợp lệ').optional(),
  })

function invalidQuery(issues) {
  return new ValidationError(INVALID_QUERY_MESSAGE, fieldIssues(issues));
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
