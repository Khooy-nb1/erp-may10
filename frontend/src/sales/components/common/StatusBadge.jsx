import React from 'react';
import { Badge } from '../ui/Badge.jsx';

/**
 * Single domain status vocabulary. Labels are the ones the ERP already shows
 * in Vietnamese; variants map them onto the status palette so colour is never
 * the only signal (each badge also carries its Vietnamese label).
 *
 * Keys cover every status enum the API returns for customers, products, sales
 * orders, order lines, deliveries, invoices and receivables, so pages can pass
 * a raw status code straight through.
 */
export const DOMAIN_STATUS = {
  // Khách hàng
  hoat_dong: { label: 'Hoạt động', variant: 'success' },
  tam_khoa: { label: 'Tạm khóa', variant: 'warning' },
  ngung_giao_dich: { label: 'Ngừng giao dịch', variant: 'error' },

  // Sản phẩm
  dang_ban: { label: 'Đang bán', variant: 'success' },
  ngung_ban: { label: 'Ngừng bán', variant: 'error' },
  mau_moi: { label: 'Mẫu mới', variant: 'info' },

  // Đơn bán hàng
  cho_xac_nhan: { label: 'Chờ xác nhận', variant: 'warning' },
  da_xac_nhan: { label: 'Đã xác nhận', variant: 'info' },
  dang_san_xuat: { label: 'Đang sản xuất', variant: 'purple' },
  da_giao: { label: 'Đã giao', variant: 'success' },
  huy: { label: 'Đã hủy', variant: 'error' },

  // Dòng đơn hàng
  chua_giao: { label: 'Chưa giao', variant: 'warning' },
  giao_mot_phan: { label: 'Giao một phần', variant: 'info' },
  da_giao_du: { label: 'Đã giao đủ', variant: 'success' },

  // Giao hàng
  cho_giao: { label: 'Chờ giao hàng', variant: 'warning' },
  dang_giao: { label: 'Đang vận chuyển', variant: 'info' },
  that_bai: { label: 'Giao thất bại', variant: 'error' },

  // Hóa đơn / Công nợ
  chua_thanh_toan: { label: 'Chưa thanh toán', variant: 'warning' },
  thanh_toan_mot_phan: { label: 'Thanh toán một phần', variant: 'info' },
  da_thanh_toan: { label: 'Đã thanh toán', variant: 'success' },
  qua_han: { label: 'Quá hạn', variant: 'error' },
  mot_phan: { label: 'Thanh toán một phần', variant: 'info' },
};

/**
 * Tone behind a status, for consumers that paint the status in their own
 * medium (charts, bars) and must stay in step with the badge colour.
 */
export function statusTone(status) {
  return DOMAIN_STATUS[status]?.variant ?? 'neutral';
}

/**
 * Status pill with the ERP's Vietnamese labels and semantic variants.
 *
 * Props (PH1 `StatusBadgeProps`): status, label.
 */
export const StatusBadge = ({ status, label }) => {
  const meta = DOMAIN_STATUS[status];
  return <Badge variant={meta?.variant ?? 'neutral'}>{label ?? meta?.label ?? status}</Badge>;
};

/** Text-only status label for places where a badge would add noise. */
export function statusLabel(status, fallback) {
  const meta = DOMAIN_STATUS[status];
  return meta?.label ?? fallback ?? status;
}
