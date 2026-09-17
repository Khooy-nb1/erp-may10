import React, { useEffect, useState } from 'react';
import { createCustomer } from '../../services/customerService.js';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Input } from '../ui/Input.jsx';
import { NumberInput } from '../ui/NumberInput.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { Select } from '../ui/Select.jsx';
import { toast } from '../ui/toast.jsx';
import { CUSTOMER_TYPES, customerFieldError, customerFieldErrors, serverFieldErrors, toWireAmount } from '../../lib/validation.js';
import { FormSection } from '../common/FormSection.jsx';

/**
 * Customer creation as a modal, ported from the old `/sales/customers/new` page so
 * the registry can raise one without losing its filter and page state.
 * (Form fields and rules ported 1:1 from PH1 `pages/customers/CustomerCreatePage.tsx`.)
 *
 * PH1 used `react-hook-form` + `zod`; Core carries neither, so the same rules live in
 * `lib/validation.js` (`customerFieldErrors`) with the backend's exact messages, and the
 * `reValidateMode: 'onChange'` behaviour is reproduced by `setField` re-checking a field that
 * already shows an error once the form has been submitted (same as rhf after the first submit).
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {(customerId: number | string) => void} [props.onCreated] Receives the new customer id once the API accepts it; the caller decides where to go next.
 */

/** PH1's customer types, in the order the create form listed them. */
const LOAI_KHACH_HANG_OPTIONS = [
  { value: 'to_chuc', label: 'Tổ chức / Doanh nghiệp' },
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'dai_ly', label: 'Đại lý phân phối' },
  { value: 'xuat_khau', label: 'Khách xuất khẩu' },
];

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

/** Every field the form can send; used to place the server's field messages. */
const FORM_FIELDS = Object.keys(EMPTY_FORM);

export function CustomerCreateDialog({ isOpen, onOpenChange, onCreated }) {
  const formId = 'customer-create-form';

  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Each open starts from a clean form.
  useEffect(() => {
    if (!isOpen) return;
    setValues(EMPTY_FORM);
    setErrors({});
    setHasSubmitted(false);
    setIsSubmitting(false);
  }, [isOpen]);

  /** rhf's post-submit behaviour: an edited field re-checks itself immediately. */
  const setField = (name, value) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (hasSubmitted) {
        setErrors((currentErrors) => {
          const message = customerFieldError(next, name);
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
    setHasSubmitted(true);

    const nextErrors = customerFieldErrors(values);
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
        han_muc_cong_no: toWireAmount(values.han_muc_cong_no),
        so_ngay_cong_no: toWireAmount(values.so_ngay_cong_no),
        ghi_chu: values.ghi_chu,
      });

      onCreated?.(created.id);
      onOpenChange(false);
    } catch (err) {
      const fieldErrors = serverFieldErrors(err, FORM_FIELDS);
      if (Object.keys(fieldErrors).length > 0) {
        setHasSubmitted(true);
        setErrors((currentErrors) => ({ ...currentErrors, ...fieldErrors }));
      }
      toast.error(err instanceof Error ? err : 'Không thể tạo khách hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
        Hủy
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Đang lưu...' : 'Lưu khách hàng'}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      title="Thêm khách hàng mới"
      description="Khởi tạo hồ sơ khách hàng và thiết lập hạn mức tín dụng"
      className="max-w-2xl"
      footer={footer}
    >
      <form
        id={formId}
        onSubmit={onSubmit}
        noValidate
        className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1"
      >
        <FormSection title="Thông tin định danh">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              className="sm:col-span-2"
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
                if (CUSTOMER_TYPES.includes(value)) setField('loai_khach_hang', value);
              }}
              status={statusOf('loai_khach_hang')}
              className="w-full"
            />

            <Input
              label="Mã số thuế"
              value={values.ma_so_thue ?? ''}
              onChange={(value) => setField('ma_so_thue', value)}
              status={statusOf('ma_so_thue')}
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
          </div>
        </FormSection>

        <FormSection title="Liên hệ &amp; địa chỉ">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              className="sm:col-span-2"
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
              status={statusOf('nguoi_lien_he')}
            />
          </div>
        </FormSection>

        <FormSection title="Điều khoản thanh toán">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              className="sm:col-span-2"
              label="Ghi chú"
              value={values.ghi_chu ?? ''}
              onChange={(value) => setField('ghi_chu', value)}
              status={statusOf('ghi_chu')}
            />
          </div>
        </FormSection>
      </form>
    </Dialog>
  );
}
