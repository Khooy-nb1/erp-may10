import React, { useEffect, useState } from 'react';
import { getTonKho, getDanhSachKho, getTheKho } from '../services/api';
import { Search, Filter, History, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';

export default function TonKhoPage({ showToast }) {
  const [items, setItems] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKho, setSelectedKho] = useState('');
  const [selectedLoai, setSelectedLoai] = useState('');
  const [duoiDinhMuc, setDuoiDinhMuc] = useState(false);
  const [search, setSearch] = useState('');

  // The kho modal
  const [modalOpen, setModalOpen] = useState(false);
  const [theKhoData, setTheKhoData] = useState(null);
  const [loadingTheKho, setLoadingTheKho] = useState(false);

  useEffect(() => {
    getDanhSachKho().then(setKhoList).catch(console.error);
    loadData();
  }, [selectedKho, selectedLoai, duoiDinhMuc]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTonKho({
        ma_kho: selectedKho || undefined,
        loai_vat_tu: selectedLoai || undefined,
        duoi_dinh_muc: duoiDinhMuc ? 'true' : undefined,
        search: search || undefined,
      });
      setItems(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách tồn kho' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTheKho = async (item) => {
    try {
      setLoadingTheKho(true);
      setModalOpen(true);
      const data = await getTheKho(item.ma_kho, item.ma_vat_tu);
      setTheKhoData(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tra cứu thẻ kho' });
      setModalOpen(false);
    } finally {
      setLoadingTheKho(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

  return (
    <div className="space-y-4">
      {/* Header filter bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2EDF5] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Kho select */}
          <select
            value={selectedKho}
            onChange={(e) => setSelectedKho(e.target.value)}
            className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
          >
            <option value="">-- Tất cả kho --</option>
            {khoList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_kho}
              </option>
            ))}
          </select>

          {/* Loại vật tư select */}
          <select
            value={selectedLoai}
            onChange={(e) => setSelectedLoai(e.target.value)}
            className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
          >
            <option value="">-- Tất cả loại vật tư --</option>
            <option value="vai_chinh">Vải chính</option>
            <option value="vai_lot">Vải lót</option>
            <option value="chi_may">Chỉ may</option>
            <option value="cuc_kep">Cúc / Kẹp</option>
            <option value="khoa_keo">Khóa kéo</option>
            <option value="phu_lieu">Phụ liệu khác</option>
          </select>

          {/* Checkbox dưới định mức */}
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#172033] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={duoiDinhMuc}
              onChange={(e) => setDuoiDinhMuc(e.target.checked)}
              className="w-4 h-4 rounded text-[#0F5FAF] focus:ring-[#0F5FAF] border-[#DCEAF4]"
            />
            <span>Chỉ xem cảnh báo thiếu hụt</span>
          </label>
        </div>

        {/* Search input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8DA0B3]" />
            <input
              type="text"
              placeholder="Tìm mã hoặc tên vật tư..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[#DCEAF4] rounded-xl text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 w-full sm:w-64 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
              <tr>
                <th className="py-3 px-4">Kho lưu trữ</th>
                <th className="py-3 px-4">Mã vật tư</th>
                <th className="py-3 px-4">Tên vật tư</th>
                <th className="py-3 px-4">Loại</th>
                <th className="py-3 px-4 text-right">Số lượng tồn</th>
                <th className="py-3 px-4 text-right">Định mức tối thiểu</th>
                <th className="py-3 px-4 text-right">Giá trị tồn kho</th>
                <th className="py-3 px-4 text-center">Tình trạng</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EDF5]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#8DA0B3]">
                    Đang tải dữ liệu tồn kho...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#8DA0B3]">
                    Không tìm thấy mặt hàng tồn kho nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#172033]">{row.ten_kho}</td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[#0F5FAF]">{row.ma_vat_tu_code}</td>
                    <td className="py-3 px-4 font-medium text-[#172033]">{row.ten_vat_tu}</td>
                    <td className="py-3 px-4 text-[#5F6F82] capitalize">{row.loai_vat_tu?.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#172033]">
                      {formatNumber(row.so_luong_ton)} <span className="font-normal text-xs text-[#5F6F82]">{row.ten_dvt}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#5F6F82]">
                      {formatNumber(row.dinh_muc_ton_toi_thieu)} {row.ten_dvt}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0F5FAF]">
                      {formatCurrency(row.gia_tri_ton_kho)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.trang_thai_ton === 'an_toan' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> An toàn
                        </span>
                      ) : row.trang_thai_ton === 'canh_bao_thap' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Thiếu hụt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" /> Hết hàng
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenTheKho(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F4C81] bg-white hover:bg-[#EAF5FC] rounded-xl border border-[#DCEAF4] transition-all shadow-sm hover:border-[#96C8EB]"
                      >
                        <History className="w-3.5 h-3.5 text-[#0F5FAF]" />
                        <span>Thẻ kho</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thẻ Kho Chi Tiết */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#172033] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#0F5FAF]" />
                  Sổ Thẻ Kho — Lịch Sử Biến Động Nhập / Xuất
                </h3>
                {theKhoData && (
                  <p className="text-xs text-[#5F6F82] mt-1">
                    Mặt hàng: <strong className="text-[#172033]">{theKhoData.thongTinChung.ten_vat_tu}</strong> | Kho:{' '}
                    <strong className="text-[#172033]">{theKhoData.thongTinChung.ten_kho}</strong> | Tồn hiện tại:{' '}
                    <strong className="text-[#0F5FAF]">
                      {formatNumber(theKhoData.tonHienTai.so_luong_ton)} {theKhoData.thongTinChung.ten_dvt}
                    </strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#8DA0B3] hover:text-[#172033] hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto">
              {loadingTheKho ? (
                <div className="py-12 text-center text-[#8DA0B3]">Đang tải lịch sử thẻ kho...</div>
              ) : theKhoData?.nhatKyBienDong?.length === 0 ? (
                <div className="py-12 text-center text-[#8DA0B3]">
                  Chưa có phát sinh giao dịch nhập xuất nào cho mặt hàng này.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E2EDF5]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7FAFC] text-[#5F6F82] uppercase tracking-wider font-semibold border-b border-[#E2EDF5]">
                      <tr>
                        <th className="py-2.5 px-3">Thời gian</th>
                        <th className="py-2.5 px-3">Mã chứng từ</th>
                        <th className="py-2.5 px-3">Loại biến động</th>
                        <th className="py-2.5 px-3">Diễn giải</th>
                        <th className="py-2.5 px-3 text-right">Số lượng</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                        <th className="py-2.5 px-3">Mã lô</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2EDF5]">
                      {theKhoData?.nhatKyBienDong?.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-[#F9FBFC] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[#5F6F82]">
                            {new Date(tx.thoi_gian).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0F5FAF]">{tx.ma_chung_tu}</td>
                          <td className="py-2.5 px-3 font-semibold">
                            {tx.loai_bien_dong === 'nhap_kho' ? (
                              <span className="text-emerald-600">▲ Nhập kho</span>
                            ) : (
                              <span className="text-red-600">▼ Xuất kho</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[#5F6F82] capitalize">{tx.dien_giai?.replace('_', ' ')}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              tx.loai_bien_dong === 'nhap_kho' ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {tx.loai_bien_dong === 'nhap_kho' ? '+' : '-'}
                            {formatNumber(tx.so_luong)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#5F6F82]">{formatCurrency(tx.don_gia)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[#172033]">{formatCurrency(tx.thanh_tien)}</td>
                          <td className="py-2.5 px-3 font-mono text-[#5F6F82]">{tx.ma_lo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#EBF2F7] bg-[#F9FBFC] flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-[#5F6F82] border border-[#DCEAF4] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
