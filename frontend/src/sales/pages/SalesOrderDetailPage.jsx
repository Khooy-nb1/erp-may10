import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Truck, X } from 'lucide-react';
import { toast } from '../components/ui/toast.jsx';
import { getOrderById, confirmOrder, cancelOrder } from '../services/orderService.js';
import { useAuth } from '../../components/rbac/AuthContext.jsx';
import { hasAnyRole, isAdmin as isAdminRole } from '../config/permissions.js';
import { ApiError } from '../services/client.js';
import { formatCurrency, formatDate } from '../lib/format.js';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { AsyncPanel } from '../components/common/AsyncPanel.jsx';
import { StatusBadge, statusLabel } from '../components/common/StatusBadge.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { MetadataList, MetadataListItem } from '../components/ui/MetadataList.jsx';
import { Table, proportional } from '../components/ui/Table.jsx';
import { Heading, Text } from '../components/ui/Typography.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { ReasonDialog } from '../components/ui/ReasonDialog.jsx';
import { DeliveryCreateDialog } from '../components/deliveries/DeliveryCreateDialog.jsx';

/**
 * Sales-order detail with the confirm / cancel workflow
 * (PH1 `pages/orders/SalesOrderDetailPage.tsx`, ported 1:1 for Step 6H).
 *
 * Confirming an order that breaks the customer's credit limit answers 409
 * `CUSTOMER_CREDIT_LIMIT_EXCEEDED`; when the failure carries an
 * `acknowledgeCreditLimit` field, the page shows the warning banner and only a
 * second, explicit confirm resends the request with that flag set.
 *
 * Core adaptations: `toast` comes from the module's bridge over Core's `Toast`
 * (PH1 used `sonner`), `ApiError` comes from the module client (same `code`
 * / `details` shape as PH1 `services/api.ts`), `useAuth` comes from Core's RBAC
 * context (`user.vai_tro`), and in-module links move under Core's `/sales` mount.
 */

/** `da_giao` reads "Đã giao hàng" on this screen; the shared badge labels it "Đã giao". */
const STATUS_LABELS = {
  da_giao: 'Đã giao hàng',
};

