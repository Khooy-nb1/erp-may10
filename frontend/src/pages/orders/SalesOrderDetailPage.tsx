import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Order } from '../../types/order.js';
import { getOrderById, confirmOrder, cancelOrder } from '../../services/orderService.js';
import { useAuth } from '../../context/AuthContext.js';
import { ApiError } from '../../services/api.js';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Link } from '@astryxdesign/core/Link';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { Table, TableColumn, proportional } from '@astryxdesign/core/Table';
import { Dialog } from '@astryxdesign/core/Dialog';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { ArrowLeft, Check, X } from 'lucide-react';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { AsyncPanel } from '../../components/common/AsyncPanel.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

type OrderLine = NonNullable<Order['lines']>[number];

/** `da_giao` reads "Đã giao hàng" on this screen; the shared badge labels it "Đã giao". */
const STATUS_LABELS: Partial<Record<Order['trang_thai'], string>> = {
  da_giao: 'Đã giao hàng',
};

interface OrderLineRow extends Record<string, unknown> {
  line: OrderLine;
  id: number;
  ma_san_pham: string;
  ten_san_pham: string;
  so_luong: string;
  don_gia: string;
  giam_gia: string;
  thanh_tien: string;
  trang_thai: OrderLine['trang_thai'];
}

export const SalesOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { user } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [creditWarning, setCreditWarning] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

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
          toast({ body: err.message, type: 'error' });
        }
      } else {
        toast({ body: err instanceof Error ? err.message : 'Xác nhận đơn hàng thất bại', type: 'error' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!reason || !reason.trim()) {
      return;
    }

    setActionLoading(true);
    try {
      const cancelled = await cancelOrder(orderId, reason.trim());
      setOrder(cancelled);
    } catch (err) {
      toast({ body: err instanceof Error ? err.message : 'Hủy đơn hàng thất bại', type: 'error' });
    } finally {
      setActionLoading(false);
      setCancelOpen(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const isPending = order?.trang_thai === 'cho_xac_nhan';
  const isConfirmed = order?.trang_thai === 'da_xac_nhan';
  const isAdmin = user?.vai_tro === 'admin';
  const isSales = user?.vai_tro === 'ban_hang' || isAdmin;

  const lineRows: OrderLineRow[] = (order?.lines ?? []).map((line) => ({
    line,
    id: line.id,
    ma_san_pham: line.ma_san_pham_code || `SP-${line.ma_san_pham}`,
    ten_san_pham: line.ten_san_pham || 'Sản phẩm may mặc',
    so_luong: `${line.so_luong} ${line.ten_don_vi || 'Cái'}`,
    don_gia: formatCurrency(line.don_gia),
    giam_gia: `${Number(line.ty_le_giam_gia)}%`,
    thanh_tien: formatCurrency(line.thanh_tien),
    trang_thai: line.trang_thai,
  }));

  return (
    <PageScaffold
      title={order ? `Đơn bán hàng: ${order.ma_don_ban}` : 'Đơn bán hàng'}
      subtitle={
        order
          ? `Ngày đặt: ${formatDate(order.ngay_dat_hang)} • Trạng thái: ${order.trang_thai}`
          : undefined
      }
      breadcrumbs={[
        { label: 'Đơn bán hàng', href: '/sales-orders' },
        { label: order?.ma_don_ban ?? 'Chi tiết' },
      ]}
      actions={
        <HStack gap={2} wrap="wrap">
          <Button
            variant="secondary"
            icon={<ArrowLeft size={16} aria-hidden />}
            label="Danh sách đơn"
            href="/sales-orders"
          />
          {isSales && isPending && (
            <Button
              variant="primary"
              icon={<Check size={16} aria-hidden />}
              label="Xác nhận đơn hàng"
              isDisabled={actionLoading}
              onClick={() => handleConfirm(false)}
            />
          )}
          {(isPending || (isConfirmed && isAdmin)) && (
            <Button
              variant="secondary"
              icon={<X size={16} aria-hidden />}
              label="Hủy đơn hàng"
              isDisabled={actionLoading}
              onClick={() => setCancelOpen(true)}
            />
          )}
        </HStack>
      }
    >
      <AsyncPanel
        isLoading={loading}
        error={error}
        isEmpty={!order}
        loadingMessage="Đang tải chi tiết đơn hàng..."
        emptyTitle="Không tìm thấy đơn hàng"
        emptyDescription="Đơn hàng không tồn tại hoặc đã bị xóa."
        onRetry={fetchOrder}
      >
        {order && (
          <VStack gap={5}>
            {creditWarning && (
              <Banner
                status="warning"
                title="Cảnh báo vượt hạn mức tín dụng khách hàng"
                description={creditWarning}
                collapsible={false}
                endContent={
                  <HStack gap={2}>
                    <Button
                      variant="primary"
                      label="Tôi xác nhận duyệt đơn vượt hạn mức"
                      onClick={() => handleConfirm(true)}
                    />
                    <Button
                      variant="secondary"
                      label="Hủy"
                      onClick={() => setCreditWarning(null)}
                    />
                  </HStack>
                }
              />
            )}

            <Grid columns={3} gap={4}>
              <GridSpan columns={2}>
                <Card>
                  <VStack gap={4}>
                    <Heading level={3}>Thông tin giao nhận &amp; Khách hàng</Heading>
                    <MetadataList columns={2}>
                      <MetadataListItem label="Khách hàng">
                        <Link href={`/customers/${order.ma_khach_hang}`}>
                          {order.ten_khach_hang || `Mã #${order.ma_khach_hang}`}
                        </Link>
                      </MetadataListItem>
                      <MetadataListItem label="Trạng thái đơn">
                        <StatusBadge status={order.trang_thai} label={STATUS_LABELS[order.trang_thai]} />
                      </MetadataListItem>
                      <MetadataListItem label="Địa chỉ giao hàng">
                        {order.dia_chi_giao_hang}
                      </MetadataListItem>
                      <MetadataListItem label="Hạn giao hàng yêu cầu">
                        {formatDate(order.ngay_giao_hang_yc)}
                      </MetadataListItem>
                      <MetadataListItem label="Ngày giao thực tế">
                        {formatDate(order.ngay_giao_thuc_te)}
                      </MetadataListItem>
                      <MetadataListItem label="Nhân viên bán hàng">
                        {order.ten_nguoi_ban || '—'}
                      </MetadataListItem>
                      <MetadataListItem label="Ghi chú">
                        {order.ghi_chu || 'Không có ghi chú'}
                      </MetadataListItem>
                    </MetadataList>
                  </VStack>
                </Card>
              </GridSpan>

              <Card>
                <VStack gap={4}>
                  <Heading level={3}>Tổng kết thanh toán</Heading>
                  <VStack gap={2}>
                    <HStack hAlign="between">
                      <Text type="supporting">Tiền hàng:</Text>
                      <Text type="body" hasTabularNumbers>
                        {formatCurrency(order.tong_tien_hang)}
                      </Text>
                    </HStack>
                    <HStack hAlign="between">
                      <Text type="supporting">Giảm giá:</Text>
                      <Text type="body" hasTabularNumbers>
                        - {formatCurrency(order.tien_giam_gia)}
                      </Text>
                    </HStack>
                    <HStack hAlign="between">
                      <Text type="supporting">Tiền thuế:</Text>
                      <Text type="body" hasTabularNumbers>
                        {formatCurrency(order.tien_thue)}
                      </Text>
                    </HStack>
                  </VStack>
                  <HStack hAlign="between" vAlign="center">
                    <Text type="label">Tổng thanh toán:</Text>
                    <Text type="label" hasTabularNumbers>
                      {formatCurrency(order.tong_thanh_toan)}
                    </Text>
                  </HStack>
                </VStack>
              </Card>
            </Grid>

            <Card>
              <VStack gap={4}>
                <Heading level={3}>
                  Chi tiết sản phẩm đặt hàng ({order.lines?.length || 0} sản phẩm)
                </Heading>
                <AsyncPanel
                  isLoading={false}
                  isEmpty={lineRows.length === 0}
                  emptyTitle="Không có dòng sản phẩm nào."
                >
                  <Table<OrderLineRow>
                    data={lineRows}
                    idKey="id"
                    columns={[
                      {
                        key: 'ma_san_pham',
                        header: 'Mã hàng',
                        width: proportional(1),
                        renderCell: (row) => row.ma_san_pham,
                      },
                      {
                        key: 'ten_san_pham',
                        header: 'Tên sản phẩm',
                        width: proportional(2),
                        renderCell: (row) => row.ten_san_pham,
                      },
                      {
                        key: 'so_luong',
                        header: 'Số lượng',
                        width: proportional(1),
                        align: 'center',
                        renderCell: (row) => row.so_luong,
                      },
                      {
                        key: 'don_gia',
                        header: 'Đơn giá',
                        width: proportional(1),
                        align: 'end',
                        renderCell: (row) => row.don_gia,
                      },
                      {
                        key: 'giam_gia',
                        header: 'Giảm giá',
                        width: proportional(1),
                        align: 'center',
                        renderCell: (row) => row.giam_gia,
                      },
                      {
                        key: 'thanh_tien',
                        header: 'Thành tiền',
                        width: proportional(1),
                        align: 'end',
                        renderCell: (row) => row.thanh_tien,
                      },
                      {
                        key: 'trang_thai',
                        header: 'Trạng thái giao',
                        width: proportional(1),
                        align: 'center',
                        renderCell: (row) => <StatusBadge status={row.trang_thai} />,
                      },
                    ] satisfies TableColumn<OrderLineRow>[]}
                  />
                </AsyncPanel>
              </VStack>
            </Card>
          </VStack>
        )}
      </AsyncPanel>

      <Dialog
        isOpen={cancelOpen}
        onOpenChange={setCancelOpen}
        purpose="form"
        width={440}
      >
        <VStack gap={4}>
          <Text as="h2" type="large" weight="semibold">
            Hủy đơn hàng
          </Text>
          <TextInput
            label="Nhập lý do hủy đơn hàng:"
            value={cancelReason}
            onChange={setCancelReason}
            isDisabled={actionLoading}
          />
          <HStack gap={2} hAlign="end">
            <Button
              variant="secondary"
              label="Đóng"
              isDisabled={actionLoading}
              onClick={() => setCancelOpen(false)}
            />
            <Button
              variant="destructive"
              label="Hủy đơn hàng"
              isDisabled={!cancelReason.trim() || actionLoading}
              isLoading={actionLoading}
              onClick={() => handleCancel(cancelReason)}
            />
          </HStack>
        </VStack>
      </Dialog>
    </PageScaffold>
  );
};
