import { useEffect, useState } from 'react';
import Toast from '../../../components/Toast.jsx';

/**
 * Module toast bridge.
 *
 * PH1 used \`sonner\`; Core ships a presentational \`Toast\` component and no toast
 * context. This module keeps the imperative surface PH1 called
 * (\`toast.success(msg)\`, \`toast.error(err)\`) on top of a tiny subscriber list and
 * renders Core's component, so no new dependency is introduced (PLAN Step 6H).
 */
let listeners = new Set();

function emit(next) {
  listeners.forEach((listener) => listener(next));
}

function messageOf(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input.message === 'string' && input.message.length > 0) return input.message;
  return 'Đã có lỗi xảy ra.';
}

function codeOf(input) {
  if (!input || typeof input === 'string') return undefined;
  return input.errorCode || input.code;
}

export const toast = {
  success(message) {
    emit({ type: 'success', message: messageOf(message), at: Date.now() });
  },
  error(input) {
    emit({ type: 'error', message: messageOf(input), errorCode: codeOf(input), at: Date.now() });
  },
  conflict(message) {
    emit({ type: 'conflict', message: messageOf(message), at: Date.now() });
  },
};

export function ToastHost({ durationMs = 5000 }) {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const listener = (next) => setCurrent(next);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(() => setCurrent(null), durationMs);
    return () => clearTimeout(timer);
  }, [current, durationMs]);

  return <Toast toast={current} onClose={() => setCurrent(null)} />;
}
