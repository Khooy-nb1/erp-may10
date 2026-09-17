'use strict';

const { v } = require('../../utils/sales/validate');
const { ValidationError, NotFoundError } = require('../../utils/sales/errors');
const productRepository = require('../../repositories/sales/product.repository');

/**
 * Product service (ported from PH1 `services/product.service.ts`).
 */

const productStatusEnum = v.enum(['dang_ban', 'ngung_ban', 'mau_moi']);

const productQuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  pageSize: v.coerce.number().int().min(1).max(100).default(20),
  search: v.string().optional(),
  size: v.string().optional(),
  mau_sac: v.string().optional(),
  trang_thai: productStatusEnum.optional(),
  sortBy: v.string().optional(),
  sortOrder: v.enum(['ASC', 'DESC']).default('ASC'),
});

async function listProducts(queryFilters) {
  const parsed = productQuerySchema.safeParse(queryFilters);
  if (!parsed.success) {
    throw new ValidationError(
      'Validation failed for one or more query parameters.',
      parsed.error.errors
    );
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
