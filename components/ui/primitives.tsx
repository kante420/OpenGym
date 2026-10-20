import type { ReactNode } from 'react';
import type { BillingStatus } from '@/lib/types';
import { initials } from '@/lib/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-prose text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function Card({ title, action, children, className = '', pad = true }: {
  title?: string; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="display text-xl">{title}</h2>
          {action}
        </div>
      )}
      <div className={pad ? 'card-pad' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'gold' | 'bad' | 'ok' }) {
  const color = { default: 'text-fg', gold: 'text-gold-hi', bad: 'text-bad', ok: 'text-ok' }[tone];
  return (
    <div className="card card-pad">
      <p className="text-sm text-muted">{label}</p>
      <p className={`display num mt-1 text-5xl ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-faint">{sub}</p>}
    </div>
  );
}

export function Chip({ tone = 'muted', children }: { tone?: 'muted' | 'ok' | 'bad' | 'gold' | 'info'; children: ReactNode }) {
  return <span className={`chip ${tone === 'muted' ? '' : `chip-${tone}`}`}>{children}</span>;
}

const BILLING: Record<BillingStatus, { label: string; tone: 'ok' | 'bad' | 'gold' | 'muted' }> = {
  AL_DIA: { label: 'Al día', tone: 'ok' },
  PENDIENTE: { label: 'Pendiente', tone: 'gold' },
  VENCIDO: { label: 'Vencido', tone: 'bad' },
  SIN_ACTIVIDAD: { label: 'Sin actividad', tone: 'muted' },
};
export const BillingChip = ({ status }: { status: BillingStatus }) => <Chip tone={BILLING[status].tone}>{BILLING[status].label}</Chip>;

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="display text-2xl text-muted">{title}</p>
      {children && <p className="max-w-sm text-sm text-faint">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-md bg-panel2 font-semibold text-gold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  );
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="bar">
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-12 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-72" />
    </div>
  );
}
