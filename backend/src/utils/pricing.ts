import { env } from '../config/env.js';

export interface CalculatedOrderLine {
  ma_san_pham: number;
  so_luong: number;
  don_gia: number;
  ty_le_giam_gia: number;
  thanh_tien: number;
  grossLine: number;
  discountLine: number;
  ghi_chu?: string | null;
}

export interface CalculatedOrderTotals {
  lines: CalculatedOrderLine[];
  tong_tien_hang: number;
  tien_giam_gia: number;
  tien_thue: number;
  tong_thanh_toan: number;
}

export function roundHalfUp(num: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function calculateOrderTotals(
  rawLines: Array<{
    ma_san_pham: number;
    so_luong: number;
    don_gia: number;
    ty_le_giam_gia?: number;
    ghi_chu?: string | null;
  }>,
  taxRate: number = env.TAX_RATE
): CalculatedOrderTotals {
  let tong_tien_hang = 0;
  let tien_giam_gia = 0;

  const lines: CalculatedOrderLine[] = rawLines.map((line) => {
    const qty = Number(line.so_luong) || 0;
    const price = Number(line.don_gia) || 0;
    const discountRate = Number(line.ty_le_giam_gia) || 0;

    const grossLine = roundHalfUp(qty * price, 2);
    const discountLine = roundHalfUp((grossLine * discountRate) / 100, 2);
    const thanh_tien = roundHalfUp(grossLine - discountLine, 2);

    tong_tien_hang = roundHalfUp(tong_tien_hang + grossLine, 2);
    tien_giam_gia = roundHalfUp(tien_giam_gia + discountLine, 2);

    return {
      ma_san_pham: line.ma_san_pham,
      so_luong: qty,
      don_gia: price,
      ty_le_giam_gia: discountRate,
      thanh_tien,
      grossLine,
      discountLine,
      ghi_chu: line.ghi_chu || null,
    };
  });

  const taxableAmount = Math.max(0, roundHalfUp(tong_tien_hang - tien_giam_gia, 2));
  const tien_thue = roundHalfUp(taxableAmount * taxRate, 2);
  const tong_thanh_toan = roundHalfUp(taxableAmount + tien_thue, 2);

  return {
    lines,
    tong_tien_hang,
    tien_giam_gia,
    tien_thue,
    tong_thanh_toan,
  };
}
