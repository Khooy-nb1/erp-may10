import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Clock,
  Building2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  getPurchaseRequisitions,
  getRequisitionDetail,
  createPurchaseRequisition,
  approveRequisition,
  rejectRequisition,
  convertPrToPo,
  getSuppliers,
} from '../../services/purchasingService';

export default function PurchaseRequisitionsPage() {
  const [prList, setPrList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConvertToPoModal, setShowConvertToPoModal] = useState(false);

  const [selectedPr, setSelectedPr] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  // Form State for creating PR
  const [newPrForm, setNewPrForm] = useState({
    nguon_yeu_cau: 'san_xuat',
    ghi_chu: '',
    chiTiet: [
      {
        ma_vat_tu: 1,
        so_luong_yeu_cau: '',
        don_gia_du_kien: '',
        ngay_can_giao: '',
        ma_kho_nhap: 1,
        ghi_chu: '',
      },
    ],
  });

  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchPrList = async () => {
    try {
      setLoading(true);
      const res = await getPurchaseRequisitions({
        page: pagination.page,
        limit: pagination.limit,
        search,
        trang_thai: statusFilter,
      });
      setPrList(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi nạp danh sách PR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrList();
  }, [pagination.page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPrList();
  };

  const handleViewDetail = async (id) => {
    try {
      const detail = await getRequisitionDetail(id);
      setSelectedPr(detail);
      setShowDetailModal(true);
    } catch (err) {
      showNotification('error', 'Không thể tải chi tiết yêu cầu mua hàng.');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveRequisition(id);
      showNotification('success', 'Phê duyệt yêu cầu mua sắm thành công.');
      setShowDetailModal(false);
      fetchPrList();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi phê duyệt yêu cầu.');
    }
  };

  const handleReject = async () => {
    if (!selectedPr) return;
    try {
      await rejectRequisition(selectedPr.id, rejectReason);
      showNotification('success', 'Đã từ chối yêu cầu mua sắm.');
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
      fetchPrList();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi từ chối yêu cầu.');
    }
  };

  const openConvertToPo = async (pr) => {
    setSelectedPr(pr);
    try {
      const suppRes = await getSuppliers({ limit: 100 });
      setSuppliers(suppRes.data || []);
      if (suppRes.data?.length > 0) {
        setSelectedSupplierId(suppRes.data[0].id);
      }
      setExpectedDeliveryDate(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
      setShowConvertToPoModal(true);
    } catch (err) {
      showNotification('error', 'Không thể nạp danh sách nhà cung cấp.');
    }
  };

  const handleConvertToPoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPr || !selectedSupplierId) return;
    try {
      await convertPrToPo(selectedPr.id, {
        ma_nha_cung_cap: selectedSupplierId,
        ngay_giao_hang_yc: expectedDeliveryDate,
      });
      showNotification('success', 'Đã chuyển yêu cầu mua thành Đơn mua hàng (PO) thành công!');
      setShowConvertToPoModal(false);
      setShowDetailModal(false);
      fetchPrList();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi tạo đơn mua hàng.');
    }
  };

  // Dynamic rows in Create PR
  const handleAddRow = () => {
    setNewPrForm({
      ...newPrForm,
      chiTiet: [
        ...newPrForm.chiTiet,
        {
          ma_vat_tu: 1,
          so_luong_yeu_cau: '',
          don_gia_du_kien: '',
          ngay_can_giao: '',
          ma_kho_nhap: 1,
          ghi_chu: '',
        },
      ],
    });
  };

  const handleRemoveRow = (index) => {
    if (newPrForm.chiTiet.length <= 1) return;
    const next = [...newPrForm.chiTiet];
    next.splice(index, 1);
    setNewPrForm({ ...newPrForm, chiTiet: next });
  };

  const handleItemChange = (index, field, val) => {
    const next = [...newPrForm.chiTiet];
    next[index][field] = val;
    setNewPrForm({ ...newPrForm, chiTiet: next });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPurchaseRequisition(newPrForm);
      showNotification('success', 'Tạo mới yêu cầu mua sắm (PR) thành công!');
      setShowCreateModal(false);
      setNewPrForm({
        nguon_yeu_cau: 'san_xuat',
        ghi_chu: '',
        chiTiet: [
          {
            ma_vat_tu: 1,
            so_luong_yeu_cau: '',
            don_gia_du_kien: '',
            ngay_can_giao: '',
            ma_kho_nhap: 1,
            ghi_chu: '',
          },
        ],
      });
      fetchPrList();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Lỗi tạo yêu cầu mua sắm.');
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'cho_duyet':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Chờ duyệt</span>;
      case 'da_duyet':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Đã duyệt</span>;
      case 'da_tao_don':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Đã tạo PO</span>;
      case 'tu_choi':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Từ chối</span>;
      case 'huy':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Đã hủy</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{st}</span>;
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

      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Yêu cầu Mua sắm (PR — Purchase Requisitions)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tiếp nhận nhu cầu vật tư từ xưởng sản xuất, phê duyệt và lập đơn mua hàng tự động
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Lập Yêu Cầu Mua Sắm (PR)
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã yêu cầu (PR), ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="cho_duyet">Chờ duyệt</option>
            <option value="da_duyet">Đã duyệt</option>
            <option value="da_tao_don">Đã tạo PO</option>
            <option value="tu_choi">Từ chối</option>
            <option value="huy">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* PR Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã Yêu Cầu</th>
                <th className="py-3.5 px-4">Nguồn Yêu Cầu</th>
                <th className="py-3.5 px-4">Người Lập</th>
                <th className="py-3.5 px-4">Ngày Yêu Cầu</th>
                <th className="py-3.5 px-4 text-center">Số Mặt Hàng</th>
                <th className="py-3.5 px-4 text-right">Tổng Số Lượng</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Đang nạp dữ liệu yêu cầu mua sắm...
                  </td>
                </tr>
              ) : prList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Chưa có dữ liệu yêu cầu mua hàng.
                  </td>
                </tr>
              ) : (
                prList.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-indigo-600">
                      {pr.ma_yeu_cau_mua}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                        {pr.nguon_yeu_cau === 'san_xuat' ? 'Xưởng May' : pr.nguon_yeu_cau === 'kho' ? 'Kho Vật Tư' : pr.nguon_yeu_cau}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {pr.ten_nguoi_yeu_cau || 'Cán bộ cung ứng'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {new Date(pr.ngay_yeu_cau).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                      {pr.so_mat_hang || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {parseFloat(pr.tong_so_luong || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(pr.trang_thai)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewDetail(pr.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {pr.trang_thai === 'da_duyet' && (
                          <button
                            onClick={() => openConvertToPo(pr)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-medium text-xs flex items-center gap-1"
                            title="Tạo đơn mua hàng (PO)"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Lập PR Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-150 my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Lập Yêu Cầu Mua Sắm Mới (Purchase Requisition)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nguồn Yêu Cầu</label>
                  <select
                    value={newPrForm.nguon_yeu_cau}
                    onChange={(e) => setNewPrForm({ ...newPrForm, nguon_yeu_cau: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="san_xuat">Kế hoạch Sản xuất (Xưởng May)</option>
                    <option value="kho">Kho Quản lý Vật tư</option>
                    <option value="noi_bo">Nhu cầu Nội bộ Tổng công ty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ghi Chú Yêu Cầu</label>
                  <input
                    type="text"
                    placeholder="VD: Cần bổ sung vải cho chuyền may sơ mi xuất khẩu..."
                    value={newPrForm.ghi_chu}
                    onChange={(e) => setNewPrForm({ ...newPrForm, ghi_chu: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Line items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Danh Sách Vật Tư Cần Mua</label>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-left">Mã/ID Vật Tư</th>
                        <th className="p-2.5 text-right w-28">Số Lượng</th>
                        <th className="p-2.5 text-right w-36">Đơn Giá Dự Kiến</th>
                        <th className="p-2.5 text-left w-36">Ngày Cần Giao</th>
                        <th className="p-2.5 text-left">Ghi Chú</th>
                        <th className="p-2.5 text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newPrForm.chiTiet.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              placeholder="ID vật tư (vd: 1)"
                              value={row.ma_vat_tu}
                              onChange={(e) => handleItemChange(idx, 'ma_vat_tu', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              placeholder="Số lượng"
                              value={row.so_luong_yeu_cau}
                              onChange={(e) => handleItemChange(idx, 'so_luong_yeu_cau', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Đơn giá VNĐ"
                              value={row.don_gia_du_kien}
                              onChange={(e) => handleItemChange(idx, 'don_gia_du_kien', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="date"
                              value={row.ngay_can_giao}
                              onChange={(e) => handleItemChange(idx, 'ngay_can_giao', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              required
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Quy cách / ghi chú"
                              value={row.ghi_chu}
                              onChange={(e) => handleItemChange(idx, 'ghi_chu', e.target.value)}
                              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              disabled={newPrForm.chiTiet.length <= 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"
                >
                  Gửi Phê Duyệt PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chi Tiết PR */}
      {showDetailModal && selectedPr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chi Tiết Yêu Cầu Mua Sắm: {selectedPr.ma_yeu_cau_mua}</h3>
                <span className="text-xs text-slate-500">Lập ngày: {new Date(selectedPr.ngay_yeu_cau).toLocaleString('vi-VN')}</span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block">Nguồn:</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedPr.nguon_yeu_cau}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Người yêu cầu:</span>
                  <span className="font-semibold text-slate-800">{selectedPr.ten_nguoi_yeu_cau || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Trạng thái:</span>
                  {getStatusBadge(selectedPr.trang_thai)}
                </div>
                <div>
                  <span className="text-slate-500 block">Người duyệt:</span>
                  <span className="font-semibold text-slate-800">{selectedPr.ten_nguoi_phe_duyet || 'Chưa duyệt'}</span>
                </div>
              </div>

              {selectedPr.ghi_chu && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="font-bold">Ghi chú:</span> {selectedPr.ghi_chu}
                </div>
              )}

              {/* Items */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Chi tiết mặt hàng</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-left">Vật tư</th>
                        <th className="p-2.5 text-left">Loại</th>
                        <th className="p-2.5 text-right">Số Lượng YC</th>
                        <th className="p-2.5 text-right">Đơn Giá Dự Kiến</th>
                        <th className="p-2.5 text-left">Ngày Cần Giao</th>
                        <th className="p-2.5 text-left">Kho Nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPr.chiTiet?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium text-slate-900">{item.ten_vat_tu || `Vật tư ID ${item.ma_vat_tu}`}</td>
                          <td className="p-2.5 text-slate-500">{item.loai_vat_tu || 'N/A'}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">{parseFloat(item.so_luong_yeu_cau).toLocaleString('vi-VN')} {item.ten_don_vi}</td>
                          <td className="p-2.5 text-right text-slate-700">{item.don_gia_du_kien ? parseFloat(item.don_gia_du_kien).toLocaleString('vi-VN') + ' đ' : '-'}</td>
                          <td className="p-2.5 text-slate-600">{new Date(item.ngay_can_giao).toLocaleDateString('vi-VN')}</td>
                          <td className="p-2.5 text-slate-600">{item.ten_kho_nhap || 'Kho Chính'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200"
                >
                  Đóng
                </button>
                <div className="flex items-center gap-2">
                  {selectedPr.trang_thai === 'cho_duyet' && (
                    <>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold rounded-xl"
                      >
                        Từ Chối
                      </button>
                      <button
                        onClick={() => handleApprove(selectedPr.id)}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl"
                      >
                        Phê Duyệt PR
                      </button>
                    </>
                  )}
                  {selectedPr.trang_thai === 'da_duyet' && (
                    <button
                      onClick={() => openConvertToPo(selectedPr)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Chuyển thành Đơn Mua Hàng (PO)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Từ chối PR */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" /> Từ Chối Yêu Cầu Mua Sắm
            </h3>
            <p className="text-xs text-slate-500">
              Vui lòng nhập lý do từ chối yêu cầu mua sắm [{selectedPr?.ma_yeu_cau_mua}]:
            </p>
            <textarea
              rows="3"
              placeholder="VD: Định mức tồn kho còn đủ, chưa cần mua thêm..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chuyển PR thành PO */}
      {showConvertToPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-emerald-600">
              <ShoppingCart className="w-5 h-5" /> Chuyển Yêu Cầu Sang Đơn Mua Hàng (PO)
            </h3>
            <p className="text-xs text-slate-500">
              Tạo Đơn mua hàng (PO) từ yêu cầu [{selectedPr?.ma_yeu_cau_mua}]. Vui lòng chọn nhà cung cấp chỉ định:
            </p>

            <form onSubmit={handleConvertToPoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nhà Cung Cấp</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.ma_nha_cung_cap} — {s.ten_nha_cung_cap}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Hạn Giao Hàng Cam Kết</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConvertToPoModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Tạo Đơn Mua Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
