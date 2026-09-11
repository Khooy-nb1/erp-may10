import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { createCustomer } from '../../services/customerService.js';
import { Card } from '@astryxdesign/core/Card';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { Banner } from '@astryxdesign/core/Banner';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { FormSection } from '../../components/common/FormSection.js';

const customerFormSchema = z.object({
  ten_khach_hang: z.string().min(1, 'Tên khách hàng không được để trống'),
  loai_khach_hang: z.enum(['to_chuc', 'ca_nhan', 'dai_ly', 'xuat_khau']),
  ma_so_thue: z.string().optional(),
  so_dien_thoai: z.string().min(8, 'Số điện thoại từ 8 ký tự'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  dia_chi: z.string().min(1, 'Địa chỉ không được để trống'),
  tinh_thanh_pho: z.string().min(1, 'Tỉnh/thành phố không được để trống'),
  nguoi_lien_he: z.string().optional(),
  han_muc_cong_no: z.coerce.number().min(0, 'Hạn mức không được âm'),
  so_ngay_cong_no: z.coerce.number().int().min(0, 'Số ngày không được âm'),
  ghi_chu: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

type CustomerType = CustomerFormData['loai_khach_hang'];

const LOAI_KHACH_HANG_OPTIONS: Array<{ value: CustomerType; label: string }> = [
  { value: 'to_chuc', label: 'Tổ chức / Doanh nghiệp' },
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'dai_ly', label: 'Đại lý phân phối' },
  { value: 'xuat_khau', label: 'Khách xuất khẩu' },
];

const CUSTOMER_TYPES: CustomerType[] = ['to_chuc', 'ca_nhan', 'dai_ly', 'xuat_khau'];

function isCustomerType(value: string | null): value is CustomerType {
  return value !== null && (CUSTOMER_TYPES as string[]).includes(value);
}

const emptyToUndefined = (value: string): string | undefined => (value === '' ? undefined : value);

export const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      ten_khach_hang: '',
      loai_khach_hang: 'to_chuc',
      ma_so_thue: '',
      so_dien_thoai: '',
      email: '',
      dia_chi: '',
      tinh_thanh_pho: 'Hà Nội',
      nguoi_lien_he: '',
      han_muc_cong_no: 0,
      so_ngay_cong_no: 0,
      ghi_chu: '',
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    setServerError(null);
    try {
      const created = await createCustomer(data);
      navigate(`/customers/${created.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Không thể tạo khách hàng.');
    }
  };

  return (
    <PageScaffold
      title="Thêm khách hàng mới"
      subtitle="Khởi tạo hồ sơ khách hàng và thiết lập hạn mức tín dụng"
      breadcrumbs={[{ label: 'Khách hàng', href: '/customers' }, { label: 'Thêm khách hàng mới' }]}
      actions={<Button label="Hủy bỏ" variant="secondary" href="/customers" />}
      maxWidth={800}
    >
      {serverError && (
        <Banner
          status="error"
          title="Đã xảy ra lỗi"
          description={serverError}
          collapsible={false}
          endContent={
            <Button label="Thử lại" variant="secondary" size="sm" onClick={() => setServerError(null)} />
          }
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <VStack gap={5}>
          <FormSection title="Thông tin khách hàng">
            <Grid columns={2} gap={4}>
              <GridSpan columns={2}>
                <Controller
                  name="ten_khach_hang"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Tên khách hàng / Đơn vị"
                      value={field.value}
                      onChange={field.onChange}
                      isRequired
                      status={
                        errors.ten_khach_hang
                          ? { type: 'error', message: errors.ten_khach_hang.message }
                          : undefined
                      }
                    />
                  )}
                />
              </GridSpan>

              <Controller
                name="loai_khach_hang"
                control={control}
                render={({ field }) => (
                  <Selector
                    label="Loại khách hàng"
                    options={LOAI_KHACH_HANG_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    value={field.value}
                    onChange={(value) => {
                      if (isCustomerType(value)) field.onChange(value);
                    }}
                    isRequired
                    width="100%"
                  />
                )}
              />

              <Controller
                name="ma_so_thue"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Mã số thuế"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="so_dien_thoai"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Số điện thoại liên hệ"
                    value={field.value}
                    onChange={field.onChange}
                    isRequired
                    status={
                      errors.so_dien_thoai
                        ? { type: 'error', message: errors.so_dien_thoai.message }
                        : undefined
                    }
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Địa chỉ Email"
                    type="email"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    status={
                      errors.email ? { type: 'error', message: errors.email.message } : undefined
                    }
                  />
                )}
              />

              <GridSpan columns={2}>
                <Controller
                  name="dia_chi"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Địa chỉ trụ sở / nhận hàng"
                      value={field.value}
                      onChange={field.onChange}
                      isRequired
                      status={
                        errors.dia_chi ? { type: 'error', message: errors.dia_chi.message } : undefined
                      }
                    />
                  )}
                />
              </GridSpan>

              <Controller
                name="tinh_thanh_pho"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Tỉnh / Thành phố"
                    value={field.value}
                    onChange={field.onChange}
                    isRequired
                    status={
                      errors.tinh_thanh_pho
                        ? { type: 'error', message: errors.tinh_thanh_pho.message }
                        : undefined
                    }
                  />
                )}
              />

              <Controller
                name="nguoi_lien_he"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Người liên hệ đại diện"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </Grid>
          </FormSection>

          <FormSection title="Chính sách công nợ">
            <Grid columns={2} gap={4}>
              <Controller
                name="han_muc_cong_no"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Hạn mức công nợ (VNĐ)"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    status={
                      errors.han_muc_cong_no
                        ? { type: 'error', message: errors.han_muc_cong_no.message }
                        : undefined
                    }
                  />
                )}
              />

              <Controller
                name="so_ngay_cong_no"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Số ngày được nợ (ngày)"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    status={
                      errors.so_ngay_cong_no
                        ? { type: 'error', message: errors.so_ngay_cong_no.message }
                        : undefined
                    }
                  />
                )}
              />

              <GridSpan columns={2}>
                <Controller
                  name="ghi_chu"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      label="Ghi chú"
                      value={field.value ?? ''}
                      onChange={(value) => field.onChange(emptyToUndefined(value) ?? '')}
                    />
                  )}
                />
              </GridSpan>
            </Grid>
          </FormSection>

          <HStack gap={2} hAlign="end">
            <Button label="Hủy" variant="secondary" href="/customers" />
            <Button
              type="submit"
              label={isSubmitting ? 'Đang lưu...' : 'Lưu khách hàng'}
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
