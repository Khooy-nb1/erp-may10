import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { createDelivery } from '../../services/deliveryService.js';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
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
      actions={<Button label="Hủy bỏ" variant="secondary" href="/deliveries" />}
      maxWidth={750}
    >
      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <VStack gap={5}>
          <FormSection title="Thông tin phiếu giao hàng">
            <Grid columns={2} gap={4}>
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
                    width="100%"
                  />
                )}
              />

              <Controller
                name="warehouseId"
                control={control}
                render={({ field }) => (
                  <Selector
                    label="Kho hàng xuất kho *"
                    options={WAREHOUSE_OPTIONS}
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    width="100%"
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
                    width="100%"
                  />
                )}
              />

              <Controller
                name="receiverName"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Người nhận hàng *"
                    placeholder="Họ tên người nhận"
                    value={field.value}
                    onChange={field.onChange}
                    width="100%"
                  />
                )}
              />

              <GridSpan columns={2}>
                <Controller
                  name="deliveryAddress"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Địa chỉ giao nhận *"
                      placeholder="Địa chỉ giao nhận hàng hóa"
                      value={field.value}
                      onChange={field.onChange}
                      width="100%"
                    />
                  )}
                />
              </GridSpan>

              <Controller
                name="transportMethod"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Phương tiện vận chuyển"
                    value={field.value}
                    onChange={field.onChange}
                    width="100%"
                  />
                )}
              />

              <GridSpan columns={2}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      label="Ghi chú điều phối"
                      rows={2}
                      value={field.value}
                      onChange={field.onChange}
                      width="100%"
                    />
                  )}
                />
              </GridSpan>
            </Grid>
          </FormSection>

          <HStack gap={2} hAlign="end">
            <Button label="Hủy" variant="secondary" href="/deliveries" />
            <Button
              type="submit"
              label={isSubmitting ? 'Đang tạo...' : 'Lưu phiếu giao hàng'}
              variant="primary"
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
            />
          </HStack>
        </VStack>
      </form>
    </PageScaffold>
  );
};
