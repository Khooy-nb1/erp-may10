import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Text } from '../ui/Typography.jsx';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Table, proportional, pixel } from '../ui/Table.jsx';
import { Input } from '../ui/Input.jsx';
import { NumberInput } from '../ui/NumberInput.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { Select } from '../ui/Select.jsx';
import { DateInput } from '../ui/DateInput.jsx';
import { ErrorState } from '../common/ErrorState.jsx';
import { FormSection } from '../common/FormSection.jsx';
import { LoadingState } from '../common/LoadingState.jsx';
import { getCustomers } from '../../services/customerService.js';
import { createOrder } from '../../services/orderService.js';
import { formatCurrency } from '../../lib/format.js';
import { ProductSelector } from '../products/ProductSelector.jsx';

/** Customers are looked up once per open, so the picker covers the whole active catalogue. */
const CUSTOMER_PAGE_SIZE = 100;

/**
 * Fresh order dates: placed today, requested for delivery a week out. Kept in one
 * place so the initial state and every reopen agree on that seven-day lead.
 */
function defaultOrderDates() {
  const today = new Date();
  const requestedDelivery = new Date();
  requestedDelivery.setDate(requestedDelivery.getDate() + 7);
  return {
    ngay_dat_hang: today.toISOString().split('T')[0],
    ngay_giao_hang_yc: requestedDelivery.toISOString().split('T')[0],
  };
}

/**
 * Order creation as a modal, ported from the old \`/sales-orders/new\` page so the
 * order list can raise one without losing its filter and page state.
 * (Ported 1:1 from PH1 \`components/orders/SalesOrderCreateDialog.tsx\`.)
 */
