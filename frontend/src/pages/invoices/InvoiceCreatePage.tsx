import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInvoice } from '../../services/invoiceService.js';
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { FormSection } from '../../components/common/FormSection.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState<number | null>(null);
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xuất hóa đơn bán hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageScaffold
      title="Xuất hóa đơn bán hàng mới"
      subtitle="Lập hóa đơn tài chính liên kết đơn hàng đã được xác nhận (Kế toán & Admin)"
      breadcrumbs={[{ label: 'Hóa đơn', href: '/invoices' }, { label: 'Xuất hóa đơn bán hàng mới' }]}
      actions={<Button label="Hủy bỏ" variant="secondary" href="/invoices" />}
      maxWidth={650}
    >
      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      <form onSubmit={handleSubmit} noValidate>
        <VStack gap={5}>
          <FormSection title="Thông tin hóa đơn">
            <VStack gap={4}>
              <NumberInput
                label="ID Đơn bán hàng *"
                placeholder="Nhập ID đơn hàng cần xuất hóa đơn (VD: 1)"
                description="Hóa đơn chỉ được tạo cho đơn hàng đã xác nhận và chưa từng được xuất hóa đơn trước đó."
                value={orderId}
                onChange={(value) => setOrderId(value)}
                hasClear
                width="100%"
              />

              <DateInput
                label="Ngày xuất hóa đơn *"
                description="Hạn thanh toán sẽ được hệ thống tính tự động dựa trên số ngày công nợ của khách hàng."
                value={issueDate ? (issueDate as ISODateString) : undefined}
                onChange={(value) => setIssueDate(value ?? '')}
                width="100%"
              />

              <NumberInput
                label="Số tiền tạm ứng / đã thu ban đầu (VNĐ)"
                min={0}
                value={paidAmount}
                onChange={(value) => setPaidAmount(Math.max(0, Number(value) || 0))}
                width="100%"
              />

              <TextArea
                label="Ghi chú hóa đơn"
                rows={2}
                value={notes}
                onChange={(value) => setNotes(value)}
                width="100%"
              />
            </VStack>
          </FormSection>

          <HStack gap={2} hAlign="end">
            <Button label="Hủy" variant="secondary" href="/invoices" />
            <Button
              type="submit"
              label={isSubmitting ? 'Đang xử lý...' : 'Xác nhận xuất hóa đơn'}
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
