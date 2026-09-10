import React, { useEffect, useState } from 'react';
import {
  getPhieuKiemKe,
  getChiTietPhieuKiemKe,
  createPhieuKiemKe,
  dieuChinhTonKho,
  getDanhSachKho,
  getDanhSachVatTu,
} from '../services/api';
import { Plus, Search, Eye, ClipboardCheck, CheckCircle2, AlertCircle, RefreshCw, Trash2, X } from 'lucide-react';

export default function PhieuKiemKePage({ showToast }) {
  const [audits, setAudits] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [vatTuList, setVatTuList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKho, setSelectedKho] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [adjusting, setAdjusting] = useState(false);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ma_kho: '',
    ky_kiem_ke: `Kỳ kiểm kê Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
    ghi_chu: '',
    chiTiet: [
      {
        ma_vat_tu: '',
        so_luong_thuc_te: 0,
        nguyen_nhan: '',
      },
    ],
  });

  useEffect(() => {
    Promise.all([getDanhSachKho(), getDanhSachVatTu()]).then(([kho, vt]) => {
      setKhoList(kho);
      setVatTuList(vt);
    });
    loadData();
  }, [selectedKho, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPhieuKiemKe({
        ma_kho: selectedKho || undefined,
        trang_thai: selectedStatus || undefined,
        search: search || undefined,
      });
      setAudits(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải phiếu kiểm kê' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      const data = await getChiTietPhieuKiemKe(id);
      setSelectedAudit(data);
      setViewModalOpen(true);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi xem chi tiết kiểm kê' });
    }
  };

  const handleDieuChinh = async (id) => {
    if (!window.confirm('Bạn có chắc muốn áp dụng số lượng thực tế kiểm kê để điều chỉnh tồn kho sổ sách?')) {
      return;
    }
    try {
      setAdjusting(true);
      const res = await dieuChinhTonKho(id);
      showToast({ type: 'success', message: res.message || 'Điều chỉnh cân đối tồn kho thành công!' });
      // Reload detail & table
      const updated = await getChiTietPhieuKiemKe(id);
      setSelectedAudit(updated);
      loadData();
    } catch (err) {
      showToast({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setAdjusting(false);
    }
  };

  const addDetailRow = () => {
    setFormData({
      ...formData,
      chiTiet: [...formData.chiTiet, { ma_vat_tu: '', so_luong_thuc_te: 0, nguyen_nhan: '' }],
    });
  };

  const removeDetailRow = (index) => {
    if (formData.chiTiet.length === 1) return;
    const updated = formData.chiTiet.filter((_, idx) => idx !== index);
    setFormData({ ...formData, chiTiet: updated });
  };

  const updateDetailRow = (index, field, value) => {
    const updated = [...formData.chiTiet];
    updated[index][field] = value;
    setFormData({ ...formData, chiTiet: updated });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      for (const item of formData.chiTiet) {
        if (!item.ma_vat_tu) {
          throw new Error('Vui lòng chọn đầy đủ vật tư kiểm đếm.');
        }
      }

      await createPhieuKiemKe({
        ...formData,
        chiTiet: formData.chiTiet.map((item) => ({
          ma_vat_tu: parseInt(item.ma_vat_tu, 10),
          so_luong_thuc_te: parseFloat(item.so_luong_thuc_te) || 0,
          nguyen_nhan: item.nguyen_nhan,
        })),
      });

      showToast({ type: 'success', message: 'Tạo phiếu kiểm kê thành công!' });
      setCreateModalOpen(false);
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
      <div className="bg-white p-4 rounded-2xl border border-[#E2EDF5] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedKho}
            onChange={(e) => setSelectedKho(e.target.value)}
            className="border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
          >
            <option value="">-- Tất cả kho kiểm kê --</option>
            {khoList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_kho}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
          >
            <option value="">-- Trạng thái kiểm kê --</option>
            <option value="dang_kiem_ke">Đang kiểm kê</option>
            <option value="da_dieu_chinh">Đã cân đối điều chỉnh</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadData();
            }}
            className="relative"
          >
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B7785]" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, kỳ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[#E2EDF5] rounded-xl text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] w-56 transition-colors"
            />
          </form>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D4E90] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Lập đợt kiểm kê mới
          </button>
        </div>
      </div>

      {/* Audits Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
              <tr>
                <th className="py-3 px-4">Mã phiếu</th>
                <th className="py-3 px-4">Kho kiểm kê</th>
                <th className="py-3 px-4">Kỳ kiểm kê</th>
                <th className="py-3 px-4">Ngày kiểm kê</th>
                <th className="py-3 px-4">Trưởng ban kiểm kê</th>
                <th className="py-3 px-4 text-center">Số mặt hàng</th>
                <th className="py-3 px-4 text-right">Giá trị chênh lệch</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EDF5]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#6B7785]">
                    Đang tải danh sách kiểm kê kho...
                  </td>
                </tr>
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#6B7785]">
                    Chưa có phiếu kiểm kê nào.
                  </td>
                </tr>
              ) : (
                audits.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F5FAF]">{row.ma_phieu_kiem_ke}</td>
                    <td className="py-3 px-4 font-semibold text-[#172033]">{row.ten_kho}</td>
                    <td className="py-3 px-4 font-medium text-[#172033]">{row.ky_kiem_ke}</td>
                    <td className="py-3 px-4 text-xs text-[#5F6F82]">
                      {new Date(row.ngay_kiem_ke).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#172033]">{row.ten_truong_kiem_ke || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#172033]">
                        {row.so_mat_hang} loại
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        parseFloat(row.tong_gia_tri_chenh_lech) === 0
                          ? 'text-[#5F6F82]'
                          : parseFloat(row.tong_gia_tri_chenh_lech) > 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {parseFloat(row.tong_gia_tri_chenh_lech) > 0 ? '+' : ''}
                      {formatCurrency(row.tong_gia_tri_chenh_lech)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.trang_thai === 'da_dieu_chinh' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã điều chỉnh
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Đang kiểm kê
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenDetail(row.id)}
                        className="p-1.5 text-[#0F5FAF] hover:text-[#0D4E90] hover:bg-[#EAF5FC] rounded-lg transition-colors"
                        title="Xem chi tiết & Cân đối"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chi Tiết Kiểm Kê & Nút Điều Chỉnh */}
      {viewModalOpen && selectedAudit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <div>
                <h3 className="font-bold text-lg text-[#172033] flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-[#0F5FAF]" />
                  Đối Soát Kiểm Kê: {selectedAudit.ma_phieu_kiem_ke}
                </h3>
                <p className="text-xs text-[#5F6F82] mt-1">
                  Kho: <strong className="text-[#172033]">{selectedAudit.ten_kho}</strong> | Kỳ:{' '}
                  <strong className="text-[#172033]">{selectedAudit.ky_kiem_ke}</strong> | Trạng thái:{' '}
                  <span className="font-bold text-[#0F5FAF] uppercase">{selectedAudit.trang_thai}</span>
                </p>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 text-[#6B7785] hover:text-[#172033] hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <div className="border border-[#E2EDF5] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7FAFC] text-[#5F6F82] font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
                    <tr>
                      <th className="py-2.5 px-3">Mã vật tư</th>
                      <th className="py-2.5 px-3">Tên vật tư</th>
                      <th className="py-2.5 px-3 text-right">Tồn sổ sách</th>
                      <th className="py-2.5 px-3 text-right">Thực tế kiểm</th>
                      <th className="py-2.5 px-3 text-right">Chênh lệch</th>
                      <th className="py-2.5 px-3 text-right">Giá trị lệch (VNĐ)</th>
                      <th className="py-2.5 px-3">Nguyên nhân</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2EDF5]">
                    {selectedAudit.chiTiet?.map((ct, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FBFC] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0F5FAF]">{ct.ma_vat_tu_code}</td>
                        <td className="py-2.5 px-3 font-medium text-[#172033]">{ct.ten_vat_tu}</td>
                        <td className="py-2.5 px-3 text-right text-[#5F6F82]">
                          {formatNumber(ct.so_luong_so_sach)} {ct.ten_dvt}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                          {formatNumber(ct.so_luong_thuc_te)} {ct.ten_dvt}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            parseFloat(ct.chenh_lech) === 0
                              ? 'text-[#5F6F82]'
                              : parseFloat(ct.chenh_lech) > 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {parseFloat(ct.chenh_lech) > 0 ? '+' : ''}
                          {formatNumber(ct.chenh_lech)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            parseFloat(ct.gia_tri_chenh_lech) === 0
                              ? 'text-[#5F6F82]'
                              : parseFloat(ct.gia_tri_chenh_lech) > 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {parseFloat(ct.gia_tri_chenh_lech) > 0 ? '+' : ''}
                          {formatCurrency(ct.gia_tri_chenh_lech)}
                        </td>
                        <td className="py-2.5 px-3 text-[#5F6F82]">{ct.nguyen_nhan || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          {ct.da_dieu_chinh === 'da_dieu_chinh' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ĐÃ CÂN ĐỐI
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              CHƯA CÂN ĐỐI
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-[#EBF2F7] bg-[#F9FBFC] flex justify-between items-center">
              <div>
                {selectedAudit.trang_thai !== 'da_dieu_chinh' && (
                  <button
                    onClick={() => handleDieuChinh(selectedAudit.id)}
                    disabled={adjusting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${adjusting ? 'animate-spin' : ''}`} />
                    Cân Đối & Tự Động Điều Chỉnh Tồn Kho
                  </button>
                )}
              </div>

              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-sm font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lập Đợt Kiểm Kê Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <h3 className="font-bold text-base text-[#172033] flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#0F5FAF]" />
                Khởi Tạo Đợt Kiểm Kê Kho Mới
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-[#6B7785] hover:text-[#172033] hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1.5">
                    Kho kiểm kê <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ma_kho}
                    onChange={(e) => setFormData({ ...formData, ma_kho: e.target.value })}
                    className="w-full border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] bg-white transition-colors"
                  >
                    <option value="">-- Chọn kho kiểm kê --</option>
                    {khoList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.ten_kho}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1.5">
                    Kỳ kiểm kê <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ky_kiem_ke}
                    onChange={(e) => setFormData({ ...formData, ky_kiem_ke: e.target.value })}
                    className="w-full border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
                  />
                </div>
              </div>

              {/* Dynamic items */}
              <div className="border border-[#E2EDF5] rounded-xl p-4 bg-[#F9FBFC] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                    Danh sách mặt hàng kiểm đếm thực tế
                  </h4>
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5FAF] hover:text-[#0D4E90] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.chiTiet.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-[#E2EDF5] shadow-sm"
                    >
                      <div className="col-span-5">
                        <select
                          required
                          value={item.ma_vat_tu}
                          onChange={(e) => updateDetailRow(idx, 'ma_vat_tu', e.target.value)}
                          className="w-full border border-[#E2EDF5] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] bg-white transition-colors"
                        >
                          <option value="">-- Chọn vật tư --</option>
                          {vatTuList.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.ten_vat_tu}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="SL thực tế"
                          required
                          value={item.so_luong_thuc_te}
                          onChange={(e) => updateDetailRow(idx, 'so_luong_thuc_te', e.target.value)}
                          className="w-full border border-[#E2EDF5] rounded-lg px-2.5 py-1.5 text-xs text-right outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] font-bold transition-colors"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Lý do lệch (nếu có)"
                          value={item.nguyen_nhan}
                          onChange={(e) => updateDetailRow(idx, 'nguyen_nhan', e.target.value)}
                          className="w-full border border-[#E2EDF5] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeDetailRow(idx)}
                          className="p-1 text-[#6B7785] hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1.5">Ghi chú đợt kiểm kê</label>
                <textarea
                  rows="2"
                  placeholder="Ghi chú thành phần ban kiểm kê hoặc tình trạng kho..."
                  value={formData.ghi_chu}
                  onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                  className="w-full border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-[#EBF2F7] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-sm font-semibold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D4E90] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  Lưu Phiếu Kiểm Kê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
