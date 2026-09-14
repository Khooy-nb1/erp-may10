import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { createDelivery } from '../../services/deliveryService.js';
import { Button } from '../ui/Button.js';
import { Dialog } from '../ui/Dialog.js';
import { Input } from '../ui/Input.js';
import { Textarea } from '../ui/Textarea.js';
import { NumberInput } from '../ui/NumberInput.js';
import { Select } from '../ui/Select.js';
import { DateInput, type ISODateString } from '../ui/DateInput.js';
import { ErrorState } from '../common/ErrorState.js';

interface DeliveryFormData {
  orderId: number | null;
  warehouseId: string;
  deliveryDate: string;
  receiverName: string;
  deliveryAddress: string;
  transportMethod: string;
  notes: string;
}

const WAREHOUSE_OPTIONS = [
  { value: '1', label: 'Kho Nguyên Phụ Liệu Số 1 (KNL01)' },
  { value: '2', label: 'Kho Thành Phẩm May 10 (KTP01)' },
  { value: '3', label: 'Kho Phụ Liệu May Mặc (KPL01)' },
];

/** Fixed defaults the create page opened with; the order link and date are recomputed per open. */
const FORM_FIELDS: Omit<DeliveryFormData, 'orderId' | 'deliveryDate'> = {
  warehouseId: '1',
  receiverName: '',
  deliveryAddress: '',
  transportMethod: 'Xe tải công ty',
  notes: '',
};

export interface DeliveryCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Order preselected in the order field, for the entry point that opens on an order. */
  presetOrderId?: number | null;
  /** Receives the new delivery id once the API accepts it; the caller decides where to go next. */
  onCreated?: (deliveryId: number | string) => void;
}

/**
 * Delivery creation as a modal, ported from the old `/deliveries/new` page so
 * lists and order details can start a delivery without losing their own state.
 */
export const DeliveryCreateDialog: React.FC<DeliveryCreateDialogProps> = ({
  isOpen,
  onOpenChange,
  presetOrderId,
  onCreated,
}) => {
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DeliveryFormData>({
    defaultValues: {
      ...FORM_FIELDS,
      orderId: presetOrderId ?? null,
      deliveryDate: new Date().toISOString().split('T')[0],
    },
  });

  // Each open starts from a clean form, with the entry point's order preselected.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    reset({
      ...FORM_FIELDS,
      orderId: presetOrderId ?? null,
      deliveryDate: new Date().toISOString().split('T')[0],
    });
  }, [isOpen, presetOrderId, reset]);

  const onSubmit = async (data: DeliveryFormData) => {
    if (data.orderId === null || !Number(data.orderId)) {
      setError('Vui lòng nhập ID đơn hàng hợp lệ.');
      return;
    }
    if (!data.receiverName.trim()) {
      setError('Tên người nhận là bắt buộc.');
      return;
    }
    if (!data.deliveryAddress.trim()) {
      setError('Địa chỉ nhận hàng là bắt buộc.');
      return;
    }

    setError(null);

    try {
      const created = await createDelivery({
        ma_don_ban_hang: Number(data.orderId),
        ma_kho: Number(data.warehouseId),
        ngay_giao: data.deliveryDate,
        ten_nguoi_nhan: data.receiverName.trim(),
        dia_chi_giao: data.deliveryAddress.trim(),
        phuong_tien_van_chuyen: data.transportMethod.trim() || null,
        ghi_chu: data.notes.trim() || null,
      });

      onCreated?.(created.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lập đợt giao hàng.');
    }
  };

  const footer = (
    <>
      <Button variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
        Hủy
      </Button>
      <Button
        type="button"
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting}
        onClick={handleSubmit(onSubmit)}
      >
        {isSubmitting ? 'Đang tạo...' : 'Lưu phiếu giao hàng'}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      title="Tạo phiếu giao hàng"
      className="max-w-xl"
      footer={footer}
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="orderId"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="ID đơn bán hàng liên kết *"
                placeholder="VD: 1"
                value={field.value}
                onChange={(value) => field.onChange(value)}
                hasClear
                className="w-full"
              />
            )}
          />

          <Controller
            name="warehouseId"
            control={control}
            render={({ field }) => (
              <Select
                label="Kho hàng xuất kho *"
                options={WAREHOUSE_OPTIONS}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                className="w-full"
              />
            )}
          />

          <Controller
            name="deliveryDate"
            control={control}
            render={({ field }) => (
              <DateInput
                label="Ngày giao hàng *"
                value={field.value ? (field.value as ISODateString) : undefined}
                onChange={(value) => field.onChange(value ?? '')}
                className="w-full"
              />
            )}
          />

          <Controller
            name="receiverName"
            control={control}
            render={({ field }) => (
              <Input
                label="Người nhận hàng *"
                placeholder="Họ tên người nhận"
                value={field.value}
                onChange={field.onChange}
                className="w-full"
              />
            )}
          />

          <div className="sm:col-span-2">
            <Controller
              name="deliveryAddress"
              control={control}
              render={({ field }) => (
                <Input
                  label="Địa chỉ giao nhận *"
                  placeholder="Địa chỉ giao nhận hàng hóa"
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                />
              )}
            />
          </div>

          <Controller
            name="transportMethod"
            control={control}
            render={({ field }) => (
              <Input
                label="Phương tiện vận chuyển"
                value={field.value}
                onChange={field.onChange}
                className="w-full"
              />
            )}
          />

          <div className="sm:col-span-2">
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  label="Ghi chú điều phối"
                  rows={2}
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                />
              )}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
};
