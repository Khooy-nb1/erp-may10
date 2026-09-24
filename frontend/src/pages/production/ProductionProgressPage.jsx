import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Factory,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  FileText,
  Scale,
} from 'lucide-react';
import {
  getProductionOrders,
  getOrderStages,
  recordProductionResult,
  getOrderReconciliation,
} from '../../services/productionService';

export default function ProductionProgressPage({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [stages, setStages] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stages'); // 'stages' | 'reconciliation'

  // Log Result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultForm, setResultForm] = useState({
    so_luong_dat: 50,
    so_luong_loi: 0,
    nhan_cong: 8,
    ghi_chu: '',
  });

  useEffect(() => {
    getProductionOrders()
      .then((res) => {
        const list = res?.data || [];
        setOrders(list);
        if (list.length > 0) {
          setSelectedOrderId(list[0].id);
        }
      })
      .catch((err) => console.error('Lỗi tải danh sách lệnh:', err));
  }, []);

  const loadOrderDetail = async (orderId) => {
    if (!orderId) return;
    try {
      setLoading(true);
      const [resStages, resRecon] = await Promise.all([
        getOrderStages(orderId),
        getOrderReconciliation(orderId),
      ]);
      setStages(resStages || []);
      setReconciliation(resRecon || null);
    } catch (err) {
      console.error('Lỗi tải chi tiết tiến độ lệnh:', err);
      if (showToast) {
        showToast({
          type: 'error',
          message: 'Không thể tải chi tiết tiến độ & đối soát của lệnh.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      loadOrderDetail(selectedOrderId);
    }
  }, [selectedOrderId]);

  const handleLogResult = async (e) => {
    e.preventDefault();
    if (!resultForm.so_luong_dat || Number(resultForm.so_luong_dat) <= 0) {
      if (showToast) showToast({ type: 'error', message: 'Số lượng đạt phải lớn hơn 0.' });
      return;
    }
    try {
      setSubmitting(true);
      await recordProductionResult(selectedOrderId, {
        so_luong_hoan_thanh: Number(resultForm.so_luong_dat),
        so_luong_loi: Number(resultForm.so_luong_loi || 0),
        nhan_cong_thuc_te: Number(resultForm.nhan_cong || 8),
        ghi_chu: resultForm.ghi_chu,
      });
      if (showToast) {
        showToast({
          type: 'success',
          message: 'Ghi nhận kết quả sản xuất thành công!',
        });
      }
      setShowResultModal(false);
      setResultForm({ so_luong_dat: 50, so_luong_loi: 0, nhan_cong: 8, ghi_chu: '' });
      loadOrderDetail(selectedOrderId);
      // Refresh order list to get updated status
      const res = await getProductionOrders();
      setOrders(res?.data || []);
    } catch (err) {
      if (showToast) {
        showToast({
          type: 'error',
          message: err.response?.data?.message || 'Lỗi ghi nhận kết quả sản xuất.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOrder = orders.find((o) => Number(o.id) === Number(selectedOrderId));
  const reconOrder = reconciliation?.order || selectedOrder;
  const reconMaterials = reconciliation?.reconciliation || reconciliation?.materials || [];

  return (
    <div className="space-y-6">
      {/* Selector & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-indigo-600" />
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Chọn Lệnh SX:</label>
          </div>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F5FAF] w-full sm:w-80"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                [{o.ma_lenh_san_xuat || o.ma_lenh}] {o.ten_san_pham} ({o.so_luong_hoan_thanh || 0}/{o.so_luong_yeu_cau || o.so_luong} SP - {o.trang_thai})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadOrderDetail(selectedOrderId)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setShowResultModal(true)}
            disabled={!selectedOrder || selectedOrder.trang_thai === 'hoan_thanh'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Báo cáo kết quả ca</span>
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('stages')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'stages'
              ? 'border-[#0F5FAF] text-[#0F5FAF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tiến độ 4 công đoạn (Cắt → May → Hoàn thiện → KCS)</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'reconciliation'
              ? 'border-[#0F5FAF] text-[#0F5FAF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Đối soát tiêu hao NPL (FR-09 Kho vs Định mức)</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-[#0F5FAF] animate-spin" />
          <span className="ml-3 text-sm font-medium text-slate-600">Đang tải tiến độ công đoạn và bảng đối soát...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: 4 STAGES */}
          {activeTab === 'stages' && (
            <div className="space-y-6">
              {/* Order Status Banner */}
              {selectedOrder && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Lệnh sản xuất</span>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-indigo-600">{selectedOrder.ma_lenh_san_xuat || selectedOrder.ma_lenh}</span>
                      <span className="text-slate-400 font-normal">|</span>
                      <span>{selectedOrder.ten_san_pham}</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-500">Kế hoạch chỉ định:</span>
                      <div className="font-bold text-slate-900 text-sm">
                        {new Intl.NumberFormat('vi-VN').format(selectedOrder.so_luong_yeu_cau || selectedOrder.so_luong || 0)} SP
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Đã nhập kho KCS:</span>
                      <div className="font-bold text-emerald-600 text-sm">
                        {new Intl.NumberFormat('vi-VN').format(selectedOrder.so_luong_hoan_thanh || 0)} SP
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Trạng thái:</span>
                      <div className="font-bold text-slate-900 text-sm">{selectedOrder.trang_thai}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4 Stages Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stages.map((stg) => {
                  const isDone = stg.trang_thai === 'hoan_thanh';
                  const isRunning = stg.trang_thai === 'dang_thuc_hien' || stg.trang_thai === 'dang_san_xuat';
                  const stageNum = stg.so_thu_tu || stg.thu_tu || 1;
                  return (
                    <div
                      key={stg.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : isRunning
                          ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {stageNum}
                        </span>
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                          </span>
                        ) : isRunning ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Đang chạy
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">Chưa bắt đầu</span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mb-1">{stg.ten_cong_doan}</h4>
                      <p className="text-xs text-slate-500 mb-3">Công đoạn {stageNum} chuẩn chuyền may May 10</p>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Định mức thời gian:</span>
                          <span className="font-semibold text-slate-900">{stg.thoi_gian_chuan || 24}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Số công nhân:</span>
                          <span className="font-medium text-slate-700">{stg.so_cong_nhan || 8} người</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RECONCILIATION & MATERIAL BALANCING */}
          {activeTab === 'reconciliation' && (
            <div className="space-y-6">
              {/* Note banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
                <FileText className="w-5 h-5 text-[#0F5FAF] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Cơ chế Đối soát Cân đối Vật tư Sản xuất (Reconciliation) May 10:</h4>
                  <p className="leading-relaxed">
                    - <strong>Thực xuất (PH4)</strong>: Tổng số lượng vật tư thủ kho đã xuất kho theo Phiếu xuất gắn mã lệnh này (`loai_xuat = 'xuat_san_xuat'`).<br />
                    - <strong>Tiêu hao định mức (BOM)</strong>: Sản phẩm hoàn thành $\times$ Định mức BOM $\times$ (1 + % Hao hụt).<br />
                    - <strong>Chênh lệch</strong>: Lượng vật tư thừa/thiếu tại chuyền may phục vụ cân đối vật tư kỹ thuật và thu hồi tồn dư về kho.
                  </p>
                </div>
              </div>

              {/* Reconciliation Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Bảng đối soát vật tư: Lệnh {reconOrder?.ma_lenh_san_xuat || reconOrder?.ma_lenh}
                  </h3>
                  <span className="text-xs text-slate-500">
                    SP hoàn thành: <strong>{new Intl.NumberFormat('vi-VN').format(reconOrder?.so_luong_hoan_thanh || 0)}</strong> / {new Intl.NumberFormat('vi-VN').format(reconOrder?.so_luong_yeu_cau || reconOrder?.so_luong || 0)} SP
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Mã NPL</th>
                        <th className="px-4 py-3">Tên vật tư</th>
                        <th className="px-4 py-3 text-right">Định mức</th>
                        <th className="px-4 py-3 text-right">Thực xuất từ Kho (PH4)</th>
                        <th className="px-4 py-3 text-right">Tiêu hao định mức (BOM)</th>
                        <th className="px-4 py-3 text-right">Chênh lệch tại chuyền</th>
                        <th className="px-4 py-3 text-center">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reconMaterials.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                            Chưa có dữ liệu định mức BOM hoặc chưa có phiếu xuất kho nào từ PH4
                          </td>
                        </tr>
                      ) : (
                        reconMaterials.map((rm) => {
                          const actualIssued = Number(rm.tong_xuat_thuc_te !== undefined ? rm.tong_xuat_thuc_te : rm.thuc_xuat_tu_kho || 0);
                          const standard = Number(rm.dinh_muc_tieu_hao_chuan !== undefined ? rm.dinh_muc_tieu_hao_chuan : rm.tieu_hao_dinh_muc || 0);
                          const diff = Number(rm.chenh_lech !== undefined ? rm.chenh_lech : actualIssued - standard);
                          return (
                            <tr key={rm.ma_vat_tu} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-mono font-medium text-slate-700">{rm.ma_vat_tu_code || rm.ma_vat_tu}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{rm.ten_vat_tu}</td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {rm.dinh_muc} {rm.don_vi_tinh || 'm'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {new Intl.NumberFormat('vi-VN').format(actualIssued)} {rm.don_vi_tinh || 'm'}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-700">
                                {new Intl.NumberFormat('vi-VN').format(standard)} {rm.don_vi_tinh || 'm'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold">
                                {diff > 0 ? (
                                  <span className="text-blue-600">+{new Intl.NumberFormat('vi-VN').format(diff)} (dư tại chuyền)</span>
                                ) : diff < 0 ? (
                                  <span className="text-amber-600">{new Intl.NumberFormat('vi-VN').format(diff)} (vượt mức)</span>
                                ) : (
                                  <span className="text-emerald-600">0 (chuẩn định mức)</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {diff > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    Còn tại xưởng
                                  </span>
                                ) : diff < 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Vượt định mức
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Cân bằng
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Báo cáo kết quả ca sản xuất
            </h3>
            <form onSubmit={handleLogResult} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng may đạt (KCS) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={resultForm.so_luong_dat}
                  onChange={(e) => setResultForm({ ...resultForm, so_luong_dat: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng hỏng/lỗi</label>
                <input
                  type="number"
                  min="0"
                  value={resultForm.so_luong_loi}
                  onChange={(e) => setResultForm({ ...resultForm, so_luong_loi: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhân công thực tế (giờ công)</label>
                <input
                  type="number"
                  min="1"
                  value={resultForm.nhan_cong}
                  onChange={(e) => setResultForm({ ...resultForm, nhan_cong: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú ca kíp</label>
                <textarea
                  rows="2"
                  value={resultForm.ghi_chu}
                  onChange={(e) => setResultForm({ ...resultForm, ghi_chu: e.target.value })}
                  placeholder="Ca sáng chuyền may A1..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F5FAF]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5FAF] hover:bg-[#0d4f91] rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Ghi nhận kết quả'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
