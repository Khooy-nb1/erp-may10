import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createDelivery } from '../../services/deliveryService.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { NumberInput } from '../../components/ui/NumberInput.js';
import { Select } from '../../components/ui/Select.js';
import { DateInput, type ISODateString } from '../../components/ui/DateInput.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { FormSection } from '../../components/common/FormSection.js';
import { ErrorState } from '../../components/common/ErrorState.js';

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

const todayIsoDate = (): string => new Date().toISOString().split('T')[0];

export const DeliveryCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<DeliveryFormData>({
    defaultValues: {
      orderId: null,
      warehouseId: '1',
      deliveryDate: todayIsoDate(),
      receiverName: '',
      deliveryAddress: '',
      transportMethod: 'Xe tải công ty',
      notes: '',
    },
  });

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

      navigate(`/deliveries/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lập đợt giao hàng.');
    }
  };

  return (
    <PageScaffold
      title="Lập đợt giao hàng mới"
      subtitle="Khởi tạo phiếu điều phối giao nhận cấp đầu phiếu (header-only)"
      breadcrumbs={[{ label: 'Giao hàng', href: '/deliveries' }, { label: 'Lập đợt giao hàng mới' }]}
      actions={
        <Button variant="secondary" href="/deliveries">
          Hủy bỏ
        </Button>
      }
    >
      <div className="flex w-full flex-col gap-5 max-w-[750px]">
        {error && <ErrorState message={error} onRetry={() => setError(null)} />}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex w-full flex-col gap-5">
            <FormSection title="Thông tin phiếu giao hàng">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
            </FormSection>

            <div className="flex flex-row items-center justify-end gap-2">
              <Button variant="secondary" href="/deliveries">
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang tạo...' : 'Lưu phiếu giao hàng'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageScaffold>
  );
};
