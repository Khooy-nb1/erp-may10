import React, { useEffect, useState } from 'react';
import {
  getPhieuXuat,
  getChiTietPhieuXuat,
  createPhieuXuat,
  getDanhSachKho,
  getDanhSachVatTu,
  getLoVatTu,
  getCrossModule,
  getTonKho,
} from '../services/api';
import { Plus, Search, Eye, ArrowUpFromLine, Trash2, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function PhieuXuatPage({ showToast }) {
  const [issues, setIssues] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [vatTuList, setVatTuList] = useState([]);
  const [loList, setLoList] = useState([]);
  const [tonKhoMap, setTonKhoMap] = useState({});
  const [crossRef, setCrossRef] = useState({ donBanHang: [], lenhSanXuat: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKho, setSelectedKho] = useState('');
  const [selectedLoai, setSelectedLoai] = useState('');
  const [search, setSearch] = useState('');

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ma_kho_xuat: '',
    loai_xuat: 'xuat_san_xuat',
    ma_don_ban_hang: '',
    ma_lenh_san_xuat: '',
    nguoi_nhan: '',
    ghi_chu: '',
    chiTiet: [
      {
        ma_vat_tu: '',
        ma_lo_vat_tu: '',
        so_luong_xuat: 1,
        don_gia_xuat: 0,
        ghi_chu: '',
      },
    ],
  });

  useEffect(() => {
    Promise.all([getDanhSachKho(), getDanhSachVatTu(), getLoVatTu(), getCrossModule()]).then(
      ([kho, vt, lo, cr]) => {
        setKhoList(kho);
        setVatTuList(vt);
        setLoList(lo);
        setCrossRef(cr);
      }
    );
    loadData();
  }, [selectedKho, selectedLoai]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPhieuXuat({
        ma_kho: selectedKho || undefined,
        loai_xuat: selectedLoai || undefined,
        search: search || undefined,
      });
      setIssues(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách phiếu xuất' });
    } finally {
      setLoading(false);
    }
  };

  // Tra cứu tồn kho khi đổi kho xuất
  const handleKhoXuatChange = async (khoId) => {
    setFormData({ ...formData, ma_kho_xuat: khoId });
    if (khoId) {
      try {
        const tonData = await getTonKho({ ma_kho: khoId });
        const map = {};
        tonData.forEach((tk) => {
          map[tk.ma_vat_tu] = parseFloat(tk.so_luong_ton);
        });
        setTonKhoMap(map);
      } catch (err) {
        console.error('Lỗi lấy tồn kho:', err);
      }
    } else {
      setTonKhoMap({});
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      const data = await getChiTietPhieuXuat(id);
      setSelectedIssue(data);
      setViewModalOpen(true);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi xem chi tiết phiếu xuất' });
    }
  };

  const addDetailRow = () => {
    setFormData({
      ...formData,
      chiTiet: [
        ...formData.chiTiet,
        { ma_vat_tu: '', ma_lo_vat_tu: '', so_luong_xuat: 1, don_gia_xuat: 0, ghi_chu: '' },
      ],
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
    if (field === 'ma_vat_tu') {
      const vt = vatTuList.find((v) => v.id === parseInt(value, 10));
      if (vt) {
        updated[index].don_gia_xuat = vt.don_gia_chuan || 0;
      }
    }
    setFormData({ ...formData, chiTiet: updated });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      for (const item of formData.chiTiet) {
        if (!item.ma_vat_tu) {
          throw new Error('Vui lòng chọn đầy đủ mặt hàng cho từng dòng xuất.');
        }
        const slXuat = parseFloat(item.so_luong_xuat);
        if (isNaN(slXuat) || slXuat <= 0) {
          throw new Error('Số lượng xuất phải lớn hơn 0.');
        }
        const tonKhaDung = tonKhoMap[item.ma_vat_tu] || 0;
        if (slXuat > tonKhaDung) {
          console.warn(`Cảnh báo: Yêu cầu xuất ${slXuat} lớn hơn tồn khả dụng ${tonKhaDung}`);
        }
      }

      await createPhieuXuat({
        ...formData,
        ma_don_ban_hang: formData.ma_don_ban_hang || undefined,
        ma_lenh_san_xuat: formData.ma_lenh_san_xuat || undefined,
        chiTiet: formData.chiTiet.map((item) => ({
          ma_vat_tu: parseInt(item.ma_vat_tu, 10),
          ma_lo_vat_tu: item.ma_lo_vat_tu ? parseInt(item.ma_lo_vat_tu, 10) : undefined,
          so_luong_xuat: parseFloat(item.so_luong_xuat),
          don_gia_xuat: parseFloat(item.don_gia_xuat) || 0,
          ghi_chu: item.ghi_chu,
        })),
      });

      showToast({ type: 'success', message: 'Lập phiếu xuất kho thành công! Đã trừ tồn kho chính xác.' });
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;
      showToast({
        type: status === 409 ? 'conflict' : 'error',
        errorCode: err.response?.data?.errorCode,
        message: msg,
      });
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
            value={selectedKho}
            onChange={(e) => setSelectedKho(e.target.value)}
            className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
          >
            <option value="">-- Tất cả kho xuất --</option>
            {khoList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_kho}
              </option>
            ))}
          </select>

          <select
            value={selectedLoai}
            onChange={(e) => setSelectedLoai(e.target.value)}
            className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
          >
            <option value="">-- Tất cả mục đích xuất --</option>
            <option value="xuat_san_xuat">Xuất cấp xưởng may (PH2)</option>
            <option value="giao_khach">Xuất giao khách hàng (PH1)</option>
            <option value="chuyen_kho">Xuất điều chuyển kho</option>
            <option value="huy_vat_tu">Xuất hủy vật tư hỏng</option>
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
              placeholder="Tìm mã phiếu, người nhận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[#DCEAF4] rounded-xl text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 w-full sm:w-56 transition-all"
            />
          </form>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Lập phiếu xuất kho</span>
          </button>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
              <tr>
                <th className="py-3 px-4">Mã phiếu xuất</th>
                <th className="py-3 px-4">Kho xuất</th>
                <th className="py-3 px-4">Mục đích xuất</th>
                <th className="py-3 px-4">Ngày xuất</th>
                <th className="py-3 px-4">Thủ kho</th>
                <th className="py-3 px-4">Người nhận hàng</th>
                <th className="py-3 px-4 text-center">Số mặt hàng</th>
                <th className="py-3 px-4 text-right">Tổng giá trị</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EDF5]">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-[#8DA0B3]">
                    Đang tải danh sách phiếu xuất kho...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-[#8DA0B3]">
                    Không có phiếu xuất kho nào.
                  </td>
                </tr>
              ) : (
                issues.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F5FAF]">{row.ma_phieu_xuat}</td>
                    <td className="py-3 px-4 font-semibold text-[#172033]">{row.ten_kho_xuat}</td>
                    <td className="py-3 px-4 text-xs font-medium text-[#5F6F82] capitalize">
                      {row.loai_xuat?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#5F6F82]">
                      {new Date(row.ngay_xuat).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#172033]">{row.ten_thu_kho || '-'}</td>
                    <td className="py-3 px-4 text-xs text-[#5F6F82]">{row.nguoi_nhan || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F7FAFC] text-[#172033] border border-[#E2EDF5]">
                        {row.so_mat_hang} loại
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0F5FAF]">
                      {formatCurrency(row.tong_gia_tri_xuat)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3" /> Đã xuất kho
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenDetail(row.id)}
                        className="p-1.5 text-[#0F5FAF] hover:text-[#0D5299] hover:bg-[#EAF5FC] rounded-lg transition-colors"
                        title="Xem chi tiết phiếu"
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

      {/* Modal Xem Chi Tiết Phiếu Xuất */}
      {viewModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#172033] flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5 text-[#0F5FAF]" />
                  Chi Tiết Phiếu Xuất Kho: {selectedIssue.ma_phieu_xuat}
                </h3>
                <p className="text-xs text-[#5F6F82] mt-1">
                  Kho xuất: <strong className="text-[#172033]">{selectedIssue.ten_kho_xuat}</strong> | Ngày:{' '}
                  {new Date(selectedIssue.ngay_xuat).toLocaleString('vi-VN')} | Người nhận:{' '}
                  <strong className="text-[#172033]">{selectedIssue.nguoi_nhan || '-'}</strong>
                </p>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 rounded-xl text-[#8DA0B3] hover:text-[#172033] hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <div className="overflow-x-auto rounded-xl border border-[#E2EDF5]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7FAFC] text-[#5F6F82] uppercase tracking-wider font-semibold border-b border-[#E2EDF5]">
                    <tr>
                      <th className="py-2.5 px-3">Mã vật tư</th>
                      <th className="py-2.5 px-3">Tên vật tư</th>
                      <th className="py-2.5 px-3">Lô xuất</th>
                      <th className="py-2.5 px-3 text-right">Số lượng xuất</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2EDF5]">
                    {selectedIssue.chiTiet?.map((ct, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FBFC] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0F5FAF]">{ct.ma_vat_tu_code}</td>
                        <td className="py-2.5 px-3 font-medium text-[#172033]">{ct.ten_vat_tu}</td>
                        <td className="py-2.5 px-3 font-mono text-[#5F6F82]">{ct.ma_lo || 'Xuất chung kho'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                          {formatNumber(ct.so_luong_xuat)} {ct.ten_dvt}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5F6F82]">{formatCurrency(ct.don_gia_xuat)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0F5FAF]">
                          {formatCurrency(ct.thanh_tien)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-[#EBF2F7] bg-[#F9FBFC] flex justify-between items-center">
              <span className="text-xs text-[#5F6F82]">
                Tổng giá trị xuất kho:{' '}
                <strong className="text-base text-[#0F5FAF] ml-1">
                  {formatCurrency(selectedIssue.tong_gia_tri_xuat)}
                </strong>
              </span>
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-[#5F6F82] border border-[#DCEAF4] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lập Phiếu Xuất Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#172033] flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5 text-[#0F5FAF]" />
                  Lập Phiếu Xuất Kho Mới (Kiểm soát Concurrency & Chặn âm)
                </h3>
                <p className="text-xs text-[#5F6F82] mt-1">
                  Áp dụng khóa dòng <code className="text-[#0F5FAF] font-mono font-semibold bg-[#EAF5FC] px-1.5 py-0.5 rounded border border-[#DCEAF4]">SELECT ... FOR UPDATE</code> bảo vệ kho tuyệt đối không bị âm.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-[#8DA0B3] hover:text-[#172033] hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Kho xuất hàng <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ma_kho_xuat}
                    onChange={(e) => handleKhoXuatChange(e.target.value)}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="">-- Chọn kho xuất --</option>
                    {khoList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.ten_kho}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Mục đích xuất <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.loai_xuat}
                    onChange={(e) => setFormData({ ...formData, loai_xuat: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="xuat_san_xuat">Xuất cấp xưởng may (PH2)</option>
                    <option value="giao_khach">Xuất giao khách hàng (PH1)</option>
                    <option value="chuyen_kho">Xuất chuyển kho</option>
                    <option value="huy_vat_tu">Xuất thanh lý / hủy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Người nhận hàng</label>
                  <input
                    type="text"
                    placeholder="Tên người nhận, tổ trưởng cắt..."
                    value={formData.nguoi_nhan}
                    onChange={(e) => setFormData({ ...formData, nguoi_nhan: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Detail Items */}
              <div className="border border-[#E2EDF5] rounded-2xl p-4 bg-[#F9FBFC] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                    Chi tiết mặt hàng và số lượng xuất
                  </h4>
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5FAF] hover:text-[#0D5299] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.chiTiet.map((item, idx) => {
                    const tonHienCo = tonKhoMap[item.ma_vat_tu] || 0;
                    const isOverStock = parseFloat(item.so_luong_xuat) > tonHienCo;

                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border transition-all ${
                          isOverStock ? 'border-amber-400 bg-amber-50/20' : 'border-[#E2EDF5]'
                        }`}
                      >
                        <div className="col-span-4">
                          <select
                            required
                            value={item.ma_vat_tu}
                            onChange={(e) => updateDetailRow(idx, 'ma_vat_tu', e.target.value)}
                            className="w-full border border-[#DCEAF4] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                          >
                            <option value="">-- Chọn mặt hàng --</option>
                            {vatTuList.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.ten_vat_tu} (Tồn kho: {tonKhoMap[v.id] !== undefined ? tonKhoMap[v.id] : '?'} {v.ten_dvt})
                              </option>
                            ))}
                          </select>
                          {item.ma_vat_tu && (
                            <span
                              className={`text-[10px] block mt-0.5 font-semibold ${
                                tonHienCo > 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              Tồn khả dụng: {tonHienCo}
                            </span>
                          )}
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.001"
                            placeholder="Số lượng"
                            required
                            value={item.so_luong_xuat}
                            onChange={(e) => updateDetailRow(idx, 'so_luong_xuat', e.target.value)}
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-right outline-none font-bold ${
                              isOverStock
                                ? 'border-amber-500 text-amber-700 bg-amber-50'
                                : 'border-[#DCEAF4] focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 text-[#172033]'
                            }`}
                          />
                          {isOverStock && (
                            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Vượt tồn
                            </span>
                          )}
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Đơn giá"
                            required
                            value={item.don_gia_xuat}
                            onChange={(e) => updateDetailRow(idx, 'don_gia_xuat', e.target.value)}
                            className="w-full border border-[#DCEAF4] rounded-lg px-2.5 py-1.5 text-xs text-right outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                          />
                        </div>

                        <div className="col-span-3">
                          <select
                            value={item.ma_lo_vat_tu}
                            onChange={(e) => updateDetailRow(idx, 'ma_lo_vat_tu', e.target.value)}
                            className="w-full border border-[#DCEAF4] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                          >
                            <option value="">-- Xuất chung (không chọn lô) --</option>
                            {loList
                              .filter((l) => !item.ma_vat_tu || l.ma_vat_tu === parseInt(item.ma_vat_tu, 10))
                              .map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.ma_lo} (Còn: {l.so_luong_hien_tai})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeDetailRow(idx)}
                            className="p-1.5 text-[#8DA0B3] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Xóa dòng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Ghi chú xuất kho</label>
                <textarea
                  rows="2"
                  placeholder="Lý do xuất hoặc ghi chú tổ sản xuất..."
                  value={formData.ghi_chu}
                  onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-[#EBF2F7] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-[#5F6F82] border border-[#DCEAF4] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  Xác Nhận Xuất Kho Thực Tế
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
