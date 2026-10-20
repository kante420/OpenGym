import { Search } from 'lucide-react';
import { requirePage } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { BillingStatus, MemberBilling, Profile } from '@/lib/types';
import { Avatar, BillingChip, Card, Chip, EmptyState, PageHeader } from '@/components/ui/primitives';
import { MemberActions, MemberCreate } from './member-forms';

export const metadata = { title: 'Socios' };
const ROLE = { CLIENTE: 'Socio', ENTRENADOR: 'Entrenador', ADMINISTRADOR: 'Admin' } as const;

export default async function MembersPage({ params, searchParams }: {
  params: Promise<{ subdomain: string }>; searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const { subdomain } = await params;
  const { q = '', role = '', status = '' } = await searchParams;
  const { supabase, gym, profile } = await requirePage(subdomain, ['ADMINISTRADOR']);

  const [pRes, bRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('gym_id', gym.id).order('full_name'),
    supabase.from('member_billing').select('user_id, billing_status').eq('gym_id', gym.id),
  ]);
  const billing = new Map(((bRes.data ?? []) as Pick<MemberBilling, 'user_id' | 'billing_status'>[]).map((b) => [b.user_id, b.billing_status]));
  const needle = q.trim().toLowerCase();
  const rows = ((pRes.data ?? []) as Profile[]).filter((m) =>
    (!needle || [m.full_name, m.username, m.dni, m.email].some((v) => v?.toLowerCase().includes(needle))) &&
    (!role || m.role === role) &&
    (!status || (status === 'INACTIVO' ? !m.active : billing.get(m.id) === status)));

  return (
    <>
      <PageHeader title="Socios" subtitle="Altas, datos de contacto y acceso de socios y entrenadores." actions={<MemberCreate gymName={gym.name} />} />

      <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input name="q" defaultValue={q} className="input pl-9" placeholder="Buscar por nombre, usuario, DNI o email" aria-label="Buscar" />
        </div>
        <select name="role" defaultValue={role} className="select sm:w-40" aria-label="Rol"><option value="">Todos los roles</option><option value="CLIENTE">Socios</option><option value="ENTRENADOR">Entrenadores</option></select>
        <select name="status" defaultValue={status} className="select sm:w-44" aria-label="Estado de cuota">
          <option value="">Cualquier estado</option><option value="AL_DIA">Al día</option><option value="PENDIENTE">Pendiente</option><option value="VENCIDO">Vencido</option><option value="SIN_ACTIVIDAD">Sin actividad</option><option value="INACTIVO">Desactivados</option>
        </select>
        <button className="btn btn-ghost">Filtrar</button>
      </form>

      <Card pad={false}>
        {rows.length === 0 ? <EmptyState title="Sin resultados">{needle || role || status ? 'Prueba con otros filtros.' : 'Da de alta a tu primer socio con el botón «Nuevo socio».'}</EmptyState> : (
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Socio</th><th>Rol</th><th>Contacto</th><th>Alta</th><th>Cuota</th><th className="text-right">Acciones</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className={m.active ? '' : 'opacity-60'}>
                    <td><div className="flex items-center gap-3"><Avatar name={m.full_name} /><div><p className="font-semibold">{m.full_name}</p><p className="text-xs text-faint">@{m.username}</p></div></div></td>
                    <td><Chip tone={m.role === 'ENTRENADOR' ? 'info' : 'muted'}>{ROLE[m.role]}</Chip></td>
                    <td className="text-sm"><p>{m.email ?? <span className="text-faint">Sin email</span>}</p><p className="text-xs text-faint">{m.phone ?? ''}</p></td>
                    <td className="whitespace-nowrap text-sm text-muted">{formatDate(m.created_at)}</td>
                    <td>{!m.active ? <Chip>Desactivado</Chip> : m.role === 'CLIENTE' ? <BillingChip status={(billing.get(m.id) ?? 'SIN_ACTIVIDAD') as BillingStatus} /> : <span className="text-faint">—</span>}</td>
                    <td><MemberActions member={m} isSelf={m.id === profile.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-faint">{rows.length} resultado{rows.length === 1 ? '' : 's'}</p>
    </>
  );
}
