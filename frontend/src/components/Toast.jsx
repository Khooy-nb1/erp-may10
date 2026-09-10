import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isConflict = toast.errorCode === 'INSUFFICIENT_STOCK' || toast.type === 'conflict';

  let bgColor = isSuccess
    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
    : isConflict
    ? 'bg-amber-50 border-amber-300 text-amber-900'
    : 'bg-rose-50 border-rose-300 text-rose-900';

  let Icon = isSuccess ? CheckCircle2 : isConflict ? AlertTriangle : XCircle;
  let iconColor = isSuccess ? 'text-emerald-600' : isConflict ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-short shadow-xl rounded-xl border p-4 flex items-start gap-3 bg-white">
      <div className={`p-2 rounded-lg ${isSuccess ? 'bg-emerald-100' : isConflict ? 'bg-amber-100' : 'bg-rose-100'}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      <div className="flex-1">
        <h4 className="text-sm font-bold capitalize">
          {isConflict ? 'Cảnh báo xung đột kho (409 Conflict)' : isSuccess ? 'Thành công' : 'Đã có lỗi xảy ra'}
        </h4>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{toast.message}</p>
      </div>

      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