export function SalesOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [creditWarning, setCreditWarning] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deliveryOpen, setDeliveryOpen] = useState(false);

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
          toast.error(err.message);
        }
      } else {
        toast.error(err instanceof Error ? err.message : 'Xác nhận đơn hàng thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (reason) => {
    if (!reason || !reason.trim()) {
      return;
    }

    setActionLoading(true);
    try {
      const cancelled = await cancelOrder(orderId, reason.trim());
      setOrder(cancelled);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hủy đơn hàng thất bại');
    } finally {
      setActionLoading(false);
      setCancelOpen(false);
    }
  };

  const isPending = order?.trang_thai === 'cho_xac_nhan';
  const isConfirmed = order?.trang_thai === 'da_xac_nhan';
  const isAdmin = isAdminRole(user);
  const isSales = hasAnyRole(user, ['ban_hang', 'admin']);

  const lineRows = (order?.lines ?? []).map((line) => ({
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
          ? `Ngày đặt: ${formatDate(order.ngay_dat_hang)} • Trạng thái: ${statusLabel(order.trang_thai)}`
          : undefined
      }
      breadcrumbs={[
        { label: 'Đơn bán hàng', href: '/sales/orders' },
        { label: order?.ma_don_ban ?? 'Chi tiết' },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<ArrowLeft size={16} aria-hidden />}
            href="/sales/orders"
          >
            Danh sách đơn
          </Button>
          {order && (
            <Button
              variant="secondary"
              icon={<Truck size={16} aria-hidden />}
              onClick={() => setDeliveryOpen(true)}
            >
              Lập đợt giao hàng
            </Button>
          )}
          {isSales && isPending && (
            <Button
              variant="primary"
              icon={<Check size={16} aria-hidden />}
              // The credit-limit Banner carries its own primary while it is open (G7).
              disabled={actionLoading || Boolean(creditWarning)}
              onClick={() => handleConfirm(false)}
            >
              Xác nhận đơn hàng
            </Button>
          )}
          {(isPending || (isConfirmed && isAdmin)) && (
            <Button
              variant="secondary"
              icon={<X size={16} aria-hidden />}
              disabled={actionLoading}
              onClick={() => setCancelOpen(true)}
            >
              Hủy đơn hàng
            </Button>
          )}
        </div>
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
          <div className="flex flex-col gap-5">
            {creditWarning && (
              <Banner
                status="warning"
                title="Cảnh báo vượt hạn mức tín dụng khách hàng"
                description={creditWarning}
                endContent={
                  <div className="flex flex-row gap-2">
                    <Button variant="primary" onClick={() => handleConfirm(true)}>
                      Tôi xác nhận duyệt đơn vượt hạn mức
                    </Button>
                    <Button variant="secondary" onClick={() => setCreditWarning(null)}>
                      Hủy
                    </Button>
                  </div>
                }
              />
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Card className="flex flex-col gap-4">
                  <Heading level={3}>Thông tin giao nhận &amp; Khách hàng</Heading>
                  <MetadataList columns={2}>
                    <MetadataListItem label="Khách hàng">
                      <TextLink to={`/sales/customers/${order.ma_khach_hang}`}>
                        {order.ten_khach_hang || `Mã #${order.ma_khach_hang}`}
                      </TextLink>
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
                </Card>
              </div>

              <Card className="flex flex-col gap-4">
                <Heading level={3}>Tổng kết thanh toán</Heading>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row justify-between gap-4">
                    <Text variant="supporting">Tiền hàng:</Text>
                    <Text variant="body" className="tabular-nums">
                      {formatCurrency(order.tong_tien_hang)}
                    </Text>
                  </div>
                  <div className="flex flex-row justify-between gap-4">
                    <Text variant="supporting">Giảm giá:</Text>
                    <Text variant="body" className="tabular-nums">
                      - {formatCurrency(order.tien_giam_gia)}
                    </Text>
                  </div>
                  <div className="flex flex-row justify-between gap-4">
                    <Text variant="supporting">Tiền thuế:</Text>
                    <Text variant="body" className="tabular-nums">
                      {formatCurrency(order.tien_thue)}
                    </Text>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-4">
                  <Text variant="label">Tổng thanh toán:</Text>
                  <Text variant="label" className="tabular-nums">
                    {formatCurrency(order.tong_thanh_toan)}
                  </Text>
                </div>
              </Card>
            </div>

            <Card className="flex flex-col gap-4">
              <Heading level={3}>
                Chi tiết sản phẩm đặt hàng ({order.lines?.length || 0} sản phẩm)
              </Heading>
              <AsyncPanel
                isLoading={false}
                isEmpty={lineRows.length === 0}
                emptyTitle="Không có dòng sản phẩm nào."
              >
                <Table
                  data={lineRows}
                  idKey="id"
                  density="balanced"
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
                      renderCell: (row) => (
                        <span className="block max-w-[280px] truncate" title={row.ten_san_pham}>
                          {row.ten_san_pham}
                        </span>
                      ),
                    },
                    {
                      key: 'so_luong',
                      header: 'Số lượng',
                      width: proportional(1),
                      align: 'end',
                      renderCell: (row) => <Text className="tabular-nums">{row.so_luong}</Text>,
                    },
                    {
                      key: 'don_gia',
                      header: 'Đơn giá',
                      width: proportional(1),
                      align: 'end',
                      renderCell: (row) => <Text className="tabular-nums">{row.don_gia}</Text>,
                    },
                    {
                      key: 'giam_gia',
                      header: 'Giảm giá',
                      width: proportional(1),
                      align: 'end',
                      renderCell: (row) => <Text className="tabular-nums">{row.giam_gia}</Text>,
                    },
                    {
                      key: 'thanh_tien',
                      header: 'Thành tiền',
                      width: proportional(1),
                      align: 'end',
                      renderCell: (row) => <Text className="tabular-nums">{row.thanh_tien}</Text>,
                    },
                    {
                      key: 'trang_thai',
                      header: 'Trạng thái giao',
                      width: proportional(1),
                      align: 'start',
                      renderCell: (row) => <StatusBadge status={row.trang_thai} />,
                    },
                  ]}
                />
              </AsyncPanel>
            </Card>
          </div>
        )}
      </AsyncPanel>

      <ReasonDialog
        isOpen={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy đơn bán hàng"
        label="Lý do hủy"
        value={cancelReason}
        onChange={setCancelReason}
        submitLabel="Xác nhận hủy"
        isSubmitting={actionLoading}
        onSubmit={() => handleCancel(cancelReason)}
      />

      <DeliveryCreateDialog
        isOpen={deliveryOpen}
        onOpenChange={setDeliveryOpen}
        presetOrderId={order?.id ?? null}
        onCreated={(deliveryId) => navigate(`/sales/deliveries/${deliveryId}`)}
      />
    </PageScaffold>
  );
}
