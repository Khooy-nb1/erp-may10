import React, { useEffect, useState } from 'react';
import {
  getPhieuChuyen,
  getChiTietPhieuChuyen,
  createPhieuChuyen,
  getDanhSachKho,
  getDanhSachVatTu,
} from '../services/api';
import { Plus, Search, Eye, ArrowLeftRight, Trash2, CheckCircle2, X } from 'lucide-react';

export default function PhieuChuyenPage({ showToast }) {
  const [transfers, setTransfers] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [vatTuList, setVatTuList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKhoXuat, setSelectedKhoXuat] = useState('');
  const [selectedKhoNhap, setSelectedKhoNhap] = useState('');
  const [search, setSearch] = useState('');

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ma_kho_xuat: '',
    ma_kho_nhap: '',
    ly_do: '',
    ghi_chu: '',
    chiTiet: [
      {
        ma_vat_tu: '',
        so_luong_chuyen: 1,
        don_gia: 0,
        ghi_chu: '',
      },
    ],
  });

  useEffect(() => {
    Promise.all([getDanhSachKho(), getDanhSachVatTu()]).then(([kho, vt]) => {
      setKhoList(kho);
      setVatTuList(vt);
    });
    loadData();
  }, [selectedKhoXuat, selectedKhoNhap]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPhieuChuyen({
        ma_kho_xuat: selectedKhoXuat || undefined,
        ma_kho_nhap: selectedKhoNhap || undefined,
        search: search || undefined,
      });
      setTransfers(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải phiếu chuyển kho' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      const data = await getChiTietPhieuChuyen(id);
      setSelectedTransfer(data);
      setViewModalOpen(true);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi xem chi tiết phiếu' });
    }
  };

  const addDetailRow = () => {
    setFormData({
      ...formData,
      chiTiet: [...formData.chiTiet, { ma_vat_tu: '', so_luong_chuyen: 1, don_gia: 0, ghi_chu: '' }],
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
        updated[index].don_gia = vt.don_gia_chuan || 0;
      }
    }
    setFormData({ ...formData, chiTiet: updated });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (formData.ma_kho_xuat === formData.ma_kho_nhap) {
        throw new Error('Kho xuất và kho nhập phải khác nhau theo quy định điều chuyển kho.');
      }

      for (const item of formData.chiTiet) {
        if (!item.ma_vat_tu) {
          throw new Error('Vui lòng chọn đầy đủ mặt hàng cần chuyển.');
        }
        if (parseFloat(item.so_luong_chuyen) <= 0) {
          throw new Error('Số lượng chuyển phải lớn hơn 0.');
        }
      }

      await createPhieuChuyen({
        ...formData,
        chiTiet: formData.chiTiet.map((item) => ({
          ma_vat_tu: parseInt(item.ma_vat_tu, 10),
          so_luong_chuyen: parseFloat(item.so_luong_chuyen),
          don_gia: parseFloat(item.don_gia) || 0,
          ghi_chu: item.ghi_chu,
        })),
      });

      showToast({
        type: 'success',
        message: 'Lập phiếu chuyển kho thành công! Đã trừ kho xuất và cộng kho nhập đồng thời.',
      });
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;
      showToast({
        type: status === 409 ? 'conflict' : 'error',
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
      <div className="bg-white p-4 rounded-2xl border border-[#E2EDF5] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedKhoXuat}
            onChange={(e) => setSelectedKhoXuat(e.target.value)}
            className="border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
          >
            <option value="">-- Tất cả kho xuất --</option>
            {khoList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_kho}
              </option>
            ))}
          </select>

          <select
            value={selectedKhoNhap}
            onChange={(e) => setSelectedKhoNhap(e.target.value)}
            className="border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
          >
            <option value="">-- Tất cả kho nhập --</option>
            {khoList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_kho}
              </option>
            ))}
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
              placeholder="Tìm mã phiếu, lý do..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[#E2EDF5] rounded-xl text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] w-56 transition-colors"
            />
          </form>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D4E90] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Lập phiếu chuyển kho
          </button>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
              <tr>
                <th className="py-3 px-4">Mã phiếu chuyển</th>
                <th className="py-3 px-4">Kho xuất nguồn</th>
                <th className="py-3 px-4">Kho nhập đích</th>
                <th className="py-3 px-4">Ngày chuyển</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4 text-center">Số mặt hàng</th>
                <th className="py-3 px-4">Lý do điều chuyển</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EDF5]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#6B7785]">
                    Đang tải danh sách phiếu chuyển kho...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#6B7785]">
                    Chưa có phiếu chuyển kho nào.
                  </td>
                </tr>
              ) : (
                transfers.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F5FAF]">{row.ma_phieu_chuyen}</td>
                    <td className="py-3 px-4 font-semibold text-rose-700">{row.ten_kho_xuat}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{row.ten_kho_nhap}</td>
                    <td className="py-3 px-4 text-xs text-[#5F6F82]">
                      {new Date(row.ngay_chuyen).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#172033]">{row.ten_nguoi_chuyen || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#172033]">
                        {row.so_mat_hang} loại
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#5F6F82] max-w-xs truncate">{row.ly_do || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã chuyển
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenDetail(row.id)}
                        className="p-1.5 text-[#0F5FAF] hover:text-[#0D4E90] hover:bg-[#EAF5FC] rounded-lg transition-colors"
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

      {/* Modal Xem Chi Tiết Phiếu Chuyển */}
      {viewModalOpen && selectedTransfer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <div>
                <h3 className="font-bold text-lg text-[#172033] flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-[#0F5FAF]" />
                  Chi Tiết Phiếu Chuyển Kho: {selectedTransfer.ma_phieu_chuyen}
                </h3>
                <p className="text-xs text-[#5F6F82] mt-1">
                  Từ: <strong className="text-rose-700">{selectedTransfer.ten_kho_xuat}</strong> ➔ Đến:{' '}
                  <strong className="text-emerald-700">{selectedTransfer.ten_kho_nhap}</strong> | Ngày:{' '}
                  {new Date(selectedTransfer.ngay_chuyen).toLocaleDateString('vi-VN')}
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
                      <th className="py-2.5 px-3 text-right">Số lượng chuyển</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá tham chiếu</th>
                      <th className="py-2.5 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2EDF5]">
                    {selectedTransfer.chiTiet?.map((ct, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FBFC] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0F5FAF]">{ct.ma_vat_tu_code}</td>
                        <td className="py-2.5 px-3 font-medium text-[#172033]">{ct.ten_vat_tu}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                          {formatNumber(ct.so_luong_chuyen)} {ct.ten_dvt}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5F6F82]">{formatCurrency(ct.don_gia)}</td>
                        <td className="py-2.5 px-3 text-[#5F6F82]">{ct.ghi_chu || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-[#EBF2F7] bg-[#F9FBFC] flex justify-end">
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

      {/* Modal Tạo Phiếu Chuyển Kho Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <h3 className="font-bold text-base text-[#172033] flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-[#0F5FAF]" />
                Lập Phiếu Chuyển Kho Nội Bộ (2 Chiều Đồng Bộ)
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
                    Kho xuất (Nguồn) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ma_kho_xuat}
                    onChange={(e) => setFormData({ ...formData, ma_kho_xuat: e.target.value })}
                    className="w-full border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] bg-white font-medium text-rose-700 transition-colors"
                  >
                    <option value="">-- Chọn kho xuất nguồn --</option>
                    {khoList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.ten_kho}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1.5">
                    Kho nhập (Đích) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ma_kho_nhap}
                    onChange={(e) => setFormData({ ...formData, ma_kho_nhap: e.target.value })}
                    className="w-full border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] bg-white font-medium text-emerald-700 transition-colors"
                  >
                    <option value="">-- Chọn kho nhập đích --</option>
                    {khoList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.ten_kho}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1.5">
                  Lý do điều chuyển <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cân đối nguyên liệu phục vụ đơn hàng gấp..."
                  value={formData.ly_do}
                  onChange={(e) => setFormData({ ...formData, ly_do: e.target.value })}
                  className="w-full border border-[#E2EDF5] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
                />
              </div>

              {/* Dynamic items */}
              <div className="border border-[#E2EDF5] rounded-xl p-4 bg-[#F9FBFC] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                    Danh sách vật tư chuyển dịch
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
                      <div className="col-span-6">
                        <select
                          required
                          value={item.ma_vat_tu}
                          onChange={(e) => updateDetailRow(idx, 'ma_vat_tu', e.target.value)}
                          className="w-full border border-[#E2EDF5] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] bg-white transition-colors"
                        >
                          <option value="">-- Chọn mặt hàng --</option>
                          {vatTuList.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.ten_vat_tu} ({v.ten_dvt})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Số lượng chuyển"
                          required
                          value={item.so_luong_chuyen}
                          onChange={(e) => updateDetailRow(idx, 'so_luong_chuyen', e.target.value)}
                          className="w-full border border-[#E2EDF5] rounded-lg px-2.5 py-1.5 text-xs text-right outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] font-bold transition-colors"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Đơn giá"
                          value={item.don_gia}
                          onChange={(e) => updateDetailRow(idx, 'don_gia', e.target.value)}
                          className="w-full border border-[#E2EDF5] rounded-lg px-2.5 py-1.5 text-xs text-right outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#96C8EB] transition-colors"
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
                  Xác Nhận Chuyển Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
