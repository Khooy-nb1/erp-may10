import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Send,
  PackageCheck,
} from 'lucide-react';
import {
  getPurchaseOrderDetail,
  approvePurchaseOrder,
  cancelPurchaseOrder,
} from '../../services/purchasingService';

export default function PurchaseOrderDetailPage({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPurchaseOrderDetail(id);
      setPO(res);
    } catch (err) {
      console.error('Lỗi tải chi tiết đơn mua hàng:', err);
      setError(err.response?.data?.message || 'Không tìm thấy đơn mua hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleApprove = async () => {
    if (!po) return;
    setActionLoading(true);
    try {
      await approvePurchaseOrder(po.id);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã phê duyệt đơn mua hàng [${po.ma_don_mua}].`,
        });
      }
      fetchOrderDetail();
    } catch (err) {
      const errRes = err.response?.data;
      if (showToast) {
        showToast({
          type: errRes?.errorCode === 'CONFLICT' ? 'conflict' : 'error',
          errorCode: errRes?.errorCode,
          message: errRes?.message || 'Không thể phê duyệt đơn mua.',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!po) return;
    const reason = window.prompt('Nhập lý do hủy đơn mua hàng:');
    if (reason === null) return;

    setActionLoading(true);
    try {
      await cancelPurchaseOrder(po.id, reason);
      if (showToast) {
        showToast({
          type: 'success',
          message: `Đã hủy đơn mua hàng [${po.ma_don_mua}].`,
        });
      }
      fetchOrderDetail();
    } catch (err) {
      const errRes = err.response?.data;
      if (showToast) {
        showToast({
          type: errRes?.errorCode === 'CONFLICT' ? 'conflict' : 'error',
          errorCode: errRes?.errorCode,
          message: errRes?.message || 'Không thể hủy đơn mua.',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
  };

  const steps = [
    { key: 'cho_duyet', label: '1. Khởi tạo' },
    { key: 'da_gui_ncc', label: '2. Đã gửi NCC' },
    { key: 'da_xac_nhan', label: '3. NCC xác nhận' },
    { key: 'dang_giao', label: '4. Đang giao hàng' },
    { key: 'da_nhap_kho', label: '5. Hoàn tất nhập kho' },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'cho_duyet':
        return 0;
      case 'da_gui_ncc':
        return 1;
      case 'da_xac_nhan':
        return 2;
      case 'dang_giao':
        return 3;
      case 'da_nhap_kho':
        return 4;
      default:
        return -1;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-[#0F5FAF] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#5F6F82]">Đang tải thông tin đơn mua hàng...</p>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Không tìm thấy đơn mua hàng</h3>
        <p className="text-xs text-slate-500">{error || 'Mã đơn mua hàng không tồn tại.'}</p>
        <Link
          to="/purchasing/purchase-orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5FAF] text-white rounded-xl text-xs font-semibold hover:bg-[#0A2540]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về danh sách đơn mua</span>
        </Link>
      </div>
    );
  }

  const currentStep = getStepIndex(po.trang_thai);
  const isCancelled = po.trang_thai === 'huy';

  return (
    <div className="space-y-6">
      {/* Top bar with back navigation & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/purchasing/purchase-orders"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0F5FAF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#172033]">{po.ma_don_mua}</h2>
              {isCancelled ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Đã hủy
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {po.trang_thai}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ngày lập: {formatDate(po.ngay_dat_hang)} • Người lập: {po.ten_nguoi_dat || '—'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {po.trang_thai === 'cho_duyet' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Phê duyệt đơn</span>
            </button>
          )}

          {!isCancelled && po.trang_thai !== 'da_nhap_kho' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Hủy đơn</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Progression */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
          Tiến trình thực hiện đơn mua
        </h3>
        {isCancelled ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            <span>Đơn mua hàng đã bị hủy. Quy trình cung ứng đã dừng lại.</span>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {steps.map((st, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={st.key} className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-[#0F5FAF] text-white ring-4 ring-blue-100 shadow-xs'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] mt-2 font-medium ${
                      isCurrent
                        ? 'text-[#0F5FAF] font-bold'
                        : isPast
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2-column info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier Info */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#172033]">
            <Building2 className="w-4 h-4 text-[#0F5FAF]" />
            <span>Thông tin Nhà cung cấp</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div>
              <span className="text-slate-400">Tên NCC:</span>{' '}
              <span className="font-bold text-[#172033]">{po.ten_nha_cung_cap}</span> ({po.ma_nha_cung_cap})
            </div>
            <div>
              <span className="text-slate-400">Địa chỉ:</span>{' '}
              <span className="text-slate-700">{po.dia_chi_ncc || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400">Điện thoại:</span>{' '}
              <span className="text-slate-700">{po.sdt_ncc || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400">Email:</span>{' '}
              <span className="text-slate-700">{po.email_ncc || '—'}</span>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-2xl border border-[#E2EDF5] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#172033]">
            <FileText className="w-4 h-4 text-[#0F5FAF]" />
            <span>Thông tin giao dịch</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div>
              <span className="text-slate-400">Hạn giao hàng yêu cầu:</span>{' '}
              <span className="font-bold text-blue-700">{formatDate(po.ngay_giao_hang_yc)}</span>
            </div>
            <div>
              <span className="text-slate-400">Điều kiện thanh toán:</span>{' '}
              <span className="text-slate-700">{po.dieu_kien_thanh_toan || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400">Phiếu đề xuất liên quan:</span>{' '}
              <span className="font-medium text-slate-700">{po.ma_yeu_cau_mua || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400">Ghi chú:</span>{' '}
              <span className="text-slate-700">{po.ghi_chu || 'Không có ghi chú.'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Items Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
            Chi tiết mặt hàng đặt mua ({po.chiTiet?.length || 0} mục)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4FAFE] text-[#5F6F82] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Mã VT</th>
                <th className="py-2.5 px-3 font-semibold">Tên vật tư</th>
                <th className="py-2.5 px-3 font-semibold">Quy cách</th>
                <th className="py-2.5 px-3 font-semibold">ĐVT</th>
                <th className="py-2.5 px-3 font-semibold text-right">SL Đặt</th>
                <th className="py-2.5 px-3 font-semibold text-right">Đơn giá</th>
                <th className="py-2.5 px-3 font-semibold text-right">Thành tiền</th>
                <th className="py-2.5 px-3 font-semibold text-right">Đã nhập kho</th>
                <th className="py-2.5 px-3 font-semibold text-right">Còn lại</th>
                <th className="py-2.5 px-3 font-semibold text-center">Tiến độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.chiTiet?.map((item) => {
                const slDat = parseFloat(item.so_luong_dat) || 0;
                const slNhap = parseFloat(item.so_luong_da_nhap) || 0;
                const percent = slDat > 0 ? Math.min(100, Math.round((slNhap / slDat) * 100)) : 0;
                const conLai = Math.max(0, slDat - slNhap);

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#0F5FAF]">
                      {item.ma_vat_tu}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#172033]">
                      {item.ten_vat_tu}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {item.quy_cach || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.ten_dvt || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                      {slDat}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {formatCurrency(item.don_gia)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                      {formatCurrency(item.thanh_tien)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                      {slNhap}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                      {conLai}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col items-end gap-1 text-xs">
          <div className="flex justify-between w-64 text-slate-600">
            <span>Tiền hàng:</span>
            <span className="font-semibold">{formatCurrency(po.tong_tien_hang)}</span>
          </div>
          <div className="flex justify-between w-64 text-slate-600">
            <span>Thuế VAT:</span>
            <span className="font-semibold">{formatCurrency(po.tien_thue)}</span>
          </div>
          <div className="flex justify-between w-64 text-sm font-bold text-[#0F5FAF] pt-1.5 border-t border-slate-200">
            <span>Tổng thanh toán:</span>
            <span>{formatCurrency(po.tong_thanh_toan)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
