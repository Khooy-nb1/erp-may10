import React, { useEffect, useId, useState } from 'react';
import { createDelivery } from '../../services/deliveryService.js';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Input } from '../ui/Input.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { NumberInput } from '../ui/NumberInput.jsx';
import { Select } from '../ui/Select.jsx';
import { DateInput } from '../ui/DateInput.jsx';
import { ErrorState } from '../common/ErrorState.jsx';

const WAREHOUSE_OPTIONS = [
  { value: '1', label: 'Kho Nguyên Phụ Liệu Số 1 (KNL01)' },
  { value: '2', label: 'Kho Thành Phẩm May 10 (KTP01)' },
  { value: '3', label: 'Kho Phụ Liệu May Mặc (KPL01)' },
];

/** Fixed defaults the create page opened with; the order link and date are recomputed per open. */
const FORM_FIELDS = {
  warehouseId: '1',
  receiverName: '',
  deliveryAddress: '',
  transportMethod: 'Xe tải công ty',
  notes: '',
};

/** Today as `YYYY-MM-DD`, the format the API and the native date control share. */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Delivery creation as a modal, ported from the old `/deliveries/new` page so
 * lists and order details can start a delivery without losing their own state.
 *
 * PH1 drove this form with `react-hook-form` (`useForm` + one `Controller` per
 * field); with no new dependency allowed each field is plain local state and the
 * submit-time checks live in `validate()`, keeping PH1's order and wording.
 * (Ported 1:1 from PH1 `components/deliveries/DeliveryCreateDialog.tsx`.)
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {number | null} [props.presetOrderId] Order preselected in the order field, for the entry point that opens on an order.
 * @param {(deliveryId: number | string) => void} [props.onCreated] Receives the new delivery id once the API accepts it; the caller decides where to go next.
 */
export function DeliveryCreateDialog({ isOpen, onOpenChange, presetOrderId, onCreated }) {
  const formId = useId();
  const [orderId, setOrderId] = useState(presetOrderId ?? null);
  const [warehouseId, setWarehouseId] = useState(FORM_FIELDS.warehouseId);
  const [deliveryDate, setDeliveryDate] = useState(todayISO);
  const [receiverName, setReceiverName] = useState(FORM_FIELDS.receiverName);
  const [deliveryAddress, setDeliveryAddress] = useState(FORM_FIELDS.deliveryAddress);
  const [transportMethod, setTransportMethod] = useState(FORM_FIELDS.transportMethod);
  const [notes, setNotes] = useState(FORM_FIELDS.notes);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Each open starts from a clean form, with the entry point's order preselected.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsSubmitting(false);
    setOrderId(presetOrderId ?? null);
    setWarehouseId(FORM_FIELDS.warehouseId);
    setDeliveryDate(todayISO());
    setReceiverName(FORM_FIELDS.receiverName);
    setDeliveryAddress(FORM_FIELDS.deliveryAddress);
    setTransportMethod(FORM_FIELDS.transportMethod);
    setNotes(FORM_FIELDS.notes);
  }, [isOpen, presetOrderId]);

  /** PH1's submit-time checks, in order: the first failure is the one shown. */
  const validate = () => {
    if (orderId === null || !Number(orderId)) return 'Vui lòng nhập ID đơn hàng hợp lệ.';
    if (!receiverName.trim()) return 'Tên người nhận là bắt buộc.';
    if (!deliveryAddress.trim()) return 'Địa chỉ nhận hàng là bắt buộc.';
    return null;
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createDelivery({
        ma_don_ban_hang: Number(orderId),
        ma_kho: Number(warehouseId),
        ngay_giao: deliveryDate,
        ten_nguoi_nhan: receiverName.trim(),
        dia_chi_giao: deliveryAddress.trim(),
        phuong_tien_van_chuyen: transportMethod.trim() || null,
        ghi_chu: notes.trim() || null,
      });

      onCreated?.(created.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lập đợt giao hàng.');
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
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1"
      >
        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInput
            label="ID đơn bán hàng liên kết *"
            placeholder="VD: 1"
            value={orderId}
            onChange={setOrderId}
            hasClear
            className="w-full"
          />

          <Select
            label="Kho hàng xuất kho *"
            options={WAREHOUSE_OPTIONS}
            value={warehouseId}
            onChange={setWarehouseId}
            className="w-full"
          />

          <DateInput
            label="Ngày giao hàng *"
            value={deliveryDate ? deliveryDate : undefined}
            onChange={(value) => setDeliveryDate(value ?? '')}
            className="w-full"
          />

          <Input
            label="Người nhận hàng *"
            placeholder="Họ tên người nhận"
            value={receiverName}
            onChange={setReceiverName}
            className="w-full"
          />

          <div className="sm:col-span-2">
            <Input
              label="Địa chỉ giao nhận *"
              placeholder="Địa chỉ giao nhận hàng hóa"
              value={deliveryAddress}
              onChange={setDeliveryAddress}
              className="w-full"
            />
          </div>

          <Input
            label="Phương tiện vận chuyển"
            value={transportMethod}
            onChange={setTransportMethod}
            className="w-full"
          />

          <div className="sm:col-span-2">
            <Textarea
              label="Ghi chú điều phối"
              rows={2}
              value={notes}
              onChange={setNotes}
              className="w-full"
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
