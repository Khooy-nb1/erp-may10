/**
 * Purchasing Validators for ERP May 10 - PH3: Mua hàng & Nhà cung cấp
 * Standardizing HTTP 400 Bad Request responses with detailed field-level errors
 */

/**
 * Validate input for creating or updating a supplier (nha_cung_cap)
 */
function validateSupplierInput(body, isUpdate = false) {
  const errors = [];
  const { ten_nha_cung_cap, dia_chi, so_dien_thoai, email, nguoi_lien_he, han_muc_tin_dung, so_ngay_gia_han, diem_danh_gia } = body;

  if (!isUpdate || ten_nha_cung_cap !== undefined) {
    if (!ten_nha_cung_cap || typeof ten_nha_cung_cap !== 'string' || !ten_nha_cung_cap.trim()) {
      errors.push('Tên nhà cung cấp (ten_nha_cung_cap) là bắt buộc và không được để trống.');
    }
  }

  if (!isUpdate || dia_chi !== undefined) {
    if (!dia_chi || typeof dia_chi !== 'string' || !dia_chi.trim()) {
      errors.push('Địa chỉ trụ sở (dia_chi) là bắt buộc và không được để trống.');
    }
  }

  if (!isUpdate || so_dien_thoai !== undefined) {
    if (!so_dien_thoai || typeof so_dien_thoai !== 'string' || !so_dien_thoai.trim()) {
      errors.push('Số điện thoại (so_dien_thoai) là bắt buộc.');
    } else if (!/^[0-9+()\-.\s]{7,20}$/.test(so_dien_thoai.trim())) {
      errors.push('Số điện thoại không đúng định dạng hợp lệ.');
    }
  }

  if (!isUpdate || email !== undefined) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.push('Email giao dịch (email) là bắt buộc.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Email không đúng định dạng hợp lệ.');
    }
  }

  if (!isUpdate || nguoi_lien_he !== undefined) {
    if (!nguoi_lien_he || typeof nguoi_lien_he !== 'string' || !nguoi_lien_he.trim()) {
      errors.push('Người đại diện liên hệ (nguoi_lien_he) là bắt buộc.');
    }
  }

  if (han_muc_tin_dung !== undefined) {
    const num = parseFloat(han_muc_tin_dung);
    if (isNaN(num) || num < 0) {
      errors.push('Hạn mức tín dụng (han_muc_tin_dung) phải là số >= 0.');
    }
  }

  if (so_ngay_gia_han !== undefined) {
    const num = parseInt(so_ngay_gia_han, 10);
    if (isNaN(num) || num < 0) {
      errors.push('Số ngày gia hạn nợ (so_ngay_gia_han) phải là số nguyên >= 0.');
    }
  }

  if (diem_danh_gia !== undefined) {
    const num = parseFloat(diem_danh_gia);
    if (isNaN(num) || num < 0 || num > 10) {
      errors.push('Điểm đánh giá nhà cung cấp phải từ 0 đến 10.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate input for creating a Purchase Order (don_mua_hang)
 */
function validatePurchaseOrderInput(body) {
  const errors = [];
  const { ma_nha_cung_cap, ngay_giao_hang_yc, chiTiet, ma_kho_nhap } = body;

  if (!ma_nha_cung_cap) {
    errors.push('Mã nhà cung cấp (ma_nha_cung_cap) là bắt buộc.');
  }

  if (!ngay_giao_hang_yc) {
    errors.push('Ngày giao hàng yêu cầu (ngay_giao_hang_yc) là bắt buộc.');
  } else {
    const expectedDate = new Date(ngay_giao_hang_yc);
    if (isNaN(expectedDate.getTime())) {
      errors.push('Ngày giao hàng yêu cầu không phải là ngày giờ hợp lệ.');
    }
  }

  if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
    errors.push('Danh sách chi tiết mặt hàng mua (chiTiet) phải chứa ít nhất 1 vật tư.');
  } else {
    chiTiet.forEach((item, index) => {
      const idx = index + 1;
      if (!item.ma_vat_tu) {
        errors.push(`Dòng ${idx}: Mã vật tư (ma_vat_tu) là bắt buộc.`);
      }

      const sl = parseFloat(item.so_luong_dat);
      if (isNaN(sl) || sl <= 0) {
        errors.push(`Dòng ${idx}: Số lượng đặt mua (so_luong_dat) phải là số dương lớn hơn 0.`);
      }

      const dg = parseFloat(item.don_gia);
      if (isNaN(dg) || dg < 0) {
        errors.push(`Dòng ${idx}: Đơn giá mua (don_gia) phải là số >= 0.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Allowed State Transitions for Purchase Orders (State Machine)
 * Trạng thái hợp lệ: cho_duyet -> da_gui_ncc -> da_xac_nhan -> dang_giao -> da_nhap_kho
 * Bất kỳ trạng thái nào trước da_nhap_kho đều có thể chuyển sang 'huy'
 */
const VALID_TRANSITIONS = {
  cho_duyet: ['da_gui_ncc', 'huy'],
  da_gui_ncc: ['da_xac_nhan', 'huy'],
  da_xac_nhan: ['dang_giao', 'huy'],
  dang_giao: ['da_nhap_kho'],
  da_nhap_kho: [], // Terminal state
  huy: [],        // Terminal state
};

function isValidStatusTransition(currentStatus, nextStatus) {
  if (!VALID_TRANSITIONS[currentStatus]) {
    return false;
  }
  return VALID_TRANSITIONS[currentStatus].includes(nextStatus);
}

/**
 * Validate receiving update input
 */
function validateReceiveStatusInput(body) {
  const errors = [];
  const { ma_don_mua_hang, chiTiet } = body;

  if (!ma_don_mua_hang) {
    errors.push('Mã đơn mua hàng (ma_don_mua_hang) là bắt buộc.');
  }

  if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
    errors.push('Danh sách chi tiết nhận hàng (chiTiet) phải chứa ít nhất 1 dòng.');
  } else {
    chiTiet.forEach((item, index) => {
      const idx = index + 1;
      if (!item.ma_vat_tu && !item.id) {
        errors.push(`Dòng ${idx}: Cần cung cấp mã vật tư hoặc ID dòng chi tiết.`);
      }
      const sl = parseFloat(item.so_luong_nhap);
      if (isNaN(sl) || sl <= 0) {
        errors.push(`Dòng ${idx}: Số lượng nhận (so_luong_nhap) phải lớn hơn 0.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateSupplierInput,
  validatePurchaseOrderInput,
  isValidStatusTransition,
  validateReceiveStatusInput,
  VALID_TRANSITIONS,
};
