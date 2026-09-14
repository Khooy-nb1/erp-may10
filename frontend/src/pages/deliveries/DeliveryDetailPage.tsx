import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Check, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Delivery, DeliveryStatus } from '../../types/delivery.js';
import { getDeliveryById, startDelivery, completeDelivery, failDelivery } from '../../services/deliveryService.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { AsyncPanel } from '../../components/common/AsyncPanel.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { AlertDialog } from '../../components/ui/AlertDialog.js';
import { Banner } from '../../components/ui/Banner.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { MetadataList, MetadataListItem } from '../../components/ui/MetadataList.js';
import { ReasonDialog } from '../../components/ui/ReasonDialog.js';
import { Text } from '../../components/ui/Typography.js';
import { TextLink } from '../../components/ui/TextLink.js';
import { formatDate } from '../../lib/format.js';

/** `da_giao` reads "Đã giao thành công" on this screen; the shared badge labels it "Đã giao". */
const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  cho_giao: 'Chờ giao hàng',
  dang_giao: 'Đang vận chuyển',
  da_giao: 'Đã giao thành công',
  that_bai: 'Giao thất bại',
};

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const deliveryId = Number(id);
  const { user } = useAuth();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState<boolean>(false);
  const [failDialogOpen, setFailDialogOpen] = useState<boolean>(false);
  const [failReason, setFailReason] = useState<string>('');

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
      toast.error(err instanceof Error ? err.message : 'Không thể bắt đầu vận chuyển');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const updated = await completeDelivery(deliveryId);
      setDelivery(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xác nhận hoàn thành');
    } finally {
      setActionLoading(false);
      setConfirmCompleteOpen(false);
    }
  };

  const handleFail = async () => {
    const reason = failReason.trim();
    if (!reason) {
      return;
    }
    setActionLoading(true);
    try {
      const updated = await failDelivery(deliveryId, reason);
      setDelivery(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật thất bại');
    } finally {
      setActionLoading(false);
      setFailDialogOpen(false);
    }
  };

  const isWarehouseOrAdmin = user?.vai_tro === 'kho' || user?.vai_tro === 'admin';
  const isPending = delivery?.trang_thai === 'cho_giao';
  const isInTransit = delivery?.trang_thai === 'dang_giao';

  return (
    <PageScaffold
      title={delivery ? `Phiếu giao hàng: ${delivery.ma_giao_hang}` : 'Phiếu giao hàng'}
      subtitle={
        delivery
          ? `Ngày giao: ${formatDate(delivery.ngay_giao)} • Trạng thái: ${DELIVERY_STATUS_LABELS[delivery.trang_thai]}`
          : undefined
      }
      breadcrumbs={[
        { label: 'Giao hàng', href: '/deliveries' },
        { label: delivery?.ma_giao_hang ?? 'Chi tiết' },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<ArrowLeft size={16} aria-hidden />}
            href="/deliveries"
          >
            Danh sách giao hàng
          </Button>
          {delivery && isWarehouseOrAdmin && isPending && (
            <Button
              variant="primary"
              icon={<Truck size={16} aria-hidden />}
              disabled={actionLoading}
              onClick={handleStart}
            >
              Bắt đầu vận chuyển
            </Button>
          )}
          {delivery && isWarehouseOrAdmin && isInTransit && (
            <>
              <Button
                variant="primary"
                icon={<Check size={16} aria-hidden />}
                disabled={actionLoading}
                onClick={() => setConfirmCompleteOpen(true)}
              >
                Xác nhận giao thành công
              </Button>
              <Button
                variant="destructive"
                icon={<X size={16} aria-hidden />}
                disabled={actionLoading}
                onClick={() => {
                  setFailReason('');
                  setFailDialogOpen(true);
                }}
              >
                Báo giao thất bại
              </Button>
            </>
          )}
        </div>
      }
    >
      <AsyncPanel
        isLoading={loading}
        error={error ?? (!delivery ? 'Không tìm thấy phiếu giao hàng' : null)}
        loadingMessage="Đang tải phiếu giao hàng..."
        onRetry={fetchDelivery}
      >
        {delivery && (
          <div className="flex flex-col gap-5">
            <Banner status="info" title="Quy định kỹ thuật (ưu tiên P0 / câu hỏi Q11):">
              <Text variant="supporting">
                Mô hình cơ sở dữ liệu hiện tại quản lý thực hiện giao hàng theo phiếu vận chuyển cấp đầu phiếu (`giao_hang`). Việc hoàn thành đợt giao không tự động trừ tồn kho (`ton_kho` quản lý nguyên phụ liệu ở phân hệ Kho) và không cập nhật chi tiết dòng sản phẩm.
              </Text>
            </Banner>

            <Card className="p-4">
              <MetadataList title="Thông tin phiếu giao hàng" columns={2}>
                <MetadataListItem label="Đơn bán hàng liên kết:">
                  <TextLink to={`/sales-orders/${delivery.ma_don_ban_hang}`}>
                    {delivery.ma_don_ban || `Đơn hàng #${delivery.ma_don_ban_hang}`}
                  </TextLink>
                </MetadataListItem>
                <MetadataListItem label="Trạng thái vận chuyển:">
                  <StatusBadge
                    status={delivery.trang_thai}
                    label={DELIVERY_STATUS_LABELS[delivery.trang_thai]}
                  />
                </MetadataListItem>
                <MetadataListItem label="Kho hàng xuất:">
                  {delivery.ten_kho || `Kho #${delivery.ma_kho}`}
                </MetadataListItem>
                <MetadataListItem label="Ngày giao hàng:">{formatDate(delivery.ngay_giao)}</MetadataListItem>
                <MetadataListItem label="Người nhận hàng:">{delivery.ten_nguoi_nhan}</MetadataListItem>
                <MetadataListItem label="Phương tiện vận chuyển:">
                  {delivery.phuong_tien_van_chuyen || 'Chưa xác định'}
                </MetadataListItem>
                <MetadataListItem label="Địa chỉ nhận hàng:">{delivery.dia_chi_giao}</MetadataListItem>
                <MetadataListItem label="Nhân viên giao nhận:">{delivery.ten_nguoi_giao || '—'}</MetadataListItem>
                <MetadataListItem label="Ghi chú điều phối:">{delivery.ghi_chu || 'Không có ghi chú'}</MetadataListItem>
              </MetadataList>
            </Card>
          </div>
        )}
      </AsyncPanel>

      <AlertDialog
        isOpen={confirmCompleteOpen}
        onOpenChange={setConfirmCompleteOpen}
        title="Xác nhận giao thành công"
        description="Xác nhận hoàn thành đợt giao hàng này? (Quy trình đầu phiếu, không trừ tồn kho vật tư)."
        actionLabel="Xác nhận giao thành công"
        cancelLabel="Hủy"
        actionVariant="primary"
        isActionLoading={actionLoading}
        onAction={handleComplete}
      />

      <ReasonDialog
        isOpen={failDialogOpen}
        onOpenChange={setFailDialogOpen}
        title="Báo giao thất bại"
        label="Lý do giao thất bại"
        value={failReason}
        onChange={setFailReason}
        submitLabel="Xác nhận thất bại"
        actionVariant="destructive"
        isSubmitting={actionLoading}
        onSubmit={handleFail}
      />
    </PageScaffold>
  );
};
