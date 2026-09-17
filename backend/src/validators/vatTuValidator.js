/**
 * ERP May 10 — Vat Tu (Material Master) Validator (FR-01)
 */

const VALID_LOAI_VAT_TU = [
  'vai_chinh',
  'vai_lot',
  'chi_may',
  'cuc_kep',
  'khoa_keo',
  'phu_lieu',
  'bao_bi',
  'hoa_chat',
  'thanh_pham',
];

const VALID_STATUSES = ['dang_su_dung', 'ngung_su_dung'];

function validateVatTuInput(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.ma_vat_tu !== undefined) {
    if (!data.ma_vat_tu || typeof data.ma_vat_tu !== 'string' || !data.ma_vat_tu.trim()) {
      errors.push('Mã vật tư là bắt buộc.');
    } else if (data.ma_vat_tu.trim().length < 2) {
      errors.push('Mã vật tư phải có ít nhất 2 ký tự.');
    }
  }

  if (!isUpdate || data.ten_vat_tu !== undefined) {
    if (!data.ten_vat_tu || typeof data.ten_vat_tu !== 'string' || !data.ten_vat_tu.trim()) {
      errors.push('Tên vật tư là bắt buộc.');
    } else if (data.ten_vat_tu.trim().length < 2) {
      errors.push('Tên vật tư phải có ít nhất 2 ký tự.');
    }
  }

  if (!isUpdate || data.loai_vat_tu !== undefined) {
    if (data.loai_vat_tu && !VALID_LOAI_VAT_TU.includes(data.loai_vat_tu)) {
      errors.push(`Loại vật tư không hợp lệ. Danh sách hợp lệ: ${VALID_LOAI_VAT_TU.join(', ')}.`);
    }
  }

  if (!isUpdate || data.ma_don_vi_tinh !== undefined) {
    const dvt = parseInt(data.ma_don_vi_tinh, 10);
    if (isNaN(dvt) || dvt <= 0) {
      errors.push('Đơn vị tính là bắt buộc và phải là số nguyên dương.');
    }
  }

  // Định mức tồn kho
  const minVal = data.muc_ton_toi_thieu !== undefined && data.muc_ton_toi_thieu !== null ? parseFloat(data.muc_ton_toi_thieu) : 0;
  const maxVal = data.muc_ton_toi_da !== undefined && data.muc_ton_toi_da !== null ? parseFloat(data.muc_ton_toi_da) : 0;

  if (isNaN(minVal) || minVal < 0) {
    errors.push('Mức tồn tối thiểu không được âm.');
  }

  if (isNaN(maxVal) || maxVal < 0) {
    errors.push('Mức tồn tối đa không được âm.');
  }

  if (maxVal > 0 && minVal > maxVal) {
    errors.push('Định mức tồn tối thiểu không được lớn hơn định mức tồn tối đa.');
  }

  if (data.gia_nhap_trung_binh !== undefined && data.gia_nhap_trung_binh !== null) {
    const price = parseFloat(data.gia_nhap_trung_binh);
    if (isNaN(price) || price < 0) {
      errors.push('Đơn giá chuẩn / giá nhập trung bình không được âm.');
    }
  }

  if (data.trang_thai && !VALID_STATUSES.includes(data.trang_thai)) {
    errors.push(`Trạng thái không hợp lệ. Danh sách hợp lệ: ${VALID_STATUSES.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateVatTuInput,
  VALID_LOAI_VAT_TU,
  VALID_STATUSES,
};
