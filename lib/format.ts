export const TZ = 'Europe/Madrid';

/** Instante actual en ms (utilidad aparte para no llamar a Date.now() dentro de componentes). */
export const nowMs = () => Date.now();

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const formatEUR = (n: number | null | undefined) => eur.format(Number(n ?? 0));

/** Fecha local de Madrid como YYYY-MM-DD (evita el desfase de toISOString() en UTC). */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekISO(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = d.getUTCDay();
  return addDaysISO(iso, dow === 0 ? -6 : 1 - dow);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(`${toISO}T12:00:00Z`) - Date.parse(`${fromISO}T12:00:00Z`)) / 86_400_000);
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ, ...opts }).format(d);
}

export function formatMonthLabel(yyyyMm: string): string {
  const d = new Date(`${yyyyMm}-01T12:00:00Z`);
  const s = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

/** Nombre del día de la semana (en el vocabulario de `classes.days_of_week`) de una fecha ISO. */
export function weekdayName(iso: string): (typeof WEEKDAYS)[number] {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return WEEKDAYS[dow === 0 ? 6 : dow - 1];
}

export const parseDays = (s: string | null | undefined): string[] =>
  (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

/** 1RM estimado (Epley). Con 1 repetición devuelve el propio peso. */
export const estimate1RM = (kg: number, reps: number | null) =>
  !reps || reps <= 1 ? kg : Math.round(kg * (1 + reps / 30) * 10) / 10;

export const normalizeUsername = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');

/** Email interno de acceso. Debe coincidir con scripts/migrate-legacy-users.mjs */
export const loginEmail = (username: string, subdomain: string) => `${normalizeUsername(username)}@${subdomain}.gym.local`;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
