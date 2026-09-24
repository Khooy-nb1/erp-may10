import React, { useEffect, useState } from 'react';
import { getViTriKho, getDanhSachKho, createViTriKho, deleteViTriKho } from '../services/api';
import { Plus, MapPin, Search, Trash2, CheckCircle2, Box, AlertCircle, X } from 'lucide-react';

export default function ViTriKhoPage({ showToast }) {
  const [locations, setLocations] = useState([]);
  const [khoList, setKhoList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedKho, setSelectedKho] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ma_kho: '',
    ma_vi_tri: '',
    ten_vi_tri: '',
    khu_vuc: '',
    tang: '',
    suc_chua_toi_da: '',
  });

  useEffect(() => {
    getDanhSachKho().then(setKhoList).catch(console.error);
    loadData();
  }, [selectedKho, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getViTriKho({
        ma_kho: selectedKho || undefined,
        trang_thai: selectedStatus || undefined,
        search: search || undefined,
      });
      setLocations(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải vị trí kho' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createViTriKho({
        ...formData,
        suc_chua_toi_da: formData.suc_chua_toi_da ? parseFloat(formData.suc_chua_toi_da) : null,
      });
      showToast({ type: 'success', message: `Thêm vị trí [${formData.ma_vi_tri}] thành công!` });
      setModalOpen(false);
      setFormData({ ma_kho: '', ma_vi_tri: '', ten_vi_tri: '', khu_vuc: '', tang: '', suc_chua_toi_da: '' });
      loadData();
    } catch (err) {
      showToast({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

  const handleDelete = async (id, maViTri) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vị trí [${maViTri}]?`)) return;
    try {
      await deleteViTriKho(id);
      showToast({ type: 'success', message: `Đã xóa vị trí [${maViTri}] thành công.` });
      loadData();
    } catch (err) {
      showToast({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

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
            <option value="">-- Tất cả kho lưu trữ --</option>
            {khoList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten_kho}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
          >
            <option value="">-- Trạng thái vị trí --</option>
            <option value="trong">Còn trống</option>
            <option value="co_hang">Có hàng</option>
            <option value="day">Đã đầy</option>
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
              placeholder="Tìm mã, tên, khu vực..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[#DCEAF4] rounded-xl text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 w-full sm:w-60 transition-all"
            />
          </form>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm vị trí mới</span>
          </button>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
              <tr>
                <th className="py-3 px-4">Kho</th>
                <th className="py-3 px-4">Mã vị trí</th>
                <th className="py-3 px-4">Tên vị trí</th>
                <th className="py-3 px-4">Khu vực</th>
                <th className="py-3 px-4">Tầng / Kệ</th>
                <th className="py-3 px-4 text-right">Sức chứa tối đa</th>
                <th className="py-3 px-4 text-center">Số lô đang chứa</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EDF5]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#8DA0B3]">
                    Đang tải danh mục vị trí kho...
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-[#8DA0B3]">
                    Chưa có vị trí kho nào.
                  </td>
                </tr>
              ) : (
                locations.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#172033]">{row.ten_kho}</td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[#0F5FAF]">{row.ma_vi_tri}</td>
                    <td className="py-3 px-4 font-medium text-[#172033]">{row.ten_vi_tri}</td>
                    <td className="py-3 px-4 text-[#5F6F82]">{row.khu_vuc || '-'}</td>
                    <td className="py-3 px-4 text-[#5F6F82]">{row.tang ? `Tầng ${row.tang}` : '-'}</td>
                    <td className="py-3 px-4 text-right font-medium text-[#172033]">
                      {row.suc_chua_toi_da ? `${row.suc_chua_toi_da}` : 'Không giới hạn'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F7FAFC] text-[#172033] border border-[#E2EDF5]">
                        <Box className="w-3 h-3 text-[#8DA0B3]" />
                        {row.so_luong_lo_dang_chua} lô
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.trang_thai === 'trong' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Trống
                        </span>
                      ) : row.trang_thai === 'co_hang' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Có hàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Đã đầy
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(row.id, row.ma_vi_tri)}
                        title="Xóa vị trí"
                        className="p-1.5 text-[#8DA0B3] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm Mới Vị Trí Kho */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <h3 className="font-bold text-base text-[#172033] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0F5FAF]" />
                Thêm Vị Trí Lưu Kho Mới
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-[#8DA0B3] hover:text-[#172033] hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                  Kho trực thuộc <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.ma_kho}
                  onChange={(e) => setFormData({ ...formData, ma_kho: e.target.value })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                >
                  <option value="">-- Chọn nhà kho --</option>
                  {khoList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ten_kho}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                  Mã vị trí (Duy nhất) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: KHO1-KE-A1, O-B2..."
                  value={formData.ma_vi_tri}
                  onChange={(e) => setFormData({ ...formData, ma_vi_tri: e.target.value.toUpperCase() })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 font-mono text-[#172033] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                  Tên mô tả vị trí <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giá đỡ vải cuộn số 1"
                  value={formData.ten_vi_tri}
                  onChange={(e) => setFormData({ ...formData, ten_vi_tri: e.target.value })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Khu vực</label>
                  <input
                    type="text"
                    placeholder="Khu A, Dãy 2"
                    value={formData.khu_vuc}
                    onChange={(e) => setFormData({ ...formData, khu_vuc: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Tầng / Kệ</label>
                  <input
                    type="text"
                    placeholder="1, 2, 3..."
                    value={formData.tang}
                    onChange={(e) => setFormData({ ...formData, tang: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Sức chứa tối đa (đơn vị)</label>
                <input
                  type="number"
                  placeholder="Để trống nếu không giới hạn"
                  value={formData.suc_chua_toi_da}
                  onChange={(e) => setFormData({ ...formData, suc_chua_toi_da: e.target.value })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                />
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
                  Tạo vị trí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
