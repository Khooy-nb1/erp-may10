import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Check, Truck, X } from 'lucide-react';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Link } from '@astryxdesign/core/Link';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { Delivery, DeliveryStatus } from '../../types/delivery.js';
import { getDeliveryById, startDelivery, completeDelivery, failDelivery } from '../../services/deliveryService.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { AsyncPanel } from '../../components/common/AsyncPanel.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

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
  const toast = useToast();

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
      toast({
        body: err instanceof Error ? err.message : 'Không thể bắt đầu vận chuyển',
        type: 'error',
      });
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
      toast({
        body: err instanceof Error ? err.message : 'Không thể xác nhận hoàn thành',
        type: 'error',
      });
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
      toast({
        body: err instanceof Error ? err.message : 'Không thể cập nhật thất bại',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
      setFailDialogOpen(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading || error || !delivery) {
    return (
      <AsyncPanel
        isLoading={loading}
        error={error ?? (!delivery ? 'Không tìm thấy phiếu giao hàng' : null)}
        loadingMessage="Đang tải phiếu giao hàng..."
        onRetry={fetchDelivery}
      >
        {null}
      </AsyncPanel>
    );
  }

  const isWarehouseOrAdmin = user?.vai_tro === 'kho' || user?.vai_tro === 'admin';
  const isPending = delivery.trang_thai === 'cho_giao';
  const isInTransit = delivery.trang_thai === 'dang_giao';

  return (
    <PageScaffold
      title={`Phiếu giao hàng: ${delivery.ma_giao_hang}`}
      subtitle={`Ngày giao: ${formatDate(delivery.ngay_giao)} • Trạng thái: ${delivery.trang_thai}`}
      breadcrumbs={[
        { label: 'Giao hàng', href: '/deliveries' },
        { label: delivery.ma_giao_hang },
      ]}
      actions={
        <HStack gap={2} wrap="wrap">
          <Button
            variant="secondary"
            icon={<ArrowLeft size={16} />}
            label="Danh sách giao hàng"
            href="/deliveries"
          />
          {isWarehouseOrAdmin && isPending && (
            <Button
              variant="primary"
              icon={<Truck size={16} />}
              label="Bắt đầu vận chuyển"
              isDisabled={actionLoading}
              onClick={handleStart}
            />
          )}
          {isWarehouseOrAdmin && isInTransit && (
            <>
              <Button
                variant="primary"
                icon={<Check size={16} />}
                label="Xác nhận giao thành công"
                isDisabled={actionLoading}
                onClick={() => setConfirmCompleteOpen(true)}
              />
              <Button
                variant="destructive"
                icon={<X size={16} />}
                label="Báo giao thất bại"
                isDisabled={actionLoading}
                onClick={() => {
                  setFailReason('');
                  setFailDialogOpen(true);
                }}
              />
            </>
          )}
        </HStack>
      }
    >
      <VStack gap={4}>
        <Banner status="info" collapsible={false} title="Quy định kỹ thuật (P0 / Q11):">
          <Text type="supporting">
            Mô hình cơ sở dữ liệu hiện tại quản lý thực hiện giao hàng theo phiếu vận chuyển cấp đầu phiếu (`giao_hang`). Việc hoàn thành đợt giao không tự động trừ tồn kho (`ton_kho` quản lý nguyên phụ liệu ở phân hệ Kho) và không cập nhật chi tiết dòng sản phẩm.
          </Text>
        </Banner>

        <Card padding={4}>
          <MetadataList title="Thông tin phiếu giao hàng" columns={2}>
            <MetadataListItem label="Đơn bán hàng liên kết:">
              <Link href={`/sales-orders/${delivery.ma_don_ban_hang}`}>
                {delivery.ma_don_ban || `Đơn hàng #${delivery.ma_don_ban_hang}`}
              </Link>
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
      </VStack>

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

      <Dialog
        isOpen={failDialogOpen}
        onOpenChange={setFailDialogOpen}
        purpose="form"
        width={440}
      >
        <VStack gap={4}>
          <Text as="h2" type="large" weight="semibold">
            Báo giao thất bại
          </Text>
          <TextInput
            label="Nhập lý do giao hàng thất bại:"
            value={failReason}
            onChange={(value) => setFailReason(value)}
            isDisabled={actionLoading}
          />
          <HStack gap={2} hAlign="end">
            <Button
              variant="secondary"
              label="Hủy"
              isDisabled={actionLoading}
              onClick={() => setFailDialogOpen(false)}
            />
            <Button
              variant="destructive"
              label="Báo giao thất bại"
              isDisabled={!failReason.trim() || actionLoading}
              isLoading={actionLoading}
              onClick={handleFail}
            />
          </HStack>
        </VStack>
      </Dialog>
    </PageScaffold>
  );
};
