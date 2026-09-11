import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Order, OrderStatus } from '../../types/order.js';
import { getOrderById, confirmOrder, cancelOrder } from '../../services/orderService.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { ErrorState } from '../../components/common/ErrorState.js';
import { ApiError } from '../../services/api.js';

export const SalesOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [creditWarning, setCreditWarning] = useState<string | null>(null);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrderById(orderId);
      setOrder(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleConfirm = async (acknowledge = false) => {
    setActionLoading(true);
    setCreditWarning(null);
    try {
      const confirmed = await confirmOrder(orderId, acknowledge);
      setOrder(confirmed);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CUSTOMER_CREDIT_LIMIT_EXCEEDED') {
        // If warning mode requires acknowledgment
        if (err.details && err.details.some((d) => d.field === 'acknowledgeCreditLimit')) {
          setCreditWarning(err.message);
        } else {
          alert(err.message);
        }
      } else {
        alert(err instanceof Error ? err.message : 'Xác nhận đơn hàng thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Nhập lý do hủy đơn hàng:');
    if (!reason || !reason.trim()) {
      return;
    }

    setActionLoading(true);
    try {
      const cancelled = await cancelOrder(orderId, reason.trim());
      setOrder(cancelled);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hủy đơn hàng thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const renderStatusBadge = (st: OrderStatus) => {
    const config: Record<OrderStatus, { bg: string; color: string; label: string }> = {
      cho_xac_nhan: { bg: '#fef9c3', color: '#854d0e', label: 'Chờ xác nhận' },
      da_xac_nhan: { bg: '#e0e7ff', color: '#3730a3', label: 'Đã xác nhận' },
      dang_san_xuat: { bg: '#f3e8ff', color: '#6b21a8', label: 'Đang sản xuất' },
      da_giao: { bg: '#dcfce7', color: '#15803d', label: 'Đã giao hàng' },
      huy: { bg: '#fee2e2', color: '#b91c1c', label: 'Đã hủy' },
    };
    const c = config[st] || { bg: '#f1f5f9', color: '#475569', label: st };
    return (
      <span
        style={{
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: c.bg,
          color: c.color,
        }}
      >
        {c.label}
      </span>
    );
  };

  if (loading) {
    return <LoadingState message="Đang tải chi tiết đơn hàng..." />;
  }

  if (error || !order) {
    return <ErrorState message={error || 'Không tìm thấy đơn hàng'} onRetry={fetchOrder} />;
  }

  const isPending = order.trang_thai === 'cho_xac_nhan';
  const isConfirmed = order.trang_thai === 'da_xac_nhan';
  const isAdmin = user?.vai_tro === 'admin';
  const isSales = user?.vai_tro === 'ban_hang' || isAdmin;

  return (
    <div>
      <PageHeader
        title={`Đơn bán hàng: ${order.ma_don_ban}`}
        subtitle={`Ngày đặt: ${formatDate(order.ngay_dat_hang)} • Trạng thái: ${order.trang_thai}`}
      >
        <Link
          to="/sales-orders"
          style={{
            padding: '0.45rem 0.9rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          ← Danh sách đơn
        </Link>

        {isSales && isPending && (
          <button
            disabled={actionLoading}
            onClick={() => handleConfirm(false)}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✓ Xác nhận đơn hàng
          </button>
        )}

        {(isPending || (isConfirmed && isAdmin)) && (
          <button
            disabled={actionLoading}
            onClick={handleCancel}
            style={{
              padding: '0.45rem 0.9rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ✕ Hủy đơn hàng
          </button>
        )}
      </PageHeader>

      {/* Credit Warning Modal/Card */}
      {creditWarning && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            color: '#92400e',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>
            ⚠️ Cảnh báo vượt hạn mức tín dụng khách hàng
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>{creditWarning}</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleConfirm(true)}
              style={{
                padding: '0.45rem 0.9rem',
                backgroundColor: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tôi xác nhận duyệt đơn vượt hạn mức
            </button>
            <button
              onClick={() => setCreditWarning(null)}
              style={{
                padding: '0.45rem 0.9rem',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Customer & Shipping Info */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a' }}>Thông tin giao nhận &amp; Khách hàng</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Khách hàng:</span>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                <Link to={`/customers/${order.ma_khach_hang}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                  {order.ten_khach_hang || `Mã #${order.ma_khach_hang}`}
                </Link>
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Trạng thái đơn:</span>
              <div style={{ marginTop: '0.2rem' }}>{renderStatusBadge(order.trang_thai)}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b' }}>Địa chỉ giao hàng:</span>
              <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{order.dia_chi_giao_hang}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Hạn giao hàng yêu cầu:</span>
              <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{formatDate(order.ngay_giao_hang_yc)}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Ngày giao thực tế:</span>
              <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{formatDate(order.ngay_giao_thuc_te)}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Nhân viên bán hàng:</span>
              <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{order.ten_nguoi_ban || '—'}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Ghi chú:</span>
              <div style={{ color: '#475569', marginTop: '0.2rem' }}>{order.ghi_chu || 'Không có ghi chú'}</div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a' }}>Tổng kết thanh toán</h3>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Tiền hàng:</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(order.tong_tien_hang)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Giảm giá:</span>
              <span style={{ color: '#dc2626' }}>- {formatCurrency(order.tien_giam_gia)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Tiền thuế:</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(order.tien_thue)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '2px solid #0f172a',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#2563eb',
              }}
            >
              <span>Tổng thanh toán:</span>
              <span>{formatCurrency(order.tong_thanh_toan)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Lines Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
          Chi tiết sản phẩm đặt hàng ({order.lines?.length || 0} sản phẩm)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã hàng</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tên sản phẩm</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Số lượng</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Đơn giá</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Giảm giá</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thành tiền</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Trạng thái giao</th>
            </tr>
          </thead>
          <tbody>
            {order.lines && order.lines.length > 0 ? (
              order.lines.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                    {l.ma_san_pham_code || `SP-${l.ma_san_pham}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{l.ten_san_pham || 'Sản phẩm may mặc'}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {l.so_luong} {l.ten_don_vi || 'Cái'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{formatCurrency(l.don_gia)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{Number(l.ty_le_giam_gia)}%</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                    {formatCurrency(l.thanh_tien)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: l.trang_thai === 'da_giao_du' ? '#dcfce7' : '#f1f5f9',
                        color: l.trang_thai === 'da_giao_du' ? '#15803d' : '#64748b',
                      }}
                    >
                      {l.trang_thai === 'da_giao_du'
                        ? 'Đã giao đủ'
                        : l.trang_thai === 'giao_mot_phan'
                        ? 'Giao một phần'
                        : 'Chưa giao'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Không có dòng sản phẩm nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
