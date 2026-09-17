import React, { useEffect, useState } from 'react';
import { createInvoice } from '../../services/invoiceService.js';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { DateInput } from '../ui/DateInput.jsx';
import { NumberInput } from '../ui/NumberInput.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { toast } from '../ui/toast.jsx';
import { fieldStatus, firstFieldError, invoiceFieldErrors, serverFieldErrors, toWireAmount } from '../../lib/validation.js';

/**
 * Invoice creation as a modal, ported from the old `/invoices/new` page so the
 * invoice list can issue one without losing its filter and page state.
 * (Ported 1:1 from PH1 `components/invoices/InvoiceCreateDialog.tsx`.)
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {(invoiceId: number | string) => void} [props.onCreated] Receives the new invoice id once the API accepts it; the caller decides where to go next.
 */
export function InvoiceCreateDialog({ isOpen, onOpenChange, onCreated }) {
  const formId = 'invoice-create-form';

  const [orderId, setOrderId] = useState(null);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Each open starts from a clean form, with the issue date defaulted to today.
  useEffect(() => {
    if (!isOpen) return;
    setOrderId(null);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(0);
    setNotes('');
    setIsSubmitting(false);
    setFieldErrors({});
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Same rules and messages as `createInvoiceSchema`; the server re-checks anyway.
    const localErrors = invoiceFieldErrors({ orderId, issueDate, paidAmount, notes });
    const firstError = firstFieldError(localErrors);
    if (firstError) {
      setFieldErrors(localErrors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const invoice = await createInvoice({
        ma_don_ban_hang: Number(orderId),
        ngay_xuat_hoa_don: issueDate,
        so_tien_da_thu: toWireAmount(paidAmount),
        ghi_chu: notes.trim() || null,
      });

      onCreated?.(invoice.id);
      onOpenChange(false);
    } catch (err) {
      setFieldErrors(serverFieldErrors(err, ['ma_don_ban_hang', 'ngay_xuat_hoa_don', 'so_tien_da_thu', 'ghi_chu']));
      toast.error(err instanceof Error ? err : 'Không thể xuất hóa đơn bán hàng.');
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
        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận xuất hóa đơn'}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      title="Xuất hóa đơn"
      className="max-w-lg"
      footer={footer}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1"
      >
        <NumberInput
          label="ID Đơn bán hàng *"
          placeholder="Nhập ID đơn hàng cần xuất hóa đơn (VD: 1)"
          description="Hóa đơn chỉ được tạo cho đơn hàng đã xác nhận và chưa từng được xuất hóa đơn trước đó."
          value={orderId}
          onChange={setOrderId}
          hasClear
          status={fieldStatus(fieldErrors, 'ma_don_ban_hang')}
          className="w-full"
        />

        <DateInput
          label="Ngày xuất hóa đơn *"
          description="Hạn thanh toán sẽ được hệ thống tính tự động dựa trên số ngày công nợ của khách hàng."
          value={issueDate ? issueDate : undefined}
          onChange={(value) => setIssueDate(value ?? '')}
          status={fieldStatus(fieldErrors, 'ngay_xuat_hoa_don')}
          className="w-full"
        />

        <NumberInput
          label="Số tiền tạm ứng / đã thu ban đầu (VNĐ)"
          min={0}
          value={paidAmount}
          onChange={(value) => setPaidAmount(Math.max(0, Number(value) || 0))}
          status={fieldStatus(fieldErrors, 'so_tien_da_thu')}
          className="w-full"
        />

        <Textarea
          label="Ghi chú hóa đơn"
          rows={2}
          value={notes}
          onChange={setNotes}
          status={fieldStatus(fieldErrors, 'ghi_chu')}
          className="w-full"
        />
      </form>
    </Dialog>
  );
}
