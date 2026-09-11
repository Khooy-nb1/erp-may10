import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Customer } from '../../types/customer.js';
import { Product } from '../../types/product.js';
import { getCustomers } from '../../services/customerService.js';
import { createOrder } from '../../services/orderService.js';
import { ProductSelector } from '../../components/products/ProductSelector.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { ErrorState } from '../../components/common/ErrorState.js';
import { LoadingState } from '../../components/common/LoadingState.js';

interface LineItemDraft {
  product: Product;
  quantity: number;
  discountRate: number;
}

export const SalesOrderCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState<string>('');

  const [lines, setLines] = useState<LineItemDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await getCustomers({ pageSize: 100, trang_thai: 'hoat_dong' });
        setCustomers(res.customers);
      } catch (err) {
        setError('Không thể tải danh sách khách hàng');
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, []);

  const handleCustomerChange = (customerIdStr: string) => {
    const cId = Number(customerIdStr);
    setSelectedCustomerId(cId);
    const selected = customers.find((c) => c.id === cId);
    if (selected) {
      setDeliveryAddress(`${selected.dia_chi}, ${selected.tinh_thanh_pho}`);
    }
  };

  const handleAddProduct = (product: Product) => {
    const existingIdx = lines.findIndex((l) => l.product.id === product.id);
    if (existingIdx !== -1) {
      const updated = [...lines];
      updated[existingIdx].quantity += 1;
      setLines(updated);
    } else {
      setLines([...lines, { product, quantity: 1, discountRate: 0 }]);
    }
  };

  const handleUpdateLine = (index: number, updates: Partial<LineItemDraft>) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    setLines(updated);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // Live Totals Calculation Preview
  const grossTotal = lines.reduce((sum, l) => sum + l.quantity * Number(l.product.gia_ban), 0);
  const discountTotal = lines.reduce(
    (sum, l) => sum + (l.quantity * Number(l.product.gia_ban) * l.discountRate) / 100,
    0
  );
  const netTotal = Math.max(0, grossTotal - discountTotal);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Vui lòng chọn khách hàng.');
      return;
    }
    if (lines.length === 0) {
      setError('Đơn hàng phải có ít nhất một dòng sản phẩm.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setError('Địa chỉ giao hàng không được để trống.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createOrder({
        ma_khach_hang: Number(selectedCustomerId),
        ngay_dat_hang: orderDate,
        ngay_giao_hang_yc: requestedDeliveryDate,
        dia_chi_giao_hang: deliveryAddress.trim(),
        ghi_chu: notes.trim() || undefined,
        lines: lines.map((l) => ({
          ma_san_pham: l.product.id,
          so_luong: Number(l.quantity),
          ty_le_giam_gia: Number(l.discountRate) || 0,
        })),
      });

      navigate(`/sales-orders/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo đơn hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingCustomers) {
    return <LoadingState message="Đang nạp danh mục khách hàng..." />;
  }

  return (
    <div>
      <PageHeader
        title="Tạo đơn bán hàng mới"
        subtitle="Lập đơn hàng, thêm sản phẩm và tính toán giá niêm yết tự động"
      >
        <Link
          to="/sales-orders"
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

      <form onSubmit={handleSubmit} noValidate>
        {/* Header Information Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>1. Thông tin chung đơn hàng</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Khách hàng *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.ten_khach_hang} ({c.ma_khach_hang}) - {c.tinh_thanh_pho}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Địa chỉ giao hàng *
              </label>
              <input
                type="text"
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
                Ngày đặt hàng *
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
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
                Ngày giao hàng yêu cầu *
              </label>
              <input
                type="date"
                value={requestedDeliveryDate}
                onChange={(e) => setRequestedDeliveryDate(e.target.value)}
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
                Ghi chú đơn hàng
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
        </div>

        {/* Product Lines Selection Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>2. Danh sách sản phẩm đặt mua</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Giá niêm yết được áp dụng tự động từ máy chủ</span>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Tra cứu &amp; thêm sản phẩm vào đơn:
            </label>
            <ProductSelector onSelect={handleAddProduct} />
          </div>

          {lines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '6px', color: '#64748b' }}>
              Chưa có sản phẩm nào được chọn. Hãy tra cứu sản phẩm ở trên để thêm vào đơn hàng.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>Sản phẩm</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, width: '100px' }}>Số lượng</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, width: '90px' }}>Giảm (%)</th>
                  <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>Thành tiền</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const gross = line.quantity * Number(line.product.gia_ban);
                  const discount = (gross * line.discountRate) / 100;
                  const lineNet = gross - discount;

                  return (
                    <tr key={line.product.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{line.product.ten_san_pham}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {line.product.ma_san_pham} • ĐVT: {line.product.ten_don_vi || 'Cái'}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateLine(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                          style={{ width: '70px', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(Number(line.product.gia_ban))}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.discountRate}
                          onChange={(e) =>
                            handleUpdateLine(idx, {
                              discountRate: Math.min(100, Math.max(0, Number(e.target.value))),
                            })
                          }
                          style={{ width: '60px', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                        {formatCurrency(lineNet)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Financial Summary Preview */}
          {lines.length > 0 && (
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Tổng tiền hàng:</span>
                  <span style={{ fontWeight: 500 }}>{formatCurrency(grossTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#64748b' }}>Tiền giảm giá:</span>
                  <span style={{ color: '#dc2626' }}>- {formatCurrency(discountTotal)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.5rem',
                    borderTop: '2px solid #0f172a',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: '#2563eb',
                  }}
                >
                  <span>Tổng thanh toán:</span>
                  <span>{formatCurrency(netTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Link
            to="/sales-orders"
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
            disabled={isSubmitting || lines.length === 0}
            style={{
              padding: '0.6rem 1.5rem',
              backgroundColor: isSubmitting || lines.length === 0 ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isSubmitting || lines.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Đang tạo đơn hàng...' : 'Lưu đơn bán hàng'}
          </button>
        </div>
      </form>
    </div>
  );
};
