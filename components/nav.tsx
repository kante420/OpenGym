'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CalendarRange, ClipboardList, Dumbbell, LayoutDashboard, LineChart, Settings, User, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/types';

interface Item { href: string; label: string; icon: LucideIcon; exact?: boolean }
const NAV: Record<Role, Item[]> = {
  ADMINISTRADOR: [
    { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
    { href: '/admin/members', label: 'Socios', icon: Users },
    { href: '/admin/classes', label: 'Actividades', icon: CalendarDays },
    { href: '/admin/schedule', label: 'Horario', icon: CalendarRange },
    { href: '/admin/payments', label: 'Cobros', icon: Wallet },
    { href: '/admin/settings', label: 'Ajustes', icon: Settings },
  ],
  ENTRENADOR: [
    { href: '/coach', label: 'Hoy', icon: Dumbbell, exact: true },
    { href: '/coach/schedule', label: 'Horario', icon: CalendarRange },
    { href: '/coach/routines', label: 'Rutinas', icon: ClipboardList },
    { href: '/coach/progress', label: 'Seguimiento', icon: LineChart },
    { href: '/coach/profile', label: 'Perfil', icon: User },
  ],
  CLIENTE: [
    { href: '/me', label: 'Mi semana', icon: CalendarDays, exact: true },
    { href: '/me/schedule', label: 'Horario', icon: CalendarRange },
    { href: '/me/progress', label: 'Progreso', icon: LineChart },
    { href: '/me/profile', label: 'Perfil', icon: User },
  ],
};

export function Nav({ role, base, variant }: { role: Role; base: string; variant: 'side' | 'bottom' }) {
  const path = usePathname();
  const items = NAV[role];
  const active = (i: Item) => (i.exact ? path === base + i.href : path.startsWith(base + i.href));

  if (variant === 'bottom') {
    return (
      <nav aria-label="Principal" className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.map((i) => (
          <Link key={i.href} href={base + i.href} aria-current={active(i) ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${active(i) ? 'text-gold-hi' : 'text-muted'}`}>
            <i.icon className="size-5" aria-hidden />{i.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {items.map((i) => (
        <Link key={i.href} href={base + i.href} aria-current={active(i) ? 'page' : undefined}
          className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${active(i) ? 'bg-panel2 text-gold-hi' : 'text-muted hover:bg-panel2 hover:text-fg'}`}>
          {active(i) && <span aria-hidden className="absolute -left-4 top-1.5 h-[calc(100%-12px)] w-1.5 -skew-x-[18deg] bg-gold" />}
          <i.icon className="size-[18px]" aria-hidden />{i.label}
        </Link>
      ))}
    </nav>
  );
}
