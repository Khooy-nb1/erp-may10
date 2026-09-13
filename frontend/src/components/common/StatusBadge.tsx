import React from 'react';
import { Badge, type BadgeVariant } from '../ui/Badge.js';
import type { CustomerStatus } from '../../types/customer.js';
import type { ProductStatus } from '../../types/product.js';
import type { OrderStatus, OrderLineStatus } from '../../types/order.js';
import type { DeliveryStatus } from '../../types/delivery.js';
import type { InvoiceStatus } from '../../types/invoice.js';
import type { ReceivableStatus } from '../../types/receivable.js';

export type DomainStatus =
  | CustomerStatus
  | ProductStatus
  | OrderStatus
  | OrderLineStatus
  | DeliveryStatus
  | InvoiceStatus
  | ReceivableStatus;

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

/**
 * Single domain status vocabulary. Labels are the ones the ERP already shows
 * in Vietnamese; variants map them onto the status palette so colour is never
 * the only signal (each badge also carries its Vietnamese label).
 */
export const DOMAIN_STATUS: Record<DomainStatus, StatusMeta> = {
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

export interface StatusBadgeProps {
  /** Domain status code as returned by the API. */
  status: string;
  /** Optional label override for statuses that read differently per screen. */
  label?: string;
}

/** Status pill with the ERP's Vietnamese labels and semantic variants. */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const meta = (DOMAIN_STATUS as Record<string, StatusMeta | undefined>)[status];
  return <Badge variant={meta?.variant ?? 'neutral'}>{label ?? meta?.label ?? status}</Badge>;
};

/** Text-only status label for places where a badge would add noise. */
export function statusLabel(status: string, fallback?: string): string {
  const meta = (DOMAIN_STATUS as Record<string, StatusMeta | undefined>)[status];
  return meta?.label ?? fallback ?? status;
}
