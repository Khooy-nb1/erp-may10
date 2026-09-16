import React, { useEffect, useState } from 'react';
import { getLoVatTu, getDanhSachVatTu, getDanhSachNCC, getViTriKho, createLoVatTu } from '../services/api';
import { Layers, Plus, Search, Calendar, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';

export default function LoVatTuPage({ showToast }) {
  const [lots, setLots] = useState([]);
  const [vatTuList, setVatTuList] = useState([]);
  const [nccList, setNccList] = useState([]);
  const [viTriList, setViTriList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedVatTu, setSelectedVatTu] = useState('');
  const [selectedTrangThai, setSelectedTrangThai] = useState('');
  const [search, setSearch] = useState('');

  // Add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ma_lo: '',
    ma_vat_tu: '',
    ma_nha_cung_cap: '',
    mau_sac: '',
    kho_vai: '',
    chieu_dai: '',
    ngay_san_xuat: '',
    han_su_dung: '',
    so_luong_nhap: '',
    don_gia_nhap: '',
    ma_vi_tri_kho: '',
  });

  useEffect(() => {
    Promise.all([getDanhSachVatTu(), getDanhSachNCC(), getViTriKho()]).then(([vt, ncc, vtK]) => {
      setVatTuList(vt);
      setNccList(ncc);
      setViTriList(vtK);
    });
    loadData();
  }, [selectedVatTu, selectedTrangThai]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getLoVatTu({
        ma_vat_tu: selectedVatTu || undefined,
        trang_thai: selectedTrangThai || undefined,
        search: search || undefined,
      });
      setLots(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách lô' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createLoVatTu({
        ...formData,
        so_luong_nhap: parseFloat(formData.so_luong_nhap),
        don_gia_nhap: parseFloat(formData.don_gia_nhap),
        chieu_dai: formData.chieu_dai ? parseFloat(formData.chieu_dai) : undefined,
        mau_sac: formData.mau_sac ? formData.mau_sac.trim() : undefined,
        kho_vai: formData.kho_vai ? formData.kho_vai.trim() : undefined,
        ma_nha_cung_cap: formData.ma_nha_cung_cap || undefined,
        ma_vi_tri_kho: formData.ma_vi_tri_kho || undefined,
      });
      showToast({ type: 'success', message: `Tạo lô [${formData.ma_lo}] thành công!` });
      setModalOpen(false);
      setFormData({
        ma_lo: '',
        ma_vat_tu: '',
        ma_nha_cung_cap: '',
        mau_sac: '',
        kho_vai: '',
        chieu_dai: '',
        ngay_san_xuat: '',
        han_su_dung: '',
        so_luong_nhap: '',
        don_gia_nhap: '',
        ma_vi_tri_kho: '',
      });
      loadData();
    } catch (err) {
      showToast({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2EDF5] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedVatTu}
            onChange={(e) => setSelectedVatTu(e.target.value)}
            className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 max-w-xs transition-all"
          >
            <option value="">-- Tất cả mặt hàng vật tư --</option>
            {vatTuList.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten_vat_tu} ({v.ma_vat_tu})
              </option>
            ))}
          </select>

          <select
            value={selectedTrangThai}
            onChange={(e) => setSelectedTrangThai(e.target.value)}
            className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
          >
            <option value="">-- Trạng thái lô hàng --</option>
            <option value="binh_thuong">Bình thường (Còn hàng)</option>
            <option value="het_hang">Đã xuất hết</option>
            <option value="qua_han">Quá hạn</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadData();
            }}
            className="relative flex-1 sm:flex-initial"
          >
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8DA0B3]" />
            <input
              type="text"
              placeholder="Tìm mã lô, tên NCC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[#DCEAF4] rounded-xl text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 w-full sm:w-56 transition-all"
            />
          </form>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Khai báo lô mới</span>
          </button>
        </div>
      </div>

      {/* Lots Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
              <tr>
                <th className="py-3 px-4">Mã lô / Cây vải</th>
                <th className="py-3 px-4">Vật tư</th>
                <th className="py-3 px-4">Nhà cung cấp</th>
                <th className="py-3 px-4 text-right">Số lượng nhập</th>
                <th className="py-3 px-4 text-right">Còn lại</th>
                <th className="py-3 px-4 text-right">Đơn giá nhập</th>
                <th className="py-3 px-4">Vị trí lưu kho</th>
                <th className="py-3 px-4 text-center">Hạn sử dụng (FEFO)</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EDF5]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#8DA0B3]">
                    Đang tải danh sách lô vật tư...
                  </td>
                </tr>
              ) : lots.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#8DA0B3]">
                    Không tìm thấy lô vật tư nào.
                  </td>
                </tr>
              ) : (
                lots.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F5FAF]">{row.ma_lo}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#172033]">{row.ten_vat_tu}</p>
                      <p className="text-[11px] text-[#8DA0B3] font-mono">{row.ma_vat_tu_code}</p>
                      {(row.mau_sac || row.kho_vai || row.chieu_dai) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#5F6F82]">
                          {row.mau_sac && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Màu: <strong className="text-[#172033]">{row.mau_sac}</strong>
                            </span>
                          )}
                          {row.kho_vai && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Khổ: <strong className="text-[#172033]">{row.kho_vai}</strong>
                            </span>
                          )}
                          {row.chieu_dai && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Dài: <strong className="text-[#172033]">{formatNumber(row.chieu_dai)}m</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#5F6F82] text-xs">{row.ten_ncc || '-'}</td>
                    <td className="py-3 px-4 text-right text-[#5F6F82]">
                      {formatNumber(row.so_luong_nhap)} {row.ten_dvt}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#172033]">
                      {formatNumber(row.so_luong_hien_tai)} {row.ten_dvt}
                    </td>
                    <td className="py-3 px-4 text-right text-[#172033]">{formatCurrency(row.don_gia_nhap)}</td>
                    <td className="py-3 px-4">
                      {row.ma_vi_tri ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {row.ma_vi_tri}
                        </span>
                      ) : (
                        <span className="text-[#8DA0B3] text-xs">Chưa xếp vị trí</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.tinh_trang_han === 'qua_han' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" /> Quá hạn
                        </span>
                      ) : row.tinh_trang_han === 'sap_het_han' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Sắp hết hạn
                        </span>
                      ) : (
                        <span className="text-xs text-[#5F6F82]">
                          {row.han_su_dung ? new Date(row.han_su_dung).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.trang_thai === 'binh_thuong' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Bình thường
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {row.trang_thai}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Khai Báo Lô Mới */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <h3 className="font-bold text-base text-[#172033] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F5FAF]" />
                Khai Báo Lô Vật Tư / Cây Vải Mới
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#8DA0B3] hover:text-[#172033] hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Mã lô <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: LO-VAI-2026-01"
                    value={formData.ma_lo}
                    onChange={(e) => setFormData({ ...formData, ma_lo: e.target.value.toUpperCase() })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Vật tư <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ma_vat_tu}
                    onChange={(e) => setFormData({ ...formData, ma_vat_tu: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="">-- Chọn mặt hàng --</option>
                    {vatTuList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.ten_vat_tu}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Nhà cung cấp nguồn gốc</label>
                <select
                  value={formData.ma_nha_cung_cap}
                  onChange={(e) => setFormData({ ...formData, ma_nha_cung_cap: e.target.value })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                >
                  <option value="">-- Chọn nhà cung cấp (nếu có) --</option>
                  {nccList.map((ncc) => (
                    <option key={ncc.id} value={ncc.id}>
                      {ncc.ten_ncc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thông số cây vải (FR-03) */}
              <div className="p-3 bg-[#F7FAFC] rounded-xl border border-[#E2EDF5] space-y-2.5">
                <p className="text-xs font-bold text-[#172033]">Thông số cây vải / cuộn vải (FR-03)</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6F82] mb-0.5">Màu sắc</label>
                    <input
                      type="text"
                      placeholder="VD: Trắng Sữa"
                      value={formData.mau_sac}
                      onChange={(e) => setFormData({ ...formData, mau_sac: e.target.value })}
                      className="w-full border border-[#DCEAF4] rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 text-[#172033] bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6F82] mb-0.5">Khổ vải</label>
                    <input
                      type="text"
                      placeholder="VD: 1.6m"
                      value={formData.kho_vai}
                      onChange={(e) => setFormData({ ...formData, kho_vai: e.target.value })}
                      className="w-full border border-[#DCEAF4] rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 text-[#172033] bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6F82] mb-0.5">Chiều dài (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="VD: 120"
                      value={formData.chieu_dai}
                      onChange={(e) => setFormData({ ...formData, chieu_dai: e.target.value })}
                      className="w-full border border-[#DCEAF4] rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 text-[#172033] bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Số lượng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.so_luong_nhap}
                    onChange={(e) => setFormData({ ...formData, so_luong_nhap: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Đơn giá nhập (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.don_gia_nhap}
                    onChange={(e) => setFormData({ ...formData, don_gia_nhap: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Ngày sản xuất</label>
                  <input
                    type="date"
                    value={formData.ngay_san_xuat}
                    onChange={(e) => setFormData({ ...formData, ngay_san_xuat: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Hạn sử dụng (FEFO)</label>
                  <input
                    type="date"
                    value={formData.han_su_dung}
                    onChange={(e) => setFormData({ ...formData, han_su_dung: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Vị trí lưu kho xếp vào</label>
                <select
                  value={formData.ma_vi_tri_kho}
                  onChange={(e) => setFormData({ ...formData, ma_vi_tri_kho: e.target.value })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                >
                  <option value="">-- Chưa chỉ định vị trí --</option>
                  {viTriList.map((vt) => (
                    <option key={vt.id} value={vt.id}>
                      {vt.ten_kho} - {vt.ma_vi_tri} ({vt.ten_vi_tri})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#EBF2F7] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-[#5F6F82] border border-[#DCEAF4] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  Lưu Lô Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
