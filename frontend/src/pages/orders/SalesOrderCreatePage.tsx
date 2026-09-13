import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Text } from '../../components/ui/Typography.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { IconButton } from '../../components/ui/IconButton.js';
import { Banner } from '../../components/ui/Banner.js';
import { Table, proportional, pixel, type TableColumn } from '../../components/ui/Table.js';
import { Input } from '../../components/ui/Input.js';
import { NumberInput } from '../../components/ui/NumberInput.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { Select } from '../../components/ui/Select.js';
import { DateInput, type ISODateString } from '../../components/ui/DateInput.js';
import { Customer } from '../../types/customer.js';
import { Product } from '../../types/product.js';
import { getCustomers } from '../../services/customerService.js';
import { createOrder } from '../../services/orderService.js';
import { ProductSelector } from '../../components/products/ProductSelector.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { FormSection } from '../../components/common/FormSection.js';
import { LoadingState } from '../../components/common/LoadingState.js';

interface LineItemDraft {
  product: Product;
  quantity: number;
  discountRate: number;
}

interface LineItemRow extends Record<string, unknown> {
  key: string;
  index: number;
  line: LineItemDraft;
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

  const lineRows: LineItemRow[] = lines.map((line, index) => ({
    key: String(line.product.id),
    index,
    line,
  }));

  const lineColumns: TableColumn<LineItemRow>[] = [
    {
      key: 'product',
      header: 'Sản phẩm',
      width: proportional(1),
      renderCell: (row) => (
        <div className="flex flex-col gap-0.5">
          <Text className="font-semibold">{row.line.product.ten_san_pham}</Text>
          <Text variant="supporting">
            {`${row.line.product.ma_san_pham} • ĐVT: ${row.line.product.ten_don_vi || 'Cái'}`}
          </Text>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Số lượng',
      width: pixel(120),
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
      renderCell: (row) => <Text className="font-medium">{formatCurrency(Number(row.line.product.gia_ban))}</Text>,
    },
    {
      key: 'discountRate',
      header: 'Giảm (%)',
      width: pixel(110),
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
        return <Text className="font-semibold">{formatCurrency(gross - discount)}</Text>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: pixel(56),
      align: 'center',
      renderCell: (row) => (
        <IconButton
          icon={<Trash2 size={16} />}
          label="Xóa dòng sản phẩm"
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveLine(row.index)}
        />
      ),
    },
  ];

  if (loadingCustomers) {
    return <LoadingState message="Đang nạp danh mục khách hàng..." />;
  }

  return (
    <PageScaffold
      title="Tạo đơn bán hàng mới"
      subtitle="Lập đơn hàng, thêm sản phẩm và tính toán giá niêm yết tự động"
      breadcrumbs={[
        { label: 'Đơn bán hàng', href: '/sales-orders' },
        { label: 'Tạo đơn bán hàng mới' },
      ]}
      actions={
        <Button variant="secondary" href="/sales-orders">
          Hủy bỏ
        </Button>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex w-full flex-col gap-5">
          {error ? (
            <Banner
              status="error"
              title="Đã xảy ra lỗi"
              description={`[ERROR] ${error}`}
              endContent={
                <Button variant="secondary" size="sm" onClick={() => setError(null)}>
                  Thử lại
                </Button>
              }
            />
          ) : null}

          <FormSection title="1. Thông tin chung đơn hàng">
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                <Select
                  label="Khách hàng *"
                  placeholder="-- Chọn khách hàng --"
                  value={selectedCustomerId === '' ? undefined : String(selectedCustomerId)}
                  onChange={(value) => handleCustomerChange(value ?? '')}
                  options={customers.map((c) => ({
                    value: String(c.id),
                    label: `${c.ten_khach_hang} (${c.ma_khach_hang}) - ${c.tinh_thanh_pho}`,
                  }))}
                />

                <Input
                  label="Địa chỉ giao hàng *"
                  value={deliveryAddress}
                  onChange={(value) => setDeliveryAddress(value)}
                />

                <DateInput
                  label="Ngày đặt hàng *"
                  value={orderDate as ISODateString}
                  onChange={(value) => setOrderDate(value ?? '')}
                />

                <DateInput
                  label="Ngày giao hàng yêu cầu *"
                  value={requestedDeliveryDate as ISODateString}
                  onChange={(value) => setRequestedDeliveryDate(value ?? '')}
                />
              </div>

              <Textarea label="Ghi chú đơn hàng" rows={2} value={notes} onChange={(value) => setNotes(value)} />
            </div>
          </FormSection>

          <FormSection
            title="2. Danh sách sản phẩm đặt mua"
            description="Giá niêm yết được áp dụng tự động từ máy chủ"
          >
            <div className="flex flex-col gap-4">
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
                <div className="flex flex-col gap-4">
                  <Table data={lineRows} columns={lineColumns} idKey="key" density="compact" />

                  <div className="border-t border-border" />

                  <div className="flex flex-row w-full justify-end">
                    <div className="flex w-85 flex-col gap-2">
                      <div className="flex flex-row w-full justify-between">
                        <Text variant="supporting" as="span">
                          Tổng tiền hàng:
                        </Text>
                        <Text className="font-medium" as="span">
                          {formatCurrency(grossTotal)}
                        </Text>
                      </div>

                      <div className="flex flex-row w-full justify-between">
                        <Text variant="supporting" as="span">
                          Tiền giảm giá:
                        </Text>
                        <Text as="span">{`- ${formatCurrency(discountTotal)}`}</Text>
                      </div>

                      <div className="border-t border-border" />

                      <div className="flex flex-row w-full justify-between">
                        <Text className="font-bold" as="span">
                          Tổng thanh toán:
                        </Text>
                        <Text className="font-bold" as="span">
                          {formatCurrency(netTotal)}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          <div className="flex flex-row items-center justify-end gap-3">
            <Button variant="secondary" href="/sales-orders">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || lines.length === 0}
            >
              {isSubmitting ? 'Đang tạo đơn hàng...' : 'Lưu đơn bán hàng'}
            </Button>
          </div>
        </div>
      </form>
    </PageScaffold>
  );
};
