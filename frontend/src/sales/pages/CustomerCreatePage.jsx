import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomer } from '../services/customerService.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { NumberInput } from '../components/ui/NumberInput.jsx';
import { Textarea } from '../components/ui/Textarea.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { FormSection } from '../components/common/FormSection.jsx';

/**
 * Customer creation (PH1 \`pages/customers/CustomerCreatePage.tsx\`, ported 1:1 for Step 6H).
 *
 * PH1 used \`react-hook-form\` + \`zod\`; Core carries neither, so the same rules live in
 * \`validate(values)\` below with PH1's exact messages, and the \`reValidateMode: 'onChange'\`
 * behaviour is reproduced by \`setField\` re-checking a field that already shows an error once
 * the form has been submitted (same as rhf after the first submit).
 */

const CUSTOMER_TYPES = ['to_chuc', 'ca_nhan', 'dai_ly', 'xuat_khau'];

const LOAI_KHACH_HANG_OPTIONS = [
  { value: 'to_chuc', label: 'Tổ chức / Doanh nghiệp' },
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'dai_ly', label: 'Đại lý phân phối' },
  { value: 'xuat_khau', label: 'Khách xuất khẩu' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isCustomerType(value) {
  return value !== null && CUSTOMER_TYPES.includes(value);
}

const EMPTY_FORM = {
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
};

/** Field-level rules mirroring PH1's zod schema (same messages, same coercion). */
function validateField(name, values) {
  switch (name) {
    case 'ten_khach_hang':
      return values.ten_khach_hang.trim() === '' ? 'Tên khách hàng không được để trống' : null;
    case 'loai_khach_hang':
      return isCustomerType(values.loai_khach_hang) ? null : 'Loại khách hàng không hợp lệ';
    case 'so_dien_thoai':
      return values.so_dien_thoai.trim().length < 8 ? 'Số điện thoại từ 8 ký tự' : null;
    case 'email': {
      const email = values.email.trim();
      if (email === '') return null;
      return EMAIL_PATTERN.test(email) ? null : 'Email không đúng định dạng';
    }
    case 'dia_chi':
      return values.dia_chi.trim() === '' ? 'Địa chỉ không được để trống' : null;
    case 'tinh_thanh_pho':
      return values.tinh_thanh_pho.trim() === '' ? 'Tỉnh/thành phố không được để trống' : null;
    case 'han_muc_cong_no':
      return Number(values.han_muc_cong_no) < 0 ? 'Hạn mức không được âm' : null;
    case 'so_ngay_cong_no':
      return Number(values.so_ngay_cong_no) < 0 ? 'Số ngày không được âm' : null;
    default:
      return null;
  }
}

const VALIDATED_FIELDS = [
  'ten_khach_hang',
  'loai_khach_hang',
  'so_dien_thoai',
  'email',
  'dia_chi',
  'tinh_thanh_pho',
  'han_muc_cong_no',
  'so_ngay_cong_no',
];

function validateAll(values) {
  const next = {};
  for (const field of VALIDATED_FIELDS) {
    const message = validateField(field, values);
    if (message) next[field] = message;
  }
  return next;
}

export function CustomerCreatePage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  /** rhf's post-submit behaviour: an edited field re-checks itself immediately. */
  const setField = (name, value) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (hasSubmitted) {
        setErrors((currentErrors) => {
          const message = validateField(name, next);
          const nextErrors = { ...currentErrors };
          if (message) nextErrors[name] = message;
          else delete nextErrors[name];
          return nextErrors;
        });
      }
      return next;
    });
  };

  const statusOf = (name) => (errors[name] ? { type: 'error', message: errors[name] } : undefined);

  const onSubmit = async (event) => {
    event.preventDefault();
    setServerError(null);
    setHasSubmitted(true);

    const nextErrors = validateAll(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const created = await createCustomer({
        ten_khach_hang: values.ten_khach_hang,
        loai_khach_hang: values.loai_khach_hang,
        ma_so_thue: values.ma_so_thue,
        so_dien_thoai: values.so_dien_thoai,
        email: values.email,
        dia_chi: values.dia_chi,
        tinh_thanh_pho: values.tinh_thanh_pho,
        nguoi_lien_he: values.nguoi_lien_he,
        han_muc_cong_no: Number(values.han_muc_cong_no) || 0,
        so_ngay_cong_no: Number(values.so_ngay_cong_no) || 0,
        ghi_chu: values.ghi_chu,
      });
      navigate('/sales/customers/' + created.id);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Không thể tạo khách hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageScaffold
      title="Thêm khách hàng mới"
      subtitle="Khởi tạo hồ sơ khách hàng và thiết lập hạn mức tín dụng"
      breadcrumbs={[{ label: 'Khách hàng', href: '/sales/customers' }, { label: 'Thêm khách hàng mới' }]}
      actions={
        <Button variant="secondary" href="/sales/customers">
          Hủy bỏ
        </Button>
      }
    >
      <div className="flex w-full max-w-[720px] flex-col gap-5">
        {serverError && (
          <Banner
            status="error"
            title="Đã xảy ra lỗi"
            description={serverError}
            endContent={
              <Button variant="secondary" size="sm" onClick={() => setServerError(null)}>
                Thử lại
              </Button>
            }
          />
        )}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormSection title="Thông tin định danh">
            <Input
              label="Tên khách hàng / Đơn vị *"
              value={values.ten_khach_hang}
              onChange={(value) => setField('ten_khach_hang', value)}
              status={statusOf('ten_khach_hang')}
            />

            <Select
              label="Loại khách hàng *"
              options={LOAI_KHACH_HANG_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={values.loai_khach_hang}
              onChange={(value) => {
                if (isCustomerType(value)) setField('loai_khach_hang', value);
              }}
              className="w-full"
            />

            <Input
              label="Mã số thuế"
              value={values.ma_so_thue ?? ''}
              onChange={(value) => setField('ma_so_thue', value)}
            />

            <Input
              label="Số điện thoại liên hệ *"
              value={values.so_dien_thoai}
              onChange={(value) => setField('so_dien_thoai', value)}
              status={statusOf('so_dien_thoai')}
            />

            <Input
              label="Địa chỉ Email"
              type="email"
              value={values.email ?? ''}
              onChange={(value) => setField('email', value)}
              status={statusOf('email')}
            />
          </FormSection>

          <FormSection title="Liên hệ &amp; địa chỉ">
            <Input
              label="Địa chỉ trụ sở / nhận hàng *"
              value={values.dia_chi}
              onChange={(value) => setField('dia_chi', value)}
              status={statusOf('dia_chi')}
            />

            <Input
              label="Tỉnh / Thành phố *"
              value={values.tinh_thanh_pho}
              onChange={(value) => setField('tinh_thanh_pho', value)}
              status={statusOf('tinh_thanh_pho')}
            />

            <Input
              label="Người liên hệ đại diện"
              value={values.nguoi_lien_he ?? ''}
              onChange={(value) => setField('nguoi_lien_he', value)}
            />
          </FormSection>

          <FormSection title="Điều khoản thanh toán">
            <NumberInput
              label="Hạn mức công nợ (VNĐ)"
              value={values.han_muc_cong_no}
              onChange={(value) => setField('han_muc_cong_no', value)}
              hasClear
              status={statusOf('han_muc_cong_no')}
            />

            <NumberInput
              label="Số ngày được nợ (ngày)"
              value={values.so_ngay_cong_no}
              onChange={(value) => setField('so_ngay_cong_no', value)}
              hasClear
              status={statusOf('so_ngay_cong_no')}
            />

            <Textarea
              label="Ghi chú"
              value={values.ghi_chu ?? ''}
              onChange={(value) => setField('ghi_chu', value)}
            />
          </FormSection>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" href="/sales/customers">
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu khách hàng'}
            </Button>
          </div>
        </form>
      </div>
    </PageScaffold>
  );
}
