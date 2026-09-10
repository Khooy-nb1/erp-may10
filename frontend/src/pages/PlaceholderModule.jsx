import ModuleHeader from '../components/layout/ModuleHeader';
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Warehouse,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { ERP_MODULES } from '../config/modules';

export default function PlaceholderModule() {
  const location = useLocation();
  const currentPath = location.pathname;

  const currentMod = ERP_MODULES.find((m) => m.route === currentPath) || ERP_MODULES[0];

  return (
    <div className="space-y-4">
      <ModuleHeader
        code={currentMod.id}
        title={currentMod.name}
        description={currentMod.description}
        badgeText="Đang triển khai"
        badgeType="info"
        imageKey={
          currentMod.route.includes('sales')
            ? 'sales'
            : currentMod.route.includes('production')
            ? 'production'
            : currentMod.route.includes('purchasing')
            ? 'purchasing'
            : 'accounting'
        }
      >
        <Link
          to="/warehouse"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F5FAF] text-white text-xs font-semibold hover:bg-[#0F4C81] transition-colors shadow-xs self-start md:self-auto flex-shrink-0"
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>Vào phân hệ Kho & Vật tư</span>
        </Link>
      </ModuleHeader>

      {/* Capabilities & Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#DCEAF4] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#172033] mb-3">
            <Layers className="w-4 h-4 text-[#0F5FAF]" />
            <span>Phạm vi nghiệp vụ phân hệ</span>
          </div>
          <ul className="space-y-2 text-xs text-[#5F6F82]">
            {currentMod.features.map((feat, fIdx) => (
              <li key={fIdx} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A878] mt-0.5 flex-shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#DCEAF4] shadow-xs flex flex-col justify-center text-center">
          <div className="w-10 h-10 bg-[#F4FAFE] rounded-full flex items-center justify-center mx-auto mb-2 text-[#5F6F82]">
            <Clock className="w-5 h-5 text-[#0F5FAF]" />
          </div>
          <div className="text-xs font-bold text-[#172033]">
            Phân hệ đang trong tiến trình kết nối nghiệp vụ
          </div>
          <p className="text-xs text-[#6B7785] mt-1 max-w-sm mx-auto">
            Hệ thống dữ liệu đã được cấu trúc và sẵn sàng kết nối API điều hành khi hoàn tất kiểm thử chuyên sâu.
          </p>
        </div>
      </div>
    </div>
  );
}
