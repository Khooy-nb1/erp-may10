import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderTotals, roundHalfUp } from './pricing.js';

describe('Pricing Calculator Unit Tests', () => {
  it('roundHalfUp rounds numbers according to standard half-up arithmetic', () => {
    assert.equal(roundHalfUp(10.555, 2), 10.56);
    assert.equal(roundHalfUp(10.554, 2), 10.55);
    assert.equal(roundHalfUp(10.5, 0), 11);
  });

  it('calculates order line totals with discount correctly', () => {
    const rawLines = [
      {
        ma_san_pham: 1,
        so_luong: 10,
        don_gia: 450000,
        ty_le_giam_gia: 5, // 5% discount
      },
      {
        ma_san_pham: 2,
        so_luong: 5,
        don_gia: 380000,
        ty_le_giam_gia: 0,
      },
    ];

    const result = calculateOrderTotals(rawLines, 0); // 0% tax

    // Line 1: 10 * 450000 = 4,500,000. Discount 5% = 225,000. Net = 4,275,000
    assert.equal(result.lines[0].grossLine, 4500000);
    assert.equal(result.lines[0].discountLine, 225000);
    assert.equal(result.lines[0].thanh_tien, 4275000);

    // Line 2: 5 * 380000 = 1,900,000. Net = 1,900,000
    assert.equal(result.lines[1].grossLine, 1900000);
    assert.equal(result.lines[1].discountLine, 0);
    assert.equal(result.lines[1].thanh_tien, 1900000);

    // Header totals
    assert.equal(result.tong_tien_hang, 6400000);
    assert.equal(result.tien_giam_gia, 225000);
    assert.equal(result.tien_thue, 0);
    assert.equal(result.tong_thanh_toan, 6175000);
  });

  it('applies configured tax rate when provided', () => {
    const rawLines = [
      {
        ma_san_pham: 1,
        so_luong: 2,
        don_gia: 500000,
        ty_le_giam_gia: 10, // Gross: 1,000,000; Discount: 100,000; Net: 900,000
      },
    ];

    // Tax rate 10% (0.10)
    const result = calculateOrderTotals(rawLines, 0.10);

    assert.equal(result.tong_tien_hang, 1000000);
    assert.equal(result.tien_giam_gia, 100000);
    assert.equal(result.tien_thue, 90000);
    assert.equal(result.tong_thanh_toan, 990000);
  });
});
