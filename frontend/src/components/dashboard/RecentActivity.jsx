import React, { useState, useEffect } from 'react';
import { Clock, RefreshCcw } from 'lucide-react';
import portalService from '../../services/portalService';

export default function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await portalService.getRecentActivity(10);
      setActivities(data);
    } catch (err) {
      console.warn('Lỗi lấy dữ liệu hoạt động gần đây:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getTypeName = (type) => {
    switch (type) {
      case 'nhap_kho':
        return 'Nhập kho';
      case 'xuat_kho':
        return 'Xuất kho';
      case 'chuyen_kho':
        return 'Điều chuyển';
      case 'kiem_ke':
        return 'Kiểm kê';
      default:
        return type;
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'nhap_kho':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'xuat_kho':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'chuyen_kho':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'kiem_ke':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filtered = activities.filter((act) => {
    if (filterType === 'all') return true;
    return act.loai_hoat_dong === filterType;
  });

  return (
    <div className="bg-white rounded-xl border border-[#DCEAF4] p-5 sm:p-6 shadow-2xs mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCEAF4] mb-3.5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172033] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0F5FAF]" />
            <span>HOẠT ĐỘNG GẦN ĐÂY</span>
            <span className="text-[10px] font-normal text-[#6B7785] lowercase">(audit log)</span>
          </h2>
          <p className="text-xs text-[#6B7785] mt-0.5">
            Nhật ký phát sinh chứng từ kho thực tế đã ghi nhận trong hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F4FAFE] border border-[#DCEAF4] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-[#0F5FAF] shadow-2xs font-bold border border-[#DCEAF4]'
                  : 'text-[#6B7785] hover:text-[#172033]'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('nhap_kho')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'nhap_kho'
                  ? 'bg-white text-[#16A878] shadow-2xs font-bold border border-emerald-200/60'
                  : 'text-[#6B7785] hover:text-[#172033]'
              }`}
            >
              Nhập kho
            </button>
            <button
              onClick={() => setFilterType('xuat_kho')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'xuat_kho'
                  ? 'bg-white text-[#0F5FAF] shadow-2xs font-bold border border-[#96C8EB]'
                  : 'text-[#6B7785] hover:text-[#172033]'
              }`}
            >
              Xuất kho
            </button>
            <button
              onClick={() => setFilterType('kiem_ke')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === 'kiem_ke'
                  ? 'bg-white text-[#D98B00] shadow-2xs font-bold border border-amber-200'
                  : 'text-[#6B7785] hover:text-[#172033]'
              }`}
            >
              Kiểm kê
            </button>
          </div>

          <button
            onClick={fetchActivities}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[#DCEAF4] text-[#6B7785] hover:text-[#0F5FAF] hover:bg-[#F4FAFE] transition-colors"
            title="Làm mới"
            aria-label="Làm mới hoạt động"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#6B7785]">
          <thead className="bg-[#F7FAFC] text-[#5F6F82] font-semibold text-xs border-y border-[#DCEAF4]">
            <tr>
              <th className="py-2.5 px-3">Thời gian</th>
              <th className="py-2.5 px-3">Nghiệp vụ</th>
              <th className="py-2.5 px-3">Mã chứng từ</th>
              <th className="py-2.5 px-3">Nội dung chi tiết</th>
              <th className="py-2.5 px-3">Người thực hiện</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCEAF4]/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#6B7785]">
                  Đang tải nhật ký chứng từ...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#6B7785]">
                  Chưa có hoạt động gần đây
                </td>
              </tr>
            ) : (
              filtered.map((act) => (
                <tr key={act.id + act.ma_chung_tu} className="hover:bg-[#F4FAFE]/60 transition-colors">
                  <td className="py-2 px-3 text-[#6B7785] font-mono text-[11px] whitespace-nowrap">
                    {new Date(act.thoi_gian).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    <span className="text-[#6B7785]/70 text-[10px]">
                      ({new Date(act.thoi_gian).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                        act.loai_hoat_dong
                      )}`}
                    >
                      {getTypeName(act.loai_hoat_dong)}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-[#172033] whitespace-nowrap">
                    {act.ma_chung_tu}
                  </td>
                  <td className="py-2 px-3 text-[#172033] max-w-sm truncate">
                    {act.noi_dung}
                  </td>
                  <td className="py-2 px-3 text-[#6B7785] whitespace-nowrap">
                    {act.nguoi_thuc_hien}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
