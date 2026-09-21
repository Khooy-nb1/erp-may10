import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  X,
  Truck,
  ArrowRight,
  AlertCircle,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  getReceivingOrders,
  updateReceiveStatus,
} from '../../services/purchasingService';

export default function ReceivingOrdersPage({ showToast }) {
  const [receivingList, setReceivingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalErrors, setModalErrors] = useState([]);

  const fetchReceivingOrders = async () => {
    try {
      setLoading(true);
      const res = await getReceivingOrders();
      setReceivingList(res || []);
    } catch (err) {
      console.error('Lỗi nạp danh sách đơn mua chờ nhập kho:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể nạp danh sách đơn chờ nhập kho.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivingOrders();
  }, []);

  const handleOpenReceiveModal = (po) => {
    setSelectedPO(po);
    // Chuẩn bị danh sách vật tư mặc định nhận hết số lượng còn lại
    const items = (po.chiTiet || []).map((it) => ({
      id: it.id,
      ma_vat_tu: it.ma_vat_tu,
      ten_vat_tu: it.ten_vat_tu,
      ma_vat_tu_code: it.ma_vat_tu_code,
      ten_dvt: it.ten_dvt,
      so_luong_dat: parseFloat(it.so_luong_dat) || 0,
      so_luong_da_nhap: parseFloat(it.so_luong_da_nhap) || 0,
      so_luong_can_nhap: parseFloat(it.so_luong_can_nhap) || 0,
      so_luong_nhap_lan_nay: parseFloat(it.so_luong_can_nhap) || 0,
      so_luong_loi_hong: 0,
      ghi_chu_kiem_dinh: '',
    }));
    setReceiveItems(items);
    setModalErrors([]);
    setIsReceiveModalOpen(true);
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...receiveItems];
    updated[index][field] = value;
    setReceiveItems(updated);
  };

  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;
    setSubmitting(true);
    setModalErrors([]);

    // Validate: ít nhất 1 dòng có số lượng nhận > 0
    const validItems = receiveItems.filter((it) => parseFloat(it.so_luong_nhap_lan_nay) > 0);
    if (validItems.length === 0) {
      setModalErrors(['Vui lòng nhập số lượng nhận > 0 cho ít nhất 1 mặt hàng.']);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ma_don_mua_hang: selectedPO.id,
        chiTiet: validItems.map((it) => ({
          id: it.id,
          ma_vat_tu: it.ma_vat_tu,
          so_luong_nhap: parseFloat(it.so_luong_nhap_lan_nay) || 0,
          so_luong_loi_hong: parseFloat(it.so_luong_loi_hong) || 0,
          ghi_chu_kiem_dinh: it.ghi_chu_kiem_dinh || null,
        })),
      };

      const res = await updateReceiveStatus(payload);
      setIsReceiveModalOpen(false);
      if (showToast) {
        showToast({
          type: 'success',
          message: res.message || 'Cập nhật tiến độ nhập kho và kiểm nghiệm thành công.',
        });
      }
      fetchReceivingOrders();
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.errors) {
        setModalErrors(errRes.errors);
      } else {
        setModalErrors([errRes?.message || 'Lỗi cập nhật tiến độ nhận hàng.']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-4">
      {/* Header description card */}
      <div className="bg-[#F4FAFE] rounded-2xl border border-[#DCEAF4] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#0F5FAF] border border-[#DCEAF4] shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#172033]">
              Đơn mua hàng chờ giao & kiểm nghiệm nhập kho (PH3 ➔ PH4)
            </h3>
            <p className="text-xs text-[#5F6F82]">
              Theo dõi đơn hàng đang vận chuyển, đối chiếu kiểm định quy cách phẩm chất & bàn giao sang Kho
            </p>
          </div>
        </div>

        <button
          onClick={fetchReceivingOrders}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DCEAF4] rounded-xl text-xs font-semibold text-[#0F5FAF] hover:bg-[#EAF5FC] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Orders waiting receiving table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#0F5FAF] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#5F6F82]">Đang tải danh sách chờ nhập kho...</p>
          </div>
        ) : receivingList.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5F6F82]">
            <PackageCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            Không có đơn mua nào đang chờ nhập kho
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F4FAFE] text-[#5F6F82]">
                  <th className="py-3 px-3.5 font-semibold">Mã PO</th>
                  <th className="py-3 px-3.5 font-semibold">Nhà cung cấp</th>
                  <th className="py-3 px-3.5 font-semibold">Hạn giao YC</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Tổng đặt</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Đã nhập</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Còn lại</th>
                  <th className="py-3 px-3.5 font-semibold text-center">Trạng thái</th>
                  <th className="py-3 px-3.5 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivingList.map((po) => {
                  const tongDat = parseFloat(po.tong_dat) || 0;
                  const tongDaNhap = parseFloat(po.tong_da_nhap) || 0;
                  const tongConLai = parseFloat(po.tong_con_lai) || 0;

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-[#0F5FAF]">
                        <Link
                          to={`/purchasing/purchase-orders/${po.id}`}
                          className="hover:underline"
                        >
                          {po.ma_don_mua}
                        </Link>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-[#172033]">{po.ten_nha_cung_cap}</div>
                        <div className="text-[11px] text-slate-400">{po.ncc_code}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {formatDate(po.ngay_giao_hang_yc)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-[#172033]">
                        {tongDat}
                      </td>
                      <td className="py-3 px-3.5 text-right font-semibold text-emerald-700">
                        {tongDaNhap}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-amber-600">
                        {tongConLai}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {po.trang_thai === 'dang_giao' ? 'Đang giao dở' : 'Chờ giao hàng'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenReceiveModal(po)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F5FAF] text-white font-semibold hover:bg-[#0A2540] transition-colors text-xs shadow-xs"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                            <span>Kiểm nghiệm & Nhập kho</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Ghi nhận nhận hàng & Kiểm định chất lượng */}
      {isReceiveModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedPO.ma_don_mua}
                </span>
                <h3 className="text-sm font-bold text-[#172033] mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F5FAF]" />
                  <span>Đối chiếu nhận hàng & Kiểm nghiệm chất lượng</span>
                </h3>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="p-5 space-y-4">
              {modalErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Lỗi kiểm nghiệm & nhận hàng:</span>
                  </div>
                  <ul className="list-disc list-inside pl-1 space-y-0.5">
                    {modalErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 bg-[#F4FAFE] rounded-xl border border-[#DCEAF4] text-xs text-slate-700 flex items-start gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#0F5FAF] mt-0.5 flex-shrink-0" />
                <div>
                  Kiểm tra số lượng thực tế giao nhận so với đơn đặt PO, ghi nhận lượng hàng lỗi/hỏng (nếu có)
                  và ghi chú biên bản kiểm nghiệm trước khi bàn giao dữ liệu sang <strong>PH4 Quản lý Kho</strong>.
                </div>
              </div>

              {/* Items inspection table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Vật tư & ĐVT</th>
                      <th className="p-2.5 text-right">Đã đặt</th>
                      <th className="p-2.5 text-right">Đã nhập</th>
                      <th className="p-2.5 text-right">Còn thiếu</th>
                      <th className="p-2.5 text-right w-28">Thực nhận *</th>
                      <th className="p-2.5 text-right w-24">Lỗi hỏng</th>
                      <th className="p-2.5 w-44">Ghi chú kiểm định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiveItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <div className="font-bold text-[#172033]">{item.ten_vat_tu}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.ma_vat_tu_code} ({item.ten_dvt || 'Cái'})
                          </div>
                        </td>
                        <td className="p-2.5 text-right text-slate-700">{item.so_luong_dat}</td>
                        <td className="p-2.5 text-right text-emerald-700 font-semibold">{item.so_luong_da_nhap}</td>
                        <td className="p-2.5 text-right text-amber-600 font-bold">{item.so_luong_can_nhap}</td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            max={item.so_luong_can_nhap}
                            step="any"
                            value={item.so_luong_nhap_lan_nay}
                            onChange={(e) => handleItemFieldChange(idx, 'so_luong_nhap_lan_nay', e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-right font-bold text-[#0F5FAF] focus:outline-none focus:border-[#0F5FAF]"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.so_luong_loi_hong}
                            onChange={(e) => handleItemFieldChange(idx, 'so_luong_loi_hong', e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-rose-200 text-right font-bold text-rose-600 focus:outline-none focus:border-rose-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            placeholder="Đạt / Rách mép..."
                            value={item.ghi_chu_kiem_dinh}
                            onChange={(e) => handleItemFieldChange(idx, 'ghi_chu_kiem_dinh', e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#0F5FAF]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0A2540] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang ghi nhận...' : 'Xác nhận kiểm nghiệm & Nhập kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
