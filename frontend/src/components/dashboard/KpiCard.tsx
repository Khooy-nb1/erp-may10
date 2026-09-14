import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { Card } from '../ui/Card.js';
import { Text } from '../ui/Typography.js';
import { Badge } from '../ui/Badge.js';
import { Skeleton } from '../ui/Skeleton.js';

export type KpiTone = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral';

/**
 * Tone palette. Values are complete literal class strings: Tailwind reads
 * source text, so an interpolated `bg-${tone}-soft` would never be generated.
 * `accent` stays empty for calm tones — only alerting metrics earn the rule.
 */
const KPI_TONES: Record<KpiTone, { tile: string; icon: string; accent: string }> = {
  primary: { tile: 'bg-primary-soft', icon: 'text-primary', accent: '' },
  info: { tile: 'bg-info-soft', icon: 'text-info-strong', accent: '' },
  success: { tile: 'bg-success-soft', icon: 'text-success-strong', accent: 'bg-success' },
  warning: { tile: 'bg-warning-soft', icon: 'text-warning-strong', accent: 'bg-warning' },
  danger: { tile: 'bg-danger-soft', icon: 'text-danger-strong', accent: 'bg-danger' },
  violet: { tile: 'bg-violet-soft', icon: 'text-violet-strong', accent: '' },
  neutral: { tile: 'bg-surface-muted', icon: 'text-muted-foreground', accent: '' },
};

export interface KpiCardProps {
  label: string;
  /** Already-formatted value, e.g. "697.800.000 ₫" or "2". */
  value: string;
  icon: LucideIcon;
  tone?: KpiTone;
  /** Secondary context line, e.g. the exact figure behind a rounded headline. */
  hint?: string;
  /** Optional short tag at the end of the header row, e.g. "5 hóa đơn". */
  badge?: string;
  className?: string;
}

/** Headline metric tile: named icon, one big number, optional context and tag. */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  hint,
  badge,
  className,
}) => {
  const toneStyles = KPI_TONES[tone];
  return (
    <Card className={cn('flex min-w-0 flex-col gap-3', className)}>
      {/* Alerting tiles carry a coloured rule; calm tiles keep a clean top edge. */}
      {toneStyles.accent ? (
        <span aria-hidden className={cn('h-[3px] w-full rounded-full', toneStyles.accent)} />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-control',
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
};

/** Loading twin of `KpiCard`: same box, so the KPI grid never shifts on load. */
export const KpiCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn('flex min-w-0 flex-col gap-3', className)}>
    <div className="flex min-w-0 items-center gap-2.5">
      <Skeleton className="h-10 w-10 shrink-0" />
      <Skeleton className="h-5 w-3/5" />
    </div>
    <Skeleton className="h-8 w-3/4" />
  </Card>
);
