import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>

        <span className="text-xs font-mono font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full uppercase">
          MÃ LỖI 404 — KHÔNG TÌM THẤY TRANG
        </span>

        <h1 className="text-xl font-black text-gray-900 mt-3">
          Trang Không Tồn Tại
        </h1>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Đường dẫn quý vị đang truy cập không tồn tại hoặc đã được chuyển dời trong quá trình tái cấu trúc phân hệ ERP May 10.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-may10-primary text-white text-xs font-bold hover:bg-may10-600 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Về Trang Chủ Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
