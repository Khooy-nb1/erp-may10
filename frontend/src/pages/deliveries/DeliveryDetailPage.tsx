import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Delivery, DeliveryStatus } from '../../types/delivery.js';
import { getDeliveryById, startDelivery, completeDelivery, failDelivery } from '../../services/deliveryService.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const deliveryId = Number(id);
  const { user } = useAuth();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchDelivery = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDeliveryById(deliveryId);
      setDelivery(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết đợt giao hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deliveryId) {
      fetchDelivery();
    }
  }, [deliveryId]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const updated = await startDelivery(deliveryId);
      setDelivery(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể bắt đầu vận chuyển');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Xác nhận hoàn thành đợt giao hàng này? (Quy trình đầu phiếu, không trừ tồn kho vật tư).')) {
      return;
    }
    setActionLoading(true);
    try {
      const updated = await completeDelivery(deliveryId);
      setDelivery(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xác nhận hoàn thành');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFail = async () => {
    const reason = prompt('Nhập lý do giao hàng thất bại:');
    if (!reason || !reason.trim()) {
      return;
    }
    setActionLoading(true);
    try {
      const updated = await failDelivery(deliveryId, reason.trim());
      setDelivery(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const renderStatusBadge = (st: DeliveryStatus) => {
    const config: Record<DeliveryStatus, { bg: string; color: string; label: string }> = {
      cho_giao: { bg: '#fef9c3', color: '#854d0e', label: 'Chờ giao hàng' },
      dang_giao: { bg: '#e0e7ff', color: '#3730a3', label: 'Đang vận chuyển' },
      da_giao: { bg: '#dcfce7', color: '#15803d', label: 'Đã giao thành công' },
      that_bai: { bg: '#fee2e2', color: '#b91c1c', label: 'Giao thất bại' },
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
    return <LoadingState message="Đang tải phiếu giao hàng..." />;
  }

  if (error || !delivery) {
    return <ErrorState message={error || 'Không tìm thấy phiếu giao hàng'} onRetry={fetchDelivery} />;
  }

  const isWarehouseOrAdmin = user?.vai_tro === 'kho' || user?.vai_tro === 'admin';
  const isPending = delivery.trang_thai === 'cho_giao';
  const isInTransit = delivery.trang_thai === 'dang_giao';

  return (
    <div>
      <PageHeader
        title={`Phiếu giao hàng: ${delivery.ma_giao_hang}`}
        subtitle={`Ngày giao: ${formatDate(delivery.ngay_giao)} • Trạng thái: ${delivery.trang_thai}`}
      >
        <Link
          to="/deliveries"
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
          ← Danh sách giao hàng
        </Link>

        {isWarehouseOrAdmin && isPending && (
          <button
            disabled={actionLoading}
            onClick={handleStart}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🚚 Bắt đầu vận chuyển
          </button>
        )}

        {isWarehouseOrAdmin && isInTransit && (
          <>
            <button
              disabled={actionLoading}
              onClick={handleComplete}
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
              ✓ Xác nhận giao thành công
            </button>
            <button
              disabled={actionLoading}
              onClick={handleFail}
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
              ✕ Báo giao thất bại
            </button>
          </>
        )}
      </PageHeader>

      {/* Scope Disclaimer Card */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: '#1e40af',
          lineHeight: 1.5,
        }}
      >
        📌 <strong>Quy định kỹ thuật (P0 / Q11):</strong> Mô hình cơ sở dữ liệu hiện tại quản lý thực hiện giao hàng theo phiếu vận chuyển cấp đầu phiếu (`giao_hang`). Việc hoàn thành đợt giao không tự động trừ tồn kho (`ton_kho` quản lý nguyên phụ liệu ở phân hệ Kho) và không cập nhật chi tiết dòng sản phẩm.
      </div>

      {/* Delivery Details Overview */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Thông tin phiếu giao hàng</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: '#64748b' }}>Đơn bán hàng liên kết:</span>
            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
              <Link to={`/sales-orders/${delivery.ma_don_ban_hang}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                {delivery.ma_don_ban || `Đơn hàng #${delivery.ma_don_ban_hang}`}
              </Link>
            </div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Trạng thái vận chuyển:</span>
            <div style={{ marginTop: '0.2rem' }}>{renderStatusBadge(delivery.trang_thai)}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Kho hàng xuất:</span>
            <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{delivery.ten_kho || `Kho #${delivery.ma_kho}`}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Ngày giao hàng:</span>
            <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{formatDate(delivery.ngay_giao)}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Người nhận hàng:</span>
            <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{delivery.ten_nguoi_nhan}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Phương tiện vận chuyển:</span>
            <div style={{ color: '#334155', marginTop: '0.2rem' }}>{delivery.phuong_tien_van_chuyen || 'Chưa xác định'}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ color: '#64748b' }}>Địa chỉ nhận hàng:</span>
            <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{delivery.dia_chi_giao}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Nhân viên giao nhận:</span>
            <div style={{ color: '#334155', marginTop: '0.2rem' }}>{delivery.ten_nguoi_giao || '—'}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Ghi chú điều phối:</span>
            <div style={{ color: '#475569', marginTop: '0.2rem' }}>{delivery.ghi_chu || 'Không có ghi chú'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
