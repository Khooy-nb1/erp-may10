import React, { useEffect, useState } from 'react';
import {
  getPhieuNhap,
  getChiTietPhieuNhap,
  createPhieuNhap,
  getDanhSachKho,
  getDanhSachVatTu,
  getViTriKho,
  getCrossModule,
  getReceivingOrders,
} from '../services/api';
import {
  Plus,
  Search,
  Eye,
  ArrowDownToLine,
  Trash2,
  CheckCircle2,
  X,
  Truck,
  ClipboardCheck,
  RefreshCw,
  Package,
} from 'lucide-react';

export default function PhieuNhapPage({ showToast, initialView = 'phieu-nhap' }) {
  const [activeTab, setActiveTab] = useState(initialView);
  const [receipts, setReceipts] = useState([]);
  const [receivingOrders, setReceivingOrders] = useState([]);
  const [loadingReceiving, setLoadingReceiving] = useState(false);
  const [receivingSearch, setReceivingSearch] = useState('');
  const [khoList, setKhoList] = useState([]);
  const [vatTuList, setVatTuList] = useState([]);
  const [viTriList, setViTriList] = useState([]);
  const [crossRef, setCrossRef] = useState({ donMuaHang: [], lenhSanXuat: [] });
  const [loading, setLoading] = useState(true);

  // Sync activeTab when initialView changes
  useEffect(() => {
    if (initialView) {
      setActiveTab(initialView);
    }
  }, [initialView]);

  // Filters
  const [selectedKho, setSelectedKho] = useState('');
  const [selectedLoai, setSelectedLoai] = useState('');
  const [search, setSearch] = useState('');

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ma_kho_nhap: '',
    loai_nhap: 'tu_mua_hang',
    ma_don_mua_hang: '',
    ma_lenh_san_xuat: '',
    nguoi_giao_hang: '',
    ghi_chu: '',
    chiTiet: [
      {
        ma_vat_tu: '',
        so_luong_nhap: 1,
        don_gia_nhap: 0,
        ma_vi_tri_kho: '',
        ghi_chu: '',
      },
    ],
  });

  const fetchReceiving = async () => {
    try {
      setLoadingReceiving(true);
      const data = await getReceivingOrders();
      setReceivingOrders(data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách chờ nhập:', err);
    } finally {
      setLoadingReceiving(false);
    }
  };

  useEffect(() => {
    Promise.all([getDanhSachKho(), getDanhSachVatTu(), getViTriKho(), getCrossModule()]).then(
      ([kho, vt, vtk, cr]) => {
        setKhoList(kho);
        setVatTuList(vt);
        setViTriList(vtk);
        setCrossRef(cr);
      }
    );
    loadData();
    fetchReceiving();
  }, [selectedKho, selectedLoai]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPhieuNhap({
        ma_kho: selectedKho || undefined,
        loai_nhap: selectedLoai || undefined,
        search: search || undefined,
      });
      setReceipts(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi tải danh sách phiếu nhập' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      const data = await getChiTietPhieuNhap(id);
      setSelectedReceipt(data);
      setViewModalOpen(true);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Lỗi khi xem chi tiết phiếu' });
    }
  };

  const addDetailRow = () => {
    setFormData({
      ...formData,
      chiTiet: [
        ...formData.chiTiet,
        { ma_vat_tu: '', so_luong_nhap: 1, don_gia_nhap: 0, ma_vi_tri_kho: '', ghi_chu: '' },
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
        updated[index].don_gia_nhap = vt.don_gia_chuan || 0;
      }
    }
    setFormData({ ...formData, chiTiet: updated });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Validate
      for (const item of formData.chiTiet) {
        if (!item.ma_vat_tu) {
          throw new Error('Vui lòng chọn đầy đủ mặt hàng cho từng dòng chi tiết.');
        }
        if (parseFloat(item.so_luong_nhap) <= 0) {
          throw new Error('Số lượng nhập phải lớn hơn 0.');
        }
      }

      await createPhieuNhap({
        ...formData,
        ma_don_mua_hang: formData.ma_don_mua_hang || undefined,
        ma_lenh_san_xuat: formData.ma_lenh_san_xuat || undefined,
        chiTiet: formData.chiTiet.map((item) => ({
          ma_vat_tu: parseInt(item.ma_vat_tu, 10),
          so_luong_nhap: parseFloat(item.so_luong_nhap),
          don_gia_nhap: parseFloat(item.don_gia_nhap) || 0,
          ma_vi_tri_kho: item.ma_vi_tri_kho ? parseInt(item.ma_vi_tri_kho, 10) : undefined,
          ghi_chu: item.ghi_chu,
        })),
      });

      showToast({ type: 'success', message: 'Lập phiếu nhập kho thành công! Tồn kho đã được cập nhật.' });
      setCreateModalOpen(false);
      loadData();
      fetchReceiving();
    } catch (err) {
      showToast({ type: 'error', message: err.response?.data?.message || err.message });
    }
  };

  const handleOpenReceivePO = (po) => {
    const defaultKho = khoList.length > 0 ? String(khoList[0].id) : '1';
    const items = (po.chiTiet || []).map((it) => ({
      ma_vat_tu: String(it.ma_vat_tu),
      so_luong_nhap: parseFloat(it.so_luong_can_nhap) > 0 ? parseFloat(it.so_luong_can_nhap) : parseFloat(it.so_luong_dat),
      don_gia_nhap: parseFloat(it.don_gia) || 0,
      ma_vi_tri_kho: '',
      ghi_chu: `Nhập theo đơn mua ${po.ma_don_mua}`,
    }));

    setFormData({
      ma_kho_nhap: defaultKho,
      loai_nhap: 'tu_mua_hang',
      ma_don_mua_hang: String(po.id),
      ma_lenh_san_xuat: '',
      nguoi_giao_hang: po.ten_nha_cung_cap || '',
      ghi_chu: `Nhập kho từ đơn mua hàng ${po.ma_don_mua}`,
      chiTiet: items.length > 0 ? items : [{ ma_vat_tu: '', so_luong_nhap: 1, don_gia_nhap: 0, ma_vi_tri_kho: '', ghi_chu: '' }],
    });
    setCreateModalOpen(true);
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

  return (
    <div className="space-y-4">
      {/* Sub-tabs header for Receiving vs Receipts */}
      <div className="flex border-b border-[#E2EDF5] bg-white rounded-2xl p-1.5 shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('cho-nhap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'cho-nhap'
              ? 'bg-[#0F5FAF] text-white shadow-sm'
              : 'text-[#5F6F82] hover:text-[#172033] hover:bg-[#F4FAFE]'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Đơn mua hàng chờ nhập kho</span>
          {receivingOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'cho-nhap' ? 'bg-white/20 text-white' : 'bg-[#EAF5FC] text-[#0F5FAF]'
              }`}
            >
              {receivingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('phieu-nhap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'phieu-nhap'
              ? 'bg-[#0F5FAF] text-white shadow-sm'
              : 'text-[#5F6F82] hover:text-[#172033] hover:bg-[#F4FAFE]'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Danh sách phiếu nhập kho</span>
          {receipts.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'phieu-nhap' ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#5F6F82]'
              }`}
            >
              {receipts.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Đơn mua hàng chờ nhập kho */}
      {activeTab === 'cho-nhap' ? (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2EDF5] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EAF5FC] text-[#0F5FAF] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#172033]">
                  Đơn mua hàng đã duyệt chờ tiếp nhận (PH3 ➔ PH4)
                </h4>
                <p className="text-xs text-[#5F6F82]">
                  Đối chiếu số lượng đặt, tiếp nhận hàng thực tế và tạo phiếu nhập kho cập nhật tồn kho
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8DA0B3]" />
                <input
                  type="text"
                  placeholder="Tìm mã đơn mua, nhà cung cấp..."
                  value={receivingSearch}
                  onChange={(e) => setReceivingSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-[#DCEAF4] rounded-xl text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 w-full sm:w-64 transition-all"
                />
              </div>

              <button
                onClick={fetchReceiving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCEAF4] text-xs font-semibold text-[#0F4C81] bg-white hover:bg-[#EAF5FC] transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#0F5FAF] ${loadingReceiving ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
                  <tr>
                    <th className="py-3 px-4">Mã đơn mua</th>
                    <th className="py-3 px-4">Nhà cung cấp</th>
                    <th className="py-3 px-4">Ngày đặt</th>
                    <th className="py-3 px-4">Mặt hàng cần nhập</th>
                    <th className="py-3 px-4 text-right">Tổng thanh toán</th>
                    <th className="py-3 px-4 text-right">Tổng đặt</th>
                    <th className="py-3 px-4 text-right">Đã nhập</th>
                    <th className="py-3 px-4 text-right text-amber-600">Còn lại</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2EDF5]">
                  {loadingReceiving ? (
                    <tr>
                      <td colSpan="10" className="text-center py-10 text-[#8DA0B3]">
                        Đang tải danh sách đơn chờ nhập kho...
                      </td>
                    </tr>
                  ) : receivingOrders.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-10 text-[#8DA0B3]">
                        Không có đơn mua nào đang chờ nhập kho.
                      </td>
                    </tr>
                  ) : (
                    receivingOrders
                      .filter((po) => {
                        if (!receivingSearch) return true;
                        const s = receivingSearch.toLowerCase();
                        return (
                          po.ma_don_mua?.toLowerCase().includes(s) ||
                          po.ten_nha_cung_cap?.toLowerCase().includes(s) ||
                          po.ncc_code?.toLowerCase().includes(s)
                        );
                      })
                      .map((po) => {
                        const tongDat = parseFloat(po.tong_dat) || 0;
                        const tongDaNhap = parseFloat(po.tong_da_nhap) || 0;
                        const tongConLai = parseFloat(po.tong_con_lai) || 0;

                        return (
                          <tr key={po.id} className="hover:bg-[#F9FBFC] transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#0F5FAF]">
                              {po.ma_don_mua}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-[#172033]">{po.ten_nha_cung_cap}</div>
                              <div className="text-[11px] text-[#8DA0B3]">{po.ncc_code}</div>
                            </td>
                            <td className="py-3 px-4 text-xs text-[#5F6F82]">
                              {new Date(po.ngay_dat_hang).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {po.chiTiet && po.chiTiet.length > 0 ? (
                                <div>
                                  <span className="font-medium text-[#172033]">
                                    {po.chiTiet[0].ten_vat_tu}
                                  </span>
                                  {po.chiTiet.length > 1 && (
                                    <span className="text-[11px] text-[#0F5FAF] ml-1">
                                      (+{po.chiTiet.length - 1} loại khác)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#8DA0B3]">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-[#172033]">
                              {formatCurrency(po.tong_thanh_toan)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-[#172033]">
                              {formatNumber(tongDat)}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                              {formatNumber(tongDaNhap)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-amber-600">
                              {formatNumber(tongConLai)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {po.trang_thai === 'dang_giao' ? 'Đang giao dở' : 'Chờ giao hàng'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleOpenReceivePO(po)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F5FAF] hover:bg-[#0D5299] text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>Nhập kho</span>
                              </button>
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
      ) : (
        /* Tab 2: Danh sách phiếu nhập kho đã lập */
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2EDF5] shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedKho}
                onChange={(e) => setSelectedKho(e.target.value)}
                className="border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-white text-[#172033] outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 transition-all"
              >
                <option value="">-- Tất cả kho nhập --</option>
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
                <option value="">-- Tất cả nguồn nhập --</option>
                <option value="tu_mua_hang">Từ đơn mua hàng (PH3)</option>
                <option value="thanh_pham_san_xuat">Thành phẩm sau sản xuất (PH2)</option>
                <option value="chuyen_kho">Điều chuyển từ kho khác</option>
                <option value="kiem_ke">Sau kiểm kê cân đối</option>
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
                  placeholder="Tìm mã phiếu, người giao..."
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
                <span>Lập phiếu nhập kho</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2EDF5] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F7FAFC] text-[#5F6F82] text-xs font-semibold uppercase tracking-wider border-b border-[#E2EDF5]">
                  <tr>
                    <th className="py-3 px-4">Mã phiếu nhập</th>
                    <th className="py-3 px-4">Kho nhập</th>
                    <th className="py-3 px-4">Loại nhập</th>
                    <th className="py-3 px-4">Ngày nhập</th>
                    <th className="py-3 px-4">Thủ kho</th>
                    <th className="py-3 px-4">Người giao hàng</th>
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
                        Đang tải danh sách phiếu nhập kho...
                      </td>
                    </tr>
                  ) : receipts.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-10 text-[#8DA0B3]">
                        Không có phiếu nhập kho nào.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F9FBFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#0F5FAF]">{row.ma_phieu_nhap}</td>
                        <td className="py-3 px-4 font-semibold text-[#172033]">{row.ten_kho_nhap}</td>
                        <td className="py-3 px-4 text-xs font-medium text-[#5F6F82] capitalize">
                          {row.loai_nhap?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#5F6F82]">
                          {new Date(row.ngay_nhap).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#172033]">{row.ten_thu_kho || '-'}</td>
                        <td className="py-3 px-4 text-xs text-[#5F6F82]">{row.nguoi_giao_hang || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F7FAFC] text-[#172033] border border-[#E2EDF5]">
                            {row.so_mat_hang} loại
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#0F5FAF]">
                          {formatCurrency(row.tong_gia_tri_nhap)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Đã nhập kho
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
        </div>
      )}

      {/* Modal Xem Chi Tiết Phiếu Nhập */}
      {viewModalOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[#172033] flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-[#0F5FAF]" />
                  Chi Tiết Phiếu Nhập Kho: {selectedReceipt.ma_phieu_nhap}
                </h3>
                <p className="text-xs text-[#5F6F82] mt-1">
                  Kho nhập: <strong className="text-[#172033]">{selectedReceipt.ten_kho_nhap}</strong> | Ngày:{' '}
                  {new Date(selectedReceipt.ngay_nhap).toLocaleString('vi-VN')} | Người lập:{' '}
                  <strong className="text-[#172033]">{selectedReceipt.ten_nguoi_tao}</strong>
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
                      <th className="py-2.5 px-3">Vị trí cất</th>
                      <th className="py-2.5 px-3">Mã lô</th>
                      <th className="py-2.5 px-3 text-right">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá</th>
                      <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2EDF5]">
                    {selectedReceipt.chiTiet?.map((ct, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FBFC] transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0F5FAF]">{ct.ma_vat_tu_code}</td>
                        <td className="py-2.5 px-3 font-medium text-[#172033]">{ct.ten_vat_tu}</td>
                        <td className="py-2.5 px-3 font-mono text-[#5F6F82]">{ct.ma_vi_tri || 'Chưa xếp'}</td>
                        <td className="py-2.5 px-3 font-mono text-[#5F6F82]">{ct.ma_lo || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#172033]">
                          {formatNumber(ct.so_luong_nhap)} {ct.ten_dvt}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#5F6F82]">{formatCurrency(ct.don_gia_nhap)}</td>
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
                Tổng cộng thành tiền:{' '}
                <strong className="text-base text-[#0F5FAF] ml-1">
                  {formatCurrency(selectedReceipt.tong_gia_tri_nhap)}
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

      {/* Modal Lập Phiếu Nhập Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl border border-[#DCEAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EBF2F7] flex items-center justify-between bg-[#F9FBFC]">
              <h3 className="font-bold text-base sm:text-lg text-[#172033] flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-[#0F5FAF]" />
                Lập Phiếu Nhập Kho Mới (Cộng dồn Tồn Kho & Lô)
              </h3>
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
                    Kho nhập vào <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ma_kho_nhap}
                    onChange={(e) => setFormData({ ...formData, ma_kho_nhap: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="">-- Chọn kho nhập --</option>
                    {khoList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.ten_kho}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Nguồn gốc nhập <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.loai_nhap}
                    onChange={(e) => setFormData({ ...formData, loai_nhap: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="tu_mua_hang">Từ đơn mua hàng (PH3)</option>
                    <option value="thanh_pham_san_xuat">Thành phẩm sản xuất (PH2)</option>
                    <option value="chuyen_kho">Từ chuyển kho nội bộ</option>
                    <option value="kiem_ke">Cân đối kiểm kê</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Người giao hàng</label>
                  <input
                    type="text"
                    placeholder="Tên tài xế hoặc nhà cung cấp"
                    value={formData.nguoi_giao_hang}
                    onChange={(e) => setFormData({ ...formData, nguoi_giao_hang: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                  />
                </div>
              </div>

              {/* Cross module selection */}
              {formData.loai_nhap === 'tu_mua_hang' && (
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Liên kết Đơn mua hàng PH3 (Tùy chọn)
                  </label>
                  <select
                    value={formData.ma_don_mua_hang}
                    onChange={(e) => setFormData({ ...formData, ma_don_mua_hang: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="">-- Không chọn đơn mua hàng --</option>
                    {crossRef.donMuaHang?.map((dm) => (
                      <option key={dm.id} value={dm.id}>
                        {dm.ma_don_mua} - Ngày đặt: {new Date(dm.ngay_dat_hang).toLocaleDateString('vi-VN')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.loai_nhap === 'thanh_pham_san_xuat' && (
                <div>
                  <label className="block text-xs font-semibold text-[#5F6F82] mb-1">
                    Liên kết Lệnh sản xuất PH2 (Tùy chọn)
                  </label>
                  <select
                    value={formData.ma_lenh_san_xuat}
                    onChange={(e) => setFormData({ ...formData, ma_lenh_san_xuat: e.target.value })}
                    className="w-full border border-[#DCEAF4] rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#0F5FAF] focus:ring-2 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                  >
                    <option value="">-- Không chọn lệnh sản xuất --</option>
                    {crossRef.lenhSanXuat?.map((lsx) => (
                      <option key={lsx.id} value={lsx.id}>
                        {lsx.ma_lenh}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Detail Items */}
              <div className="border border-[#E2EDF5] rounded-2xl p-4 bg-[#F9FBFC] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                    Danh sách chi tiết mặt hàng nhập kho
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
                  {formData.chiTiet.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border border-[#E2EDF5]"
                    >
                      <div className="col-span-4">
                        <select
                          required
                          value={item.ma_vat_tu}
                          onChange={(e) => updateDetailRow(idx, 'ma_vat_tu', e.target.value)}
                          className="w-full border border-[#DCEAF4] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                        >
                          <option value="">-- Chọn vật tư --</option>
                          {vatTuList.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.ten_vat_tu} ({v.ten_dvt})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Số lượng"
                          required
                          value={item.so_luong_nhap}
                          onChange={(e) => updateDetailRow(idx, 'so_luong_nhap', e.target.value)}
                          className="w-full border border-[#DCEAF4] rounded-lg px-2.5 py-1.5 text-xs text-right outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Đơn giá"
                          required
                          value={item.don_gia_nhap}
                          onChange={(e) => updateDetailRow(idx, 'don_gia_nhap', e.target.value)}
                          className="w-full border border-[#DCEAF4] rounded-lg px-2.5 py-1.5 text-xs text-right outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 text-[#172033] transition-all"
                        />
                      </div>

                      <div className="col-span-3">
                        <select
                          value={item.ma_vi_tri_kho}
                          onChange={(e) => updateDetailRow(idx, 'ma_vi_tri_kho', e.target.value)}
                          className="w-full border border-[#DCEAF4] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#0F5FAF] focus:ring-1 focus:ring-[#0F5FAF]/15 bg-white text-[#172033] transition-all"
                        >
                          <option value="">-- Vị trí cất --</option>
                          {viTriList
                            .filter((vt) => !formData.ma_kho_nhap || vt.ma_kho === parseInt(formData.ma_kho_nhap, 10))
                            .map((vt) => (
                              <option key={vt.id} value={vt.id}>
                                {vt.ma_vi_tri}
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
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5F6F82] mb-1">Ghi chú</label>
                <textarea
                  rows="2"
                  placeholder="Ghi chú thêm về lô hàng hoặc biên bản bàn giao..."
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
                  Xác Nhận Nhập Kho Thực Tế
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
