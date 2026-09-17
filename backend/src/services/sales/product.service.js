'use strict';

const { v } = require('../../utils/sales/validate');
const { ValidationError, NotFoundError } = require('../../utils/sales/errors');
const { INVALID_QUERY_MESSAGE, fieldIssues } = require('../../utils/sales/request');
const productRepository = require('../../repositories/sales/product.repository');

/**
 * Product service (ported from PH1 `services/product.service.ts`).
 */

const productStatusEnum = v.enum(['dang_ban', 'ngung_ban', 'mau_moi']);

const productQuerySchema = v
  .object({
    page: v.coerce.number().int('Số trang phải là số nguyên').min(1, 'Số trang tối thiểu là 1').default(1),
    pageSize: v.coerce
      .number()
      .int('Kích thước trang phải là số nguyên')
      .min(1, 'Kích thước trang tối thiểu là 1')
      .max(100, 'Kích thước trang tối đa là 100')
      .default(20),
    search: v.string().trim().max(100, 'Từ khóa tìm kiếm tối đa 100 ký tự').optional(),
    size: v.string().trim().max(20, 'Size tối đa 20 ký tự').optional(),
    mau_sac: v.string().trim().max(50, 'Màu sắc tối đa 50 ký tự').optional(),
    trang_thai: productStatusEnum.optional(),
    sortBy: v.string().trim().max(64, 'Cột sắp xếp không hợp lệ').optional(),
    sortOrder: v.enum(['ASC', 'DESC'], 'Thứ tự sắp xếp không hợp lệ').default('ASC'),
  })

async function listProducts(queryFilters) {
  const parsed = productQuerySchema.safeParse(queryFilters);
  if (!parsed.success) {
    throw new ValidationError(INVALID_QUERY_MESSAGE, fieldIssues(parsed.error.errors));
  }
  return productRepository.list(parsed.data);
}

async function getProductById(id) {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new NotFoundError('PRODUCT_NOT_FOUND', `Không tìm thấy sản phẩm có ID ${id}.`);
  }
  return product;
}

async function getProductByCode(code) {
  const product = await productRepository.findByCode(code);
  if (!product) {
    throw new NotFoundError('PRODUCT_NOT_FOUND', `Không tìm thấy sản phẩm có mã ${code}.`);
  }
  return product;
}

module.exports = {
  productStatusEnum,
  productQuerySchema,
  listProducts,
  getProductById,
  getProductByCode,
  productService: {
    listProducts,
    getProductById,
    getProductByCode,
  },
};
