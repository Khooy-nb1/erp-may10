import React from 'react';
import { Building2, Phone, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#DCEAF4] mt-auto text-[#5F6F82] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#0F5FAF] text-white rounded flex items-center justify-center font-bold text-[10px]">
            M10
          </div>
          <span className="font-semibold text-[#172033]">
            TỔNG CÔNG TY MAY 10 - CTCP
          </span>
          <span className="hidden md:inline text-gray-400">•</span>
          <span className="hidden md:inline text-gray-500">
            765 Nguyễn Văn Linh, Sài Đồng, Long Biên, Hà Nội
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3 text-gray-400" />
            (024) 3827 6923
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-gray-400" />
            cntt@may10.com.vn
          </span>
          <span>© {currentYear} ERP May 10</span>
        </div>
      </div>
    </footer>
  );
}
