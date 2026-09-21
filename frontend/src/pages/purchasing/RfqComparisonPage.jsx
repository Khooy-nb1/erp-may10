import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Eye,
  CheckCircle2,
  Building2,
  Clock,
  Award,
  DollarSign,
  TrendingDown,
  AlertCircle,
  Check,
  ShoppingCart,
} from 'lucide-react';
import {
  getRfqs,
  getRfqDetail,
  createRfq,
  submitQuote,
  selectVendorQuote,
  getSuppliers,
} from '../../services/purchasingService';

export default function RfqComparisonPage() {
  const [rfqList, setRfqList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRfq, setSelectedRfq] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [showSelectVendorModal, setShowSelectVendorModal] = useState(false);

  const [suppliers, setSuppliers] = useState([]);
  const [selectedQuoteForDecision, setSelectedQuoteForDecision] = useState(null);
  const [selectionReason, setSelectionReason] = useState('');

  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Form: Create RFQ
  const [newRfqForm, setNewRfqForm] = useState({
    tieu_de: '',
    han_bao_gia: '',
    dieu_khoan_thuong_mai: 'Giao tại kho May 10, thanh toán 30 ngày',
    ghi_chu: '',
  });

  // Form: Submit Quote
  const [newQuoteForm, setNewQuoteForm] = useState({
    ma_nha_cung_cap: '',
    ma_vat_tu: 1,
    so_luong_chao: '',
    don_gia_chao: '',
    thoi_gian_giao_hang_ngay: 7,
    dieu_kien_thanh_toan: '',
    ghi_chu: '',
  });

  const fetchRfqList = async () => {
    try {
      setLoading(true);
      const data = await getRfqs();
      setRfqList(data || []);
    } catch (err) {
      console.error('Lỗi nạp danh sách RFQ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqList();
  }, []);

  const handleOpenDetail = async (id) => {
    try {
      const detail = await getRfqDetail(id);
      setSelectedRfq(detail);
      setShowDetailModal(true);
    } catch (err) {
      showNotification('error', 'Không thể tải chi tiết đợt yêu cầu báo giá.');
    }
  };

  const handleCreateRfqSubmit = async (e) => {
    e.preventDefault();
    try {
      await createRfq({
        ...newRfqForm,
        vatTu: [{ ma_vat_tu: 1 }],
      });
      showNotification('success', 'Tạo đợt yêu cầu báo giá (RFQ) thành công!');
      setShowCreateModal(false);
      setNewRfqForm({
        tieu_de: '',
        han_bao_gia: '',
        dieu_khoan_thuong_mai: 'Giao tại kho May 10, thanh toán 30 ngày',
        ghi_chu: '',
      });
      fetchRfqList();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi tạo RFQ.');
    }
  };

  const openAddQuoteModal = async () => {
    try {
      const suppRes = await getSuppliers({ limit: 100 });
      setSuppliers(suppRes.data || []);
      if (suppRes.data?.length > 0) {
        setNewQuoteForm({
          ...newQuoteForm,
          ma_nha_cung_cap: suppRes.data[0].id,
        });
      }
      setShowAddQuoteModal(true);
    } catch (err) {
      showNotification('error', 'Không thể tải danh sách nhà cung cấp.');
    }
  };

  const handleAddQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRfq) return;
    try {
      await submitQuote(selectedRfq.id, newQuoteForm);
      showNotification('success', 'Đã tiếp nhận báo giá từ nhà cung cấp thành công!');
      setShowAddQuoteModal(false);
      // Refresh detail
      const refreshed = await getRfqDetail(selectedRfq.id);
      setSelectedRfq(refreshed);
      fetchRfqList();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi tiếp nhận báo giá.');
    }
  };

  const openSelectDecision = (quote) => {
    setSelectedQuoteForDecision(quote);
    setSelectionReason(`Giá chào cạnh tranh (${parseFloat(quote.don_gia_chao).toLocaleString('vi-VN')} đ) & Tiến độ giao hàng nhanh (${quote.thoi_gian_giao_hang_ngay} ngày)`);
    setShowSelectVendorModal(true);
  };

  const handleSelectVendorSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRfq || !selectedQuoteForDecision) return;
    try {
      const res = await selectVendorQuote(selectedRfq.id, {
        quote_id: selectedQuoteForDecision.id,
        ly_do_chon: selectionReason,
        auto_create_po: true,
      });
      showNotification('success', res.message || 'Chốt nhà cung cấp trúng thầu thành công!');
      setShowSelectVendorModal(false);
      setShowDetailModal(false);
      fetchRfqList();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi chốt nhà cung cấp.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm transition-all ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-sm opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Yêu cầu Báo giá & So sánh Lựa chọn NCC (RFQ)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gửi yêu cầu chào giá, so sánh giá - tiến độ - chất lượng từ nhiều NCC và phê duyệt trúng thầu
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo Đợt Yêu Cầu Báo Giá (RFQ)
        </button>
      </div>

      {/* RFQ Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            Đang tải danh sách các đợt yêu cầu báo giá...
          </div>
        ) : rfqList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            Chưa có đợt yêu cầu báo giá nào trong hệ thống.
          </div>
        ) : (
          rfqList.map((rfq) => (
            <div
              key={rfq.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {rfq.ma_rfq}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      rfq.trang_thai === 'da_chot' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {rfq.trang_thai === 'da_chot' ? 'Đã Chốt NCC' : 'Đang Mở Nhận Giá'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2">
                  {rfq.tieu_de}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hạn nộp báo giá: <strong className="text-slate-700">{new Date(rfq.han_bao_gia).toLocaleDateString('vi-VN')}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Số báo giá đã nhận: <strong className="text-indigo-600 font-bold text-sm">{rfq.so_bao_gia_nhan_duoc || 0}</strong> NCC</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenDetail(rfq.id)}
                className="w-full py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-slate-200/60"
              >
                <Eye className="w-3.5 h-3.5" />
                Mở Bảng So Sánh & Quyết Định
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal: Tạo RFQ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Tạo Đợt Yêu Cầu Báo Giá (RFQ)
            </h3>
            <form onSubmit={handleCreateRfqSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Tiêu Đề Chào Giá</label>
                <input
                  type="text"
                  placeholder="VD: Chào giá Vải Cotton 100% cho đơn hàng Sơ mi Q4..."
                  value={newRfqForm.tieu_de}
                  onChange={(e) => setNewRfqForm({ ...newRfqForm, tieu_de: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Hạn Chót Nộp Báo Giá</label>
                <input
                  type="date"
                  value={newRfqForm.han_bao_gia}
                  onChange={(e) => setNewRfqForm({ ...newRfqForm, han_bao_gia: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Điều Khoản Thương Mại</label>
                <textarea
                  rows="2"
                  value={newRfqForm.dieu_khoan_thuong_mai}
                  onChange={(e) => setNewRfqForm({ ...newRfqForm, dieu_khoan_thuong_mai: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Ghi Chú Kỹ Thuật</label>
                <input
                  type="text"
                  placeholder="Yêu cầu mẫu vải kiểm tra trước..."
                  value={newRfqForm.ghi_chu}
                  onChange={(e) => setNewRfqForm({ ...newRfqForm, ghi_chu: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Phát Hành RFQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bảng So Sánh Báo Giá & Chi Tiết RFQ */}
      {showDetailModal && selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Ma Trận So Sánh Báo Giá: {selectedRfq.ma_rfq}
                </h3>
                <span className="text-xs text-slate-500">{selectedRfq.tieu_de}</span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500">Hạn chót báo giá:</span>{' '}
                  <strong className="text-slate-800">{new Date(selectedRfq.han_bao_gia).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Điều khoản:</span>{' '}
                  <span className="text-slate-800">{selectedRfq.dieu_khoan_thuong_mai}</span>
                </div>
                <button
                  onClick={openAddQuoteModal}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nhập Báo Giá NCC
                </button>
              </div>

              {/* Matrix Comparison Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">
                  Bảng Đối Chiếu Các Nhà Cung Cấp Chào Giá
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left">Nhà Cung Cấp</th>
                        <th className="p-3 text-center">Điểm Đánh Giá</th>
                        <th className="p-3 text-right">Đơn Giá Chào</th>
                        <th className="p-3 text-right">Số Lượng</th>
                        <th className="p-3 text-center">Lead Time</th>
                        <th className="p-3 text-left">Điều Kiện Thanh Toán</th>
                        <th className="p-3 text-center">Trúng Thầu</th>
                        <th className="p-3 text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRfq.baoGia?.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-8 text-slate-400">
                            Chưa có nhà cung cấp nào gửi báo giá cho đợt này. Bấm "+ Nhập Báo Giá NCC" để thêm.
                          </td>
                        </tr>
                      ) : (
                        selectedRfq.baoGia?.map((quote) => (
                          <tr key={quote.id} className={quote.da_chon ? 'bg-emerald-50/60' : 'hover:bg-slate-50/50'}>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{quote.ten_nha_cung_cap}</span>
                              <span className="text-[11px] text-slate-400">{quote.ma_nha_cung_cap}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                                <Award className="w-3 h-3" />
                                {quote.diem_danh_gia > 0 ? quote.diem_danh_gia : 'Chưa có'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-bold text-sm text-indigo-600">
                                {parseFloat(quote.don_gia_chao).toLocaleString('vi-VN')} đ
                              </span>
                            </td>
                            <td className="p-3 text-right font-medium text-slate-700">
                              {parseFloat(quote.so_luong_chao).toLocaleString('vi-VN')}
                            </td>
                            <td className="p-3 text-center font-medium text-slate-700">
                              {quote.thoi_gian_giao_hang_ngay} ngày
                            </td>
                            <td className="p-3 text-slate-600">
                              {quote.dieu_kien_thanh_toan || 'Tiêu chuẩn'}
                            </td>
                            <td className="p-3 text-center">
                              {quote.da_chon ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" /> Đã Chọn
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {!quote.da_chon && selectedRfq.trang_thai !== 'da_chot' && (
                                <button
                                  onClick={() => openSelectDecision(quote)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 mx-auto"
                                >
                                  <Check className="w-3 h-3" /> Chọn NCC
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* If selected reason exists */}
              {selectedRfq.baoGia?.some((q) => q.da_chon) && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lý do lựa chọn nhà cung cấp trúng thầu:
                  </span>
                  <p>{selectedRfq.baoGia.find((q) => q.da_chon)?.ly_do_chon}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nhập Báo Giá Từ NCC */}
      {showAddQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> Tiếp Nhận Báo Giá Từ Nhà Cung Cấp
            </h3>

            <form onSubmit={handleAddQuoteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Nhà Cung Cấp</label>
                <select
                  value={newQuoteForm.ma_nha_cung_cap}
                  onChange={(e) => setNewQuoteForm({ ...newQuoteForm, ma_nha_cung_cap: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.ma_nha_cung_cap} — {s.ten_nha_cung_cap}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Số Lượng Chào</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="VD: 500"
                    value={newQuoteForm.so_luong_chao}
                    onChange={(e) => setNewQuoteForm({ ...newQuoteForm, so_luong_chao: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Đơn Giá Chào (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 65000"
                    value={newQuoteForm.don_gia_chao}
                    onChange={(e) => setNewQuoteForm({ ...newQuoteForm, don_gia_chao: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Thời Gian Giao Hàng (Lead Time - Số Ngày)</label>
                <input
                  type="number"
                  min="1"
                  value={newQuoteForm.thoi_gian_giao_hang_ngay}
                  onChange={(e) => setNewQuoteForm({ ...newQuoteForm, thoi_gian_giao_hang_ngay: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Điều Kiện Thanh Toán</label>
                <input
                  type="text"
                  placeholder="VD: Thanh toán 100% sau khi nhận hàng 30 ngày..."
                  value={newQuoteForm.dieu_kien_thanh_toan}
                  onChange={(e) => setNewQuoteForm({ ...newQuoteForm, dieu_kien_thanh_toan: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddQuoteModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Lưu Báo Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quyết Định Chọn Nhà Cung Cấp & Tự Động Sinh PO */}
      {showSelectVendorModal && selectedQuoteForDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" /> Phê Duyệt Chọn Nhà Cung Cấp
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>NCC: <strong className="text-slate-900">{selectedQuoteForDecision.ten_nha_cung_cap}</strong></div>
              <div>Đơn giá: <strong className="text-indigo-600">{parseFloat(selectedQuoteForDecision.don_gia_chao).toLocaleString('vi-VN')} đ</strong></div>
              <div>Thời gian giao: <strong>{selectedQuoteForDecision.thoi_gian_giao_hang_ngay} ngày</strong></div>
            </div>

            <form onSubmit={handleSelectVendorSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Ghi Nhận Lý Do Lựa Chọn</label>
                <textarea
                  rows="3"
                  value={selectionReason}
                  onChange={(e) => setSelectionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-indigo-800 font-medium">Hệ thống sẽ tự động tạo Đơn mua hàng (PO) cho NCC được chọn.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSelectVendorModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Xác Nhận & Sinh Đơn Mua
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