export function SalesOrderCreateDialog({ isOpen, onOpenChange, onCreated }) {
  const formId = 'sales-order-create-form';

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderDate, setOrderDate] = useState(() => defaultOrderDates().ngay_dat_hang);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    () => defaultOrderDates().ngay_giao_hang_yc
  );
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Each open starts from a clean form and reloads the active customer catalogue.
  useEffect(() => {
    if (!isOpen) return undefined;

    const { ngay_dat_hang, ngay_giao_hang_yc } = defaultOrderDates();
    setSelectedCustomerId('');
    setDeliveryAddress('');
    setOrderDate(ngay_dat_hang);
    setRequestedDeliveryDate(ngay_giao_hang_yc);
    setNotes('');
    setLines([]);
    setIsSubmitting(false);
    setError(null);
    setLoadingCustomers(true);

    let cancelled = false;
    const loadCustomers = async () => {
      try {
        const res = await getCustomers({ pageSize: CUSTOMER_PAGE_SIZE, trang_thai: 'hoat_dong' });
        if (!cancelled) setCustomers(res.customers);
      } catch {
        if (!cancelled) setError('Không thể tải danh sách khách hàng');
      } finally {
        if (!cancelled) setLoadingCustomers(false);
      }
    };
    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleCustomerChange = (customerIdStr) => {
    const cId = Number(customerIdStr);
    setSelectedCustomerId(cId);
    // The API serialises bigint ids as strings, so match on the wire value.
    const selected = customers.find((c) => String(c.id) === customerIdStr);
    if (selected) {
      setDeliveryAddress(selected.dia_chi + ', ' + selected.tinh_thanh_pho);
    }
  };

  const handleAddProduct = (product) => {
    const existingIdx = lines.findIndex((l) => l.product.id === product.id);
    if (existingIdx !== -1) {
      const updated = [...lines];
      updated[existingIdx].quantity += 1;
      setLines(updated);
    } else {
      setLines([...lines, { product, quantity: 1, discountRate: 0 }]);
    }
  };

  const handleUpdateLine = (index, updates) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    setLines(updated);
  };

  const handleRemoveLine = (index) => {
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // Live Totals Calculation Preview
  const grossTotal = lines.reduce((sum, l) => sum + l.quantity * Number(l.product.gia_ban), 0);
  const discountTotal = lines.reduce(
    (sum, l) => sum + (l.quantity * Number(l.product.gia_ban) * l.discountRate) / 100,
    0
  );
  const netTotal = Math.max(0, grossTotal - discountTotal);

  const handleSubmit = async (e) => {
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

      if (onCreated) onCreated(created.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo đơn hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lineRows = lines.map((line, index) => ({
    key: String(line.product.id),
    index,
    line,
  }));

  const lineColumns = [
    {
      key: 'product',
      header: 'Sản phẩm',
      width: proportional(1),
      renderCell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="block max-w-[280px] truncate font-semibold" title={row.line.product.ten_san_pham}>
            {row.line.product.ten_san_pham}
          </span>
          <Text variant="supporting">
            {row.line.product.ma_san_pham + ' • ĐVT: ' + (row.line.product.ten_don_vi || 'Cái')}
          </Text>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Số lượng',
      width: pixel(120),
      align: 'end',
      renderCell: (row) => (
        <NumberInput
          label="Số lượng"
          isLabelHidden
          value={row.line.quantity}
          min={1}
          onChange={(value) => handleUpdateLine(row.index, { quantity: Math.max(1, Number(value) || 1) })}
        />
      ),
    },
    {
      key: 'unitPrice',
      header: 'Đơn giá',
      align: 'end',
      renderCell: (row) => (
        <Text className="font-medium tabular-nums">{formatCurrency(Number(row.line.product.gia_ban))}</Text>
      ),
    },
    {
      key: 'discountRate',
      header: 'Giảm (%)',
      width: pixel(110),
      align: 'end',
      renderCell: (row) => (
        <NumberInput
          label="Giảm (%)"
          isLabelHidden
          value={row.line.discountRate}
          min={0}
          max={100}
          onChange={(value) =>
            handleUpdateLine(row.index, { discountRate: Math.min(100, Math.max(0, Number(value) || 0)) })
          }
        />
      ),
    },
    {
      key: 'lineTotal',
      header: 'Thành tiền',
      align: 'end',
      renderCell: (row) => {
        const gross = row.line.quantity * Number(row.line.product.gia_ban);
        const discount = (gross * row.line.discountRate) / 100;
        return <Text className="font-semibold tabular-nums">{formatCurrency(gross - discount)}</Text>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: pixel(56),
      align: 'end',
      renderCell: (row) => (
        <IconButton
          icon={<Trash2 size={16} aria-hidden />}
          label="Xóa dòng sản phẩm"
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveLine(row.index)}
        />
      ),
    },
  ];

  const footer = (
    <>
      <Button variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
        Hủy
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting || loadingCustomers || lines.length === 0}
      >
        {isSubmitting ? 'Đang tạo đơn hàng...' : 'Lưu đơn bán hàng'}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      title="Tạo đơn bán hàng mới"
      description="Lập đơn hàng, thêm sản phẩm và tính toán giá niêm yết tự động"
      className="max-w-4xl"
      footer={footer}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1"
      >
        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

        {loadingCustomers ? (
          <LoadingState message="Đang nạp danh mục khách hàng..." />
        ) : (
          <>
            <FormSection title="1. Thông tin chung đơn hàng">
              <Select
                label="Khách hàng *"
                placeholder="-- Chọn khách hàng --"
                value={selectedCustomerId === '' ? undefined : String(selectedCustomerId)}
                onChange={(value) => handleCustomerChange(value ?? '')}
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: c.ten_khach_hang + ' (' + c.ma_khach_hang + ') - ' + c.tinh_thanh_pho,
                }))}
              />

              <Input
                label="Địa chỉ giao hàng *"
                value={deliveryAddress}
                onChange={(value) => setDeliveryAddress(value)}
              />

              <DateInput
                label="Ngày đặt hàng *"
                value={orderDate}
                onChange={(value) => setOrderDate(value ?? '')}
              />

              <DateInput
                label="Ngày giao hàng yêu cầu *"
                value={requestedDeliveryDate}
                onChange={(value) => setRequestedDeliveryDate(value ?? '')}
              />

              <Textarea
                label="Ghi chú đơn hàng"
                rows={2}
                value={notes}
                onChange={(value) => setNotes(value)}
              />
            </FormSection>

            <FormSection
              title="2. Danh sách sản phẩm đặt mua"
              description="Giá niêm yết được áp dụng tự động từ máy chủ"
            >
              <div className="flex flex-col gap-2">
                <Text variant="label" as="label">
                  Tra cứu &amp; thêm sản phẩm vào đơn:
                </Text>
                <ProductSelector onSelect={handleAddProduct} />
              </div>

              {lines.length === 0 ? (
                <Card variant="muted" className="p-4">
                  <div className="flex flex-row w-full justify-center">
                    <Text variant="supporting" as="p">
                      Chưa có sản phẩm nào được chọn. Hãy tra cứu sản phẩm ở trên để thêm vào đơn hàng.
                    </Text>
                  </div>
                </Card>
              ) : (
                <>
                  <Table data={lineRows} columns={lineColumns} idKey="key" density="balanced" />

                  <div className="border-t border-brand-border" />

                  <div className="flex flex-row w-full justify-end">
                    <div className="flex w-full flex-col gap-2 sm:w-80">
                      <div className="flex flex-row w-full justify-between gap-4">
                        <Text variant="supporting" as="span">
                          Tổng tiền hàng:
                        </Text>
                        <Text className="font-medium tabular-nums" as="span">
                          {formatCurrency(grossTotal)}
                        </Text>
                      </div>

                      <div className="flex flex-row w-full justify-between gap-4">
                        <Text variant="supporting" as="span">
                          Tiền giảm giá:
                        </Text>
                        <Text className="tabular-nums" as="span">{'- ' + formatCurrency(discountTotal)}</Text>
                      </div>

                      <div className="border-t border-brand-border" />

                      <div className="flex flex-row w-full justify-between gap-4">
                        <Text className="font-bold" as="span">
                          Tổng thanh toán:
                        </Text>
                        <Text className="font-bold tabular-nums" as="span">
                          {formatCurrency(netTotal)}
                        </Text>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </FormSection>
          </>
        )}
      </form>
    </Dialog>
  );
}
