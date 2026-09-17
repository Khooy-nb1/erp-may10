import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { IconButton } from './IconButton.jsx';

/**
 * Module toast bridge.
 *
 * PH1 used `sonner`; Core ships a presentational `Toast` component and no toast
 * context. This module keeps the imperative surface PH1 called
 * (`toast.success(msg)`, `toast.error(err)`) on top of a tiny subscriber list
 * (PLAN Step 6H) and renders its own viewport: form failures must appear in the
 * top-right corner, fade/slide out on their own after a few seconds and stay
 * dismissible by hand. Core's `Toast` is shared with the frozen PH4/PH5 screens
 * (Warehouse) and pins itself bottom-right, so it is left untouched.
 *
 * One slot: a new toast replaces the one on screen and restarts the timer, which
 * is what the module's screens need (a retry must not stack duplicates).
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

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    title: 'Thành công',
    frame: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    iconFrame: 'bg-emerald-100 text-emerald-600',
  },
  conflict: {
    Icon: AlertTriangle,
    title: 'Xung đột dữ liệu',
    frame: 'border-amber-300 bg-amber-50 text-amber-900',
    iconFrame: 'bg-amber-100 text-amber-600',
  },
  error: {
    Icon: XCircle,
    title: 'Đã có lỗi xảy ra',
    frame: 'border-rose-300 bg-rose-50 text-rose-900',
    iconFrame: 'bg-rose-100 text-rose-600',
  },
};

/** Enter/leave transition length, kept in sync with the `duration-200` classes. */
const TRANSITION_MS = 200;

/**
 * Top-right toast viewport. `durationMs` is the visible time before the toast
 * starts fading out on its own (the dismiss button skips the wait).
 */
export function ToastHost({ durationMs = 4500 }) {
  const [current, setCurrent] = useState(null);
  // 'enter' -> 'shown' -> 'leave' -> idle; 'enter'/'leave' are the off-screen
  // frames the transition animates between.
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const listener = (next) => {
      setPhase('enter');
      setCurrent(next);
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(() => setPhase('shown'), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    if (!current || phase !== 'shown') return undefined;
    const timer = setTimeout(() => setPhase('leave'), durationMs);
    return () => clearTimeout(timer);
  }, [current, phase, durationMs]);

  useEffect(() => {
    if (phase !== 'leave') return undefined;
    const timer = setTimeout(() => {
      setCurrent(null);
      setPhase('enter');
    }, TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (!current) return null;

  const variant = VARIANTS[current.type] ?? VARIANTS.error;
  const { Icon } = variant;
  const offScreen = phase !== 'shown';

  return createPortal(
    <div
      role={current.type === 'error' ? 'alert' : 'status'}
      aria-live={current.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sales-overlay-root pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] justify-end"
    >
      <div
        data-phase={phase}
        style={{
          opacity: offScreen ? 0 : 1,
          transform: offScreen ? 'translate3d(1rem, 0, 0)' : 'translate3d(0, 0, 0)',
        }}
        className={cn(
          'pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-xl transition-all duration-200 ease-out motion-reduce:transition-none',
          variant.frame
        )}
      >
        <span className={cn('rounded-lg p-2', variant.iconFrame)}>
          <Icon size={18} aria-hidden />
        </span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{variant.title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{current.message}</p>
        </div>
        <IconButton
          label="Đóng thông báo"
          icon={<X size={16} aria-hidden />}
          variant="ghost"
          size="sm"
          onClick={() => setPhase('leave')}
          className="-mr-1 -mt-1 rounded-full text-slate-400 hover:text-brand-text"
        />
      </div>
    </div>,
    document.body
  );
}
