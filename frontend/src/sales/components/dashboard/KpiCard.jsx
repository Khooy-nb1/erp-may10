import React from 'react';
import { cn } from '../../lib/cn.js';
import { Card } from '../ui/Card.jsx';
import { Text } from '../ui/Typography.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

/** @typedef {'primary' | 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral'} KpiTone */

/**
 * Tone palette. Values are complete literal class strings: Tailwind reads
 * source text, so an interpolated `bg-${tone}-soft` would never be generated.
 * `accent` stays empty for calm tones — only alerting metrics earn the rule.
 * PH1's Tailwind v4 tokens are rewritten onto Core's Tailwind 3.4 brand palette
 * (see `docs/ph1-remediation/FRONTEND_TOKEN_MAP.md`).
 */
const KPI_TONES = {
  primary: { tile: 'bg-brand-light', icon: 'text-brand-primary', accent: '' },
  info: { tile: 'bg-sky-50', icon: 'text-sky-700', accent: '' },
  success: { tile: 'bg-emerald-50', icon: 'text-emerald-700', accent: 'bg-emerald-600' },
  warning: { tile: 'bg-amber-50', icon: 'text-amber-700', accent: 'bg-amber-500' },
  danger: { tile: 'bg-rose-50', icon: 'text-rose-700', accent: 'bg-rose-600' },
  violet: { tile: 'bg-violet-50', icon: 'text-violet-700', accent: '' },
  neutral: { tile: 'bg-slate-50', icon: 'text-brand-secondary', accent: '' },
};

/**
 * Headline metric tile: named icon, one big number, optional context and tag.
 * (Ported 1:1 from PH1 `components/dashboard/KpiCard.tsx`.)
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.value Already-formatted value, e.g. "697.800.000 ₫" or "2".
 * @param {React.ComponentType<{ size?: number, className?: string }>} props.icon Lucide icon component.
 * @param {KpiTone} [props.tone]
 * @param {string} [props.hint] Secondary context line, e.g. the exact figure behind a rounded headline.
 * @param {string} [props.badge] Optional short tag at the end of the header row, e.g. "5 hóa đơn".
 * @param {string} [props.className]
 */
export function KpiCard({ label, value, icon: Icon, tone = 'primary', hint, badge, className }) {
  const toneStyles = KPI_TONES[tone];
  return (
    <Card className={cn('flex min-w-0 flex-col gap-3 p-4', className)}>
      {/* Alerting tiles carry a coloured rule; calm tiles keep a clean top edge. */}
      {toneStyles.accent ? (
        <span aria-hidden className={cn('h-[3px] w-full rounded-full', toneStyles.accent)} />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              toneStyles.tile
            )}
          >
            <Icon size={18} aria-hidden className={toneStyles.icon} />
          </span>
          <span className="min-w-0 break-words">
            <Text variant="supporting">{label}</Text>
          </span>
        </div>
        {badge ? (
          <Badge variant="neutral" className="whitespace-nowrap">
            {badge}
          </Badge>
        ) : null}
      </div>
      <Text
        as="p"
        variant="large"
        className="text-2xl font-semibold leading-8 tabular-nums break-words"
      >
        {value}
      </Text>
      {hint ? <Text variant="supporting">{hint}</Text> : null}
    </Card>
  );
}

/** Loading twin of `KpiCard`: same box, so the KPI grid never shifts on load. */
export function KpiCardSkeleton({ className }) {
  return (
    <Card className={cn('flex min-w-0 flex-col gap-3 p-4', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <Skeleton className="h-10 w-10 shrink-0" />
        <Skeleton className="h-5 w-3/5" />
      </div>
      <Skeleton className="h-8 w-3/4" />
    </Card>
  );
}
