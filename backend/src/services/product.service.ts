import { z } from 'zod';
import { ProductRecord, ProductListFilters } from '../models/product.model.js';
import { IProductRepository, productRepository, ProductListResult } from '../repositories/product.repository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const productStatusEnum = z.enum(['dang_ban', 'ngung_ban', 'mau_moi']);

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  size: z.string().optional(),
  mau_sac: z.string().optional(),
  trang_thai: productStatusEnum.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
});

export class ProductService {
  constructor(private readonly productRepo: IProductRepository = productRepository) {}

  async listProducts(queryFilters: ProductListFilters): Promise<ProductListResult> {
    const parseResult = productQuerySchema.safeParse(queryFilters);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed for one or more query parameters.',
        parseResult.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    return this.productRepo.list(parseResult.data);
  }

  async getProductById(id: number): Promise<ProductRecord> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Không tìm thấy sản phẩm có ID ${id}.`);
    }
    return product;
  }

  async getProductByCode(code: string): Promise<ProductRecord> {
    const product = await this.productRepo.findByCode(code);
    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Không tìm thấy sản phẩm có mã ${code}.`);
    }
    return product;
  }
}

export const productService = new ProductService();
