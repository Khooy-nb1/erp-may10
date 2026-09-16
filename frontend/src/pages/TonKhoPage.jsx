import React, { useEffect, useState } from 'react';
import {
  getTonKho,
  getDanhSachKho,
  getTheKho,
  getDanhSachVatTu,
  createVatTu,
  updateVatTu,
  deactivateVatTu,
  getDanhSachDVT,
  getDanhSachNCC,
} from '../services/api';
import {
  Search,
  Filter,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Plus,
  Edit2,
  Power,
  Package,
  ListFilter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Scale,
  Check,
} from 'lucide-react';

export default function TonKhoPage({ showToast }) {
  // Main Tab: 'ton_kho' | 'danh_muc'
  const [activeTab, setActiveTab] = useState('ton_kho');

  // ==========================================
  // TAB 1: SỐ DƯ TỒN KHO & THẺ KHO (FR-04, FR-11)
  // ==========================================
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

  // ==========================================
  // TAB 2: DANH MỤC VẬT TƯ (FR-01)
  // ==========================================
  const [vatTuList, setVatTuList] = useState([]);
  const [dvtList, setDvtList] = useState([]);
  const [nccList, setNccList] = useState([]);
  const [loadingVatTu, setLoadingVatTu] = useState(false);
  const [vtSearch, setVtSearch] = useState('');
  const [vtLoai, setVtLoai] = useState('');
  const [vtTrangThai, setVtTrangThai] = useState('');

  // Modal Thêm / Sửa vật tư
  const [vtModalOpen, setVtModalOpen] = useState(false);
  const [editingVt, setEditingVt] = useState(null); // null = create, object = edit
  const [vtFormData, setVtFormData] = useState({
    ma_vat_tu: '',
    ten_vat_tu: '',
    loai_vat_tu: 'vai_chinh',
    ma_don_vi_tinh: '',
    quy_cach: '',
    muc_ton_toi_thieu: '',
    muc_ton_toi_da: '',
    gia_nhap_trung_binh: '',
    nha_cung_cap_chinh: '',
  });

  useEffect(() => {
    getDanhSachKho().then(setKhoList).catch(console.error);
    getDanhSachDVT().then(setDvtList).catch(console.error);
    getDanhSachNCC().then(setNccList).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'ton_kho') {
      loadTonKhoData();
    } else {
      loadVatTuData();
    }
  }, [activeTab, selectedKho, selectedLoai, duoiDinhMuc, vtLoai, vtTrangThai]);

  const loadTonKhoData = async () => {
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

  const loadVatTuData = async () => {
    try {
      setLoadingVatTu(true);
      const data = await getDanhSachVatTu({
        loai_vat_tu: vtLoai || undefined,
        trang_thai: vtTrangThai || undefined,
        search: vtSearch || undefined,
      });
      setVatTuList(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải danh mục vật tư' });
    } finally {
      setLoadingVatTu(false);
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

  // Open modal create Vat Tu
  const handleOpenCreateVt = () => {
    setEditingVt(null);
    setVtFormData({
      ma_vat_tu: '',
      ten_vat_tu: '',
      loai_vat_tu: 'vai_chinh',
      ma_don_vi_tinh: dvtList[0]?.id || '',
      quy_cach: '',
      muc_ton_toi_thieu: '100',
      muc_ton_toi_da: '5000',
      gia_nhap_trung_binh: '0',
      nha_cung_cap_chinh: '',
    });
    setVtModalOpen(true);
  };

  // Open modal edit Vat Tu
  const handleOpenEditVt = (vt) => {
    setEditingVt(vt);
    setVtFormData({
      ma_vat_tu: vt.ma_vat_tu || '',
      ten_vat_tu: vt.ten_vat_tu || '',
      loai_vat_tu: vt.loai_vat_tu || 'vai_chinh',
      ma_don_vi_tinh: vt.ma_dvt || '',
      quy_cach: vt.quy_cach || '',
      muc_ton_toi_thieu: vt.dinh_muc_ton_toi_thieu ?? '',
      muc_ton_toi_da: vt.muc_ton_toi_da ?? '',
      gia_nhap_trung_binh: vt.don_gia_chuan ?? '',
      nha_cung_cap_chinh: vt.ma_ncc || '',
    });
    setVtModalOpen(true);
  };

  // Save Vat Tu (Create / Update)
  const handleSubmitVt = async (e) => {
    e.preventDefault();
    const minVal = parseFloat(vtFormData.muc_ton_toi_thieu) || 0;
    const maxVal = parseFloat(vtFormData.muc_ton_toi_da) || 0;

    if (maxVal > 0 && minVal > maxVal) {
      showToast({
        type: 'error',
        message: 'Định mức tồn tối thiểu không được lớn hơn định mức tồn tối đa!',
      });
      return;
    }

    try {
      const payload = {
        ma_vat_tu: vtFormData.ma_vat_tu.trim().toUpperCase(),
        ten_vat_tu: vtFormData.ten_vat_tu.trim(),
        loai_vat_tu: vtFormData.loai_vat_tu,
        ma_don_vi_tinh: parseInt(vtFormData.ma_don_vi_tinh, 10),
        quy_cach: vtFormData.quy_cach ? vtFormData.quy_cach.trim() : null,
        muc_ton_toi_thieu: minVal,
        muc_ton_toi_da: maxVal,
        gia_nhap_trung_binh: parseFloat(vtFormData.gia_nhap_trung_binh) || 0,
        nha_cung_cap_chinh: vtFormData.nha_cung_cap_chinh ? parseInt(vtFormData.nha_cung_cap_chinh, 10) : null,
      };

      if (editingVt) {
        await updateVatTu(editingVt.id, payload);
        showToast({ type: 'success', message: `Cập nhật vật tư [${payload.ma_vat_tu}] thành công!` });
      } else {
        await createVatTu(payload);
        showToast({ type: 'success', message: `Tạo mới vật tư [${payload.ma_vat_tu}] thành công!` });
      }

      setVtModalOpen(false);
      loadVatTuData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu vật tư';
      showToast({ type: 'error', message: msg });
    }
  };

  // Soft deactivate / reactivate Vat Tu
  const handleToggleStatusVt = async (vt) => {
    const newStatus = vt.trang_thai === 'ngung_su_dung' ? 'dang_su_dung' : 'ngung_su_dung';
    const actionLabel = newStatus === 'ngung_su_dung' ? 'ngừng sử dụng' : 'kích hoạt lại';

    if (window.confirm(`Bạn có chắc muốn ${actionLabel} vật tư [${vt.ma_vat_tu} - ${vt.ten_vat_tu}]?`)) {
      try {
        await deactivateVatTu(vt.id, newStatus);
        showToast({
          type: 'success',
          message: `Đã ${actionLabel} vật tư [${vt.ma_vat_tu}]!`,
        });
        loadVatTuData();
      } catch (err) {
        showToast({ type: 'error', message: err.response?.data?.message || err.message });
      }
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

  // Helper render transaction badges in The Kho
  const renderTxBadge = (type) => {
    switch (type) {
      case 'nhap_kho':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ArrowDownRight className="w-3.5 h-3.5" /> Nhập kho
          </span>
        );
      case 'xuat_kho':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            <ArrowUpRight className="w-3.5 h-3.5" /> Xuất kho
          </span>
        );
      case 'chuyen_kho_xuat':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Chuyển xuất
          </span>
        );
      case 'chuyen_kho_nhap':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Chuyển nhập
          </span>
        );
      case 'dieu_chinh_kiem_ke':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            <Scale className="w-3.5 h-3.5" /> Điều chỉnh KK
          </span>
        );
      default:
        return <span className="text-[#5F6F82] capitalize">{type?.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-[#E2EDF5] shadow-sm flex items-center gap-2">
        <button
          onClick={() => setActiveTab('ton_kho')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'ton_kho'
              ? 'bg-[#0F5FAF] text-white shadow-sm'
              : 'text-[#5F6F82] hover:bg-[#F2F6FA] hover:text-[#172033]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Số Dư Tồn Kho & Thẻ Kho</span>
        </button>

        <button
          onClick={() => setActiveTab('danh_muc')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'danh_muc'
              ? 'bg-[#0F5FAF] text-white shadow-sm'
              : 'text-[#5F6F82] hover:bg-[#F2F6FA] hover:text-[#172033]'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Danh Mục Vật Tư May 10 (FR-01)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SỐ DƯ TỒN KHO & THẺ KHO */}
      {/* ========================================================================= */}
      {activeTab === 'ton_kho' && (
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
                loadTonKhoData();
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

          {/* Main Stock Table */}
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
                    <th className="py-3 px-4 text-right">Định mức min</th>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DANH MỤC VẬT TƯ MAY 10 (FR-01) */}
      {/* ========================================================================= */}
      {activeTab === 'danh_muc' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2EDF5] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Loại vật tư select */}
              <select
                value={vtLoai}
                onChange={(e) => setVtLoai(e.target.value)}
                className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
              >
                <option value="">-- Tất cả nhóm vật tư --</option>
                <option value="vai_chinh">Vải chính</option>
                <option value="vai_lot">Vải lót</option>
                <option value="chi_may">Chỉ may</option>
                <option value="cuc_kep">Cúc / Kẹp</option>
                <option value="khoa_keo">Khóa kéo</option>
                <option value="phu_lieu">Phụ liệu khác</option>
              </select>

              {/* Trạng thái select */}
              <select
                value={vtTrangThai}
                onChange={(e) => setVtTrangThai(e.target.value)}
                className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
              >
                <option value="">-- Tất cả trạng thái --</option>
                <option value="dang_su_dung">Đang sử dụng</option>
                <option value="ngung_su_dung">Ngừng sử dụng</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadVatTuData();
                }}
                className="flex items-center gap-2 flex-1 sm:flex-initial"
              >
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8DA0B3]" />
                  <input
                    type="text"
                    placeholder="Tìm mã, tên, quy cách..."
                    value={vtSearch}
                    onChange={(e) => setVtSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-[#DCEAF4] rounded-xl text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 w-full sm:w-56 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  Tìm
                </button>
              </form>

              <button
                onClick={handleOpenCreateVt}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm vật tư</span>
              </button>
            </div>
          </div>

          {/* Material Master Table */}
          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
                  <tr>
                    <th className="py-3 px-4">Mã vật tư</th>
                    <th className="py-3 px-4">Tên vật tư</th>
                    <th className="py-3 px-4">Loại vật tư</th>
                    <th className="py-3 px-4">ĐVT</th>
                    <th className="py-3 px-4 text-right">Định mức (Min - Max)</th>
                    <th className="py-3 px-4">Quy cách kỹ thuật</th>
                    <th className="py-3 px-4 text-right">Đơn giá chuẩn</th>
                    <th className="py-3 px-4">Nhà cung cấp chính</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2EDF5]">
                  {loadingVatTu ? (
                    <tr>
                      <td colSpan="10" className="text-center py-10 text-[#8DA0B3]">
                        Đang tải danh mục vật tư...
                      </td>
                    </tr>
                  ) : vatTuList.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-10 text-[#8DA0B3]">
                        Không tìm thấy vật tư nào trong danh mục.
                      </td>
                    </tr>
                  ) : (
                    vatTuList.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#0F5FAF]">{row.ma_vat_tu}</td>
                        <td className="py-3 px-4 font-medium text-[#172033]">{row.ten_vat_tu}</td>
                        <td className="py-3 px-4 text-[#5F6F82] capitalize">{row.loai_vat_tu?.replace('_', ' ')}</td>
                        <td className="py-3 px-4 font-semibold text-[#172033]">{row.ten_dvt || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-[#5F6F82]">
                          {formatNumber(row.dinh_muc_ton_toi_thieu)} - {formatNumber(row.muc_ton_toi_da)}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#5F6F82] max-w-xs truncate" title={row.quy_cach}>
                          {row.quy_cach || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#172033]">
                          {formatCurrency(row.don_gia_chuan)}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#5F6F82]">{row.ten_ncc || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          {row.trang_thai === 'dang_su_dung' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" /> Đang dùng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <Power className="w-3 h-3" /> Ngừng dùng
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditVt(row)}
                              title="Chỉnh sửa thông tin"
                              className="p-1.5 text-[#0F5FAF] hover:bg-[#EAF5FC] rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatusVt(row)}
                              title={row.trang_thai === 'dang_su_dung' ? 'Ngừng sử dụng' : 'Kích hoạt lại'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                row.trang_thai === 'dang_su_dung'
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THẺ KHO CHI TIẾT ĐẦY ĐỦ 5 NGUỒN BIẾN ĐỘNG (FR-11) */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#172033] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#0F5FAF]" />
                  Sổ Thẻ Kho Điện Tử — Lịch Sử Biến Động Nhập / Xuất / Chuyển Kho / Kiểm Kê (FR-11)
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
                <div className="py-12 text-center text-[#8DA0B3]">Đang kết xuất sổ thẻ kho...</div>
              ) : theKhoData?.nhatKyBienDong?.length === 0 ? (
                <div className="py-12 text-center text-[#8DA0B3]">
                  Chưa có phát sinh giao dịch nhập xuất, luân chuyển hoặc kiểm kê cho mặt hàng này.
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
                        <th className="py-2.5 px-3 text-right">Phát sinh</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50 text-[#0F5FAF]">Số dư lũy kế</th>
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
                          <td className="py-2.5 px-3">{renderTxBadge(tx.loai_bien_dong)}</td>
                          <td className="py-2.5 px-3 text-[#5F6F82] capitalize">{tx.dien_giai?.replace('_', ' ')}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              tx.huong_bien_dong === 'tang' ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {tx.huong_bien_dong === 'tang' ? '+' : '-'}
                            {formatNumber(tx.so_luong)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F5FAF] bg-blue-50/30">
                            {formatNumber(tx.so_du_luy_ke)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#5F6F82]">{formatCurrency(tx.don_gia)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[#172033]">
                            {formatCurrency(tx.thanh_tien)}
                          </td>
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

      {/* ========================================================================= */}
      {/* MODAL THÊM / SỬA VẬT TƯ (FR-01) */}
      {/* ========================================================================= */}
      {vtModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <h3 className="font-bold text-base text-[#172033] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0F5FAF]" />
                {editingVt ? `Chỉnh Sửa Vật Tư [${editingVt.ma_vat_tu}]` : 'Thêm Mới Vật Tư May 10'}
              </h3>
              <button
                onClick={() => setVtModalOpen(false)}
                className="p-1.5 rounded-xl text-[#8DA0B3] hover:text-[#172033] hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitVt} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Mã vật tư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingVt}
                    placeholder="VD: VT-VAI-COTTON-02"
                    value={vtFormData.ma_vat_tu}
                    onChange={(e) => setVtFormData({ ...vtFormData, ma_vat_tu: e.target.value.toUpperCase() })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Tên vật tư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Vải Cotton 100% Trắng"
                    value={vtFormData.ten_vat_tu}
                    onChange={(e) => setVtFormData({ ...vtFormData, ten_vat_tu: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Nhóm / Loại vật tư <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={vtFormData.loai_vat_tu}
                    onChange={(e) => setVtFormData({ ...vtFormData, loai_vat_tu: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="vai_chinh">Vải chính</option>
                    <option value="vai_lot">Vải lót</option>
                    <option value="chi_may">Chỉ may</option>
                    <option value="cuc_kep">Cúc / Kẹp</option>
                    <option value="khoa_keo">Khóa kéo</option>
                    <option value="phu_lieu">Phụ liệu khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Đơn vị tính <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={vtFormData.ma_don_vi_tinh}
                    onChange={(e) => setVtFormData({ ...vtFormData, ma_don_vi_tinh: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {dvtList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.ten_dvt} ({d.ma_dvt})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Định mức tồn Min (An toàn)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="VD: 50"
                    value={vtFormData.muc_ton_toi_thieu}
                    onChange={(e) => setVtFormData({ ...vtFormData, muc_ton_toi_thieu: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Định mức tồn Max (Chống đọng vốn)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="VD: 5000"
                    value={vtFormData.muc_ton_toi_da}
                    onChange={(e) => setVtFormData({ ...vtFormData, muc_ton_toi_da: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Đơn giá nhập chuẩn (VNĐ)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="VD: 85000"
                    value={vtFormData.gia_nhap_trung_binh}
                    onChange={(e) => setVtFormData({ ...vtFormData, gia_nhap_trung_binh: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Nhà cung cấp chính</label>
                  <select
                    value={vtFormData.nha_cung_cap_chinh}
                    onChange={(e) => setVtFormData({ ...vtFormData, nha_cung_cap_chinh: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {nccList.map((ncc) => (
                      <option key={ncc.id} value={ncc.id}>
                        {ncc.ten_ncc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Quy cách kỹ thuật / Tiêu chuẩn vải</label>
                <textarea
                  rows="2"
                  placeholder="VD: Khổ 1.6m, định lượng 220gsm, nhuộm hoạt tính bền màu..."
                  value={vtFormData.quy_cach}
                  onChange={(e) => setVtFormData({ ...vtFormData, quy_cach: e.target.value })}
                  className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                />
              </div>

              <div className="pt-3 border-t border-[#EBF2F7] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVtModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-[#5F6F82] border border-[#DCEAF4] rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  {editingVt ? 'Cập Nhật' : 'Thêm Vào Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
