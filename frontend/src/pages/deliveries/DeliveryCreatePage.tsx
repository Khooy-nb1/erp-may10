import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createDelivery } from '../../services/deliveryService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const DeliveryCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('1');
  const [deliveryDate, setDeliveryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiverName, setReceiverName] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [transportMethod, setTransportMethod] = useState<string>('Xe tải công ty');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !Number(orderId)) {
      setError('Vui lòng nhập ID đơn hàng hợp lệ.');
      return;
    }
    if (!receiverName.trim()) {
      setError('Tên người nhận là bắt buộc.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setError('Địa chỉ nhận hàng là bắt buộc.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createDelivery({
        ma_don_ban_hang: Number(orderId),
        ma_kho: Number(warehouseId),
        ngay_giao: deliveryDate,
        ten_nguoi_nhan: receiverName.trim(),
        dia_chi_giao: deliveryAddress.trim(),
        phuong_tien_van_chuyen: transportMethod.trim() || null,
        ghi_chu: notes.trim() || null,
      });

      navigate(`/deliveries/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lập đợt giao hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Lập đợt giao hàng mới"
        subtitle="Khởi tạo phiếu điều phối giao nhận cấp đầu phiếu (header-only)"
      >
        <Link
          to="/deliveries"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Hủy bỏ
        </Link>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          maxWidth: '750px',
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                ID đơn bán hàng liên kết *
              </label>
              <input
                type="number"
                placeholder="VD: 1"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Kho hàng xuất kho *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              >
                <option value="1">Kho Nguyên Phụ Liệu Số 1 (KNL01)</option>
                <option value="2">Kho Thành Phẩm May 10 (KTP01)</option>
                <option value="3">Kho Phụ Liệu May Mặc (KPL01)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Ngày giao hàng *
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Người nhận hàng *
              </label>
              <input
                type="text"
                placeholder="Họ tên người nhận"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Địa chỉ giao nhận *
              </label>
              <input
                type="text"
                placeholder="Địa chỉ giao nhận hàng hóa"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Phương tiện vận chuyển
              </label>
              <input
                type="text"
                value={transportMethod}
                onChange={(e) => setTransportMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Ghi chú điều phối
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Link
              to="/deliveries"
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Đang tạo...' : 'Lưu phiếu giao hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
