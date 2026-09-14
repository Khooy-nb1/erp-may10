import React, { useEffect, useState } from 'react';
import { createInvoice } from '../../services/invoiceService.js';
import { Button } from '../ui/Button.js';
import { Dialog } from '../ui/Dialog.js';
import { DateInput, type ISODateString } from '../ui/DateInput.js';
import { NumberInput } from '../ui/NumberInput.js';
import { Textarea } from '../ui/Textarea.js';
import { ErrorState } from '../common/ErrorState.js';

export interface InvoiceCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the new invoice id once the API accepts it; the caller decides where to go next. */
  onCreated?: (invoiceId: number | string) => void;
}

/**
 * Invoice creation as a modal, ported from the old `/invoices/new` page so the
 * invoice list can issue one without losing its filter and page state.
 */
export const InvoiceCreateDialog: React.FC<InvoiceCreateDialogProps> = ({
  isOpen,
  onOpenChange,
  onCreated,
}) => {
  const formId = 'invoice-create-form';

  const [orderId, setOrderId] = useState<number | null>(null);
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Each open starts from a clean form, with the issue date defaulted to today.
  useEffect(() => {
    if (!isOpen) return;
    setOrderId(null);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(0);
    setNotes('');
    setIsSubmitting(false);
    setError(null);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderId === null || !Number(orderId)) {
      setError('Vui lòng nhập ID đơn hàng hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const invoice = await createInvoice({
        ma_don_ban_hang: Number(orderId),
        ngay_xuat_hoa_don: issueDate,
        so_tien_da_thu: Number(paidAmount) || 0,
        ghi_chu: notes.trim() || null,
      });

      onCreated?.(invoice.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xuất hóa đơn bán hàng.');
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
        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

        <NumberInput
          label="ID Đơn bán hàng *"
          placeholder="Nhập ID đơn hàng cần xuất hóa đơn (VD: 1)"
          description="Hóa đơn chỉ được tạo cho đơn hàng đã xác nhận và chưa từng được xuất hóa đơn trước đó."
          value={orderId}
          onChange={setOrderId}
          hasClear
          className="w-full"
        />

        <DateInput
          label="Ngày xuất hóa đơn *"
          description="Hạn thanh toán sẽ được hệ thống tính tự động dựa trên số ngày công nợ của khách hàng."
          value={issueDate ? (issueDate as ISODateString) : undefined}
          onChange={(value) => setIssueDate(value ?? '')}
          className="w-full"
        />

        <NumberInput
          label="Số tiền tạm ứng / đã thu ban đầu (VNĐ)"
          min={0}
          value={paidAmount}
          onChange={(value) => setPaidAmount(Math.max(0, Number(value) || 0))}
          className="w-full"
        />

        <Textarea
          label="Ghi chú hóa đơn"
          rows={2}
          value={notes}
          onChange={setNotes}
          className="w-full"
        />
      </form>
    </Dialog>
  );
};
