import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ProductService } from './product.service.js';
import { IProductRepository, ProductListResult } from '../repositories/product.repository.js';
import { ProductRecord, ProductListFilters } from '../models/product.model.js';
import { NotFoundError } from '../utils/errors.js';

describe('ProductService Unit Tests', () => {
  let mockProducts: ProductRecord[];
  let mockRepo: IProductRepository;
  let service: ProductService;

  before(() => {
    mockProducts = [
      {
        id: 1,
        ma_san_pham: 'SP-AO-NAM-01',
        ten_san_pham: 'Áo Sơ Mi Nam Tay Dài Cao Cấp',
        mo_ta: '100% Cotton, màu trắng',
        ma_don_vi_tinh: 1,
        ten_don_vi: 'Cái',
        gia_ban: 450000,
        size: 'L',
        mau_sac: 'Trắng',
        trang_thai: 'dang_ban',
      },
      {
        id: 2,
        ma_san_pham: 'SP-AO-NAM-02',
        ten_san_pham: 'Áo Sơ Mi Nam Tay Ngắn Hè',
        mo_ta: 'Vải Kate thoáng mát, màu xanh',
        ma_don_vi_tinh: 1,
        ten_don_vi: 'Cái',
        gia_ban: 380000,
        size: 'M',
        mau_sac: 'Xanh pastel',
        trang_thai: 'dang_ban',
      },
      {
        id: 3,
        ma_san_pham: 'SP-AO-CU-03',
        ten_san_pham: 'Áo Khoác Gió Ngừng Bán',
        mo_ta: 'Sản phẩm ngưng sản xuất',
        ma_don_vi_tinh: 1,
        ten_don_vi: 'Cái',
        gia_ban: 500000,
        size: 'XL',
        mau_sac: 'Đen',
        trang_thai: 'ngung_ban',
      },
    ];

    mockRepo = {
      list: async (filters: ProductListFilters): Promise<ProductListResult> => {
        let list = [...mockProducts];

        // Default to dang_ban if not specified
        const targetStatus = filters.trang_thai || 'dang_ban';
        list = list.filter((p) => p.trang_thai === targetStatus);

        if (filters.search) {
          const q = filters.search.toLowerCase();
          list = list.filter(
            (p) => p.ma_san_pham.toLowerCase().includes(q) || p.ten_san_pham.toLowerCase().includes(q)
          );
        }
        if (filters.size) {
          list = list.filter((p) => p.size === filters.size);
        }
        if (filters.mau_sac) {
          list = list.filter((p) => p.mau_sac === filters.mau_sac);
        }

        return {
          products: list,
          total: list.length,
          page: filters.page || 1,
          pageSize: filters.pageSize || 20,
          totalPages: 1,
        };
      },
      findById: async (id: number) => mockProducts.find((p) => p.id === id) || null,
      findByCode: async (code: string) => mockProducts.find((p) => p.ma_san_pham === code) || null,
    };

    service = new ProductService(mockRepo);
  });

  it('listProducts defaults to dang_ban and excludes ngung_ban products', async () => {
    const res = await service.listProducts({});
    assert.equal(res.total, 2);
    assert.ok(res.products.every((p) => p.trang_thai === 'dang_ban'));
    assert.equal(res.products.some((p) => p.ma_san_pham === 'SP-AO-CU-03'), false);
  });

  it('listProducts searches by code or name', async () => {
    const res = await service.listProducts({ search: 'Tay Ngắn' });
    assert.equal(res.total, 1);
    assert.equal(res.products[0].ma_san_pham, 'SP-AO-NAM-02');
  });

  it('listProducts filters by size and color', async () => {
    const res = await service.listProducts({ size: 'L', mau_sac: 'Trắng' });
    assert.equal(res.total, 1);
    assert.equal(res.products[0].ma_san_pham, 'SP-AO-NAM-01');
  });

  it('getProductById returns product with unit name and without cost price (gia_von)', async () => {
    const p = await service.getProductById(1);
    assert.equal(p.ma_san_pham, 'SP-AO-NAM-01');
    assert.equal(p.ten_don_vi, 'Cái');
    assert.equal('gia_von' in (p as Record<string, unknown>), false, 'Cost price must not be leaked');
  });

  it('getProductById throws NotFoundError on non-existent product', async () => {
    await assert.rejects(
      async () => {
        await service.getProductById(9999);
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.code, 'PRODUCT_NOT_FOUND');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });
});
