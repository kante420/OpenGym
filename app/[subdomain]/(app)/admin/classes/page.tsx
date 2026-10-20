import { Archive, Clock, MapPin, UserRound } from 'lucide-react';
import { requirePage } from '@/lib/auth';
import { formatEUR } from '@/lib/format';
import type { ClassRow, Profile, Zone } from '@/lib/types';
import { ActionButton } from '@/components/ui/action';
import { Card, Chip, EmptyState, PageHeader, Progress } from '@/components/ui/primitives';
import { deleteClass, setClassActive, unenrollMember } from '@/lib/actions/classes';
import { ClassModal, EnrollCard, ZoneManager } from './class-forms';

export const metadata = { title: 'Actividades' };
type ClassWithBookings = ClassRow & { bookings: { user_id: string; profiles: { full_name: string } | null }[] };

export default async function ClassesPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { supabase, gym } = await requirePage(subdomain, ['ADMINISTRADOR']);

  const [zRes, cRes, pRes] = await Promise.all([
    supabase.from('zones').select('*').eq('gym_id', gym.id).order('name'),
    supabase.from('classes').select('*, zones(name), bookings(user_id, profiles(full_name))').eq('gym_id', gym.id).order('title'),
    supabase.from('profiles').select('id, full_name, role').eq('gym_id', gym.id).eq('active', true).order('full_name'),
  ]);
  const zones = (zRes.data ?? []) as Zone[];
  const classes = (cRes.data ?? []) as ClassWithBookings[];
  const people = (pRes.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'role'>[];
  const trainers = people.filter((p) => p.role === 'ENTRENADOR');
  const members = people.filter((p) => p.role === 'CLIENTE');
  const trainerName = new Map(trainers.map((t) => [t.id, t.full_name]));
  const active = classes.filter((c) => c.active);
  const archived = classes.filter((c) => !c.active);

  const Item = ({ c }: { c: ClassWithBookings }) => {
    const n = c.bookings.length;
    return (
      <article className={`card card-pad ${c.active ? '' : 'opacity-70'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="display text-3xl">{c.title}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{c.days_of_week} · {c.schedule_time}</span>
              {c.zones?.name && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{c.zones.name}</span>}
              <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5" />{c.trainer_id ? trainerName.get(c.trainer_id) ?? 'Entrenador' : 'Sin entrenador'}</span>
            </p>
          </div>
          <div className="text-right"><p className="display num text-3xl text-gold-hi">{formatEUR(c.price)}</p><p className="text-xs text-faint">al mes</p></div>
        </div>

        <div className="mt-4 max-w-sm">
          <div className="mb-1.5 flex justify-between text-xs text-muted"><span>Inscritos</span><span className="num">{n}{c.capacity ? ` / ${c.capacity}` : ''}</span></div>
          {c.capacity ? <Progress value={(n / c.capacity) * 100} label="Ocupación" /> : null}
        </div>

        {n > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {c.bookings.map((b) => (
              <li key={b.user_id} className="flex items-center gap-1 rounded-md bg-panel2 py-1 pl-3 pr-1 text-sm">
                {b.profiles?.full_name ?? 'Socio'}
                <ActionButton size="sm" variant="ghost" className="!h-6 !border-0 !px-1.5 text-faint hover:text-bad" title={`Dar de baja a ${b.profiles?.full_name}`}
                  action={unenrollMember.bind(null, c.id, b.user_id)} confirm={{ title: 'Dar de baja', message: `¿Quitar a ${b.profiles?.full_name} de ${c.title}? Su cuota se recalculará.`, confirmLabel: 'Dar de baja' }}>×</ActionButton>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <ClassModal zones={zones} trainers={trainers} cls={c} />
          <ActionButton action={setClassActive.bind(null, c.id, !c.active)}><Archive className="size-3.5" />{c.active ? 'Archivar' : 'Reactivar'}</ActionButton>
          <ActionButton variant="danger" action={deleteClass.bind(null, c.id)} confirm={{ title: `¿Eliminar «${c.title}»?`, message: 'Se elimina la actividad y sus inscripciones. Si tiene sesiones registradas, archívala en su lugar.', confirmLabel: 'Eliminar' }}>Eliminar</ActionButton>
        </div>
      </article>
    );
  };

  return (
    <>
      <PageHeader title="Actividades" subtitle="Horarios, precios, aforo y entrenador de cada clase. Las cuotas se calculan solas a partir de las inscripciones."
        actions={<ClassModal zones={zones} trainers={trainers} />} />
      <div className="space-y-6">
        {active.length === 0 ? <Card><EmptyState title="Sin actividades">Crea la primera con «Nueva actividad».</EmptyState></Card> : <div className="grid gap-4">{active.map((c) => <Item key={c.id} c={c} />)}</div>}
        <div className="grid gap-6 lg:grid-cols-2">
          {active.length > 0 && <EnrollCard classes={active} members={members} />}
          <ZoneManager zones={zones} />
        </div>
        {archived.length > 0 && <details className="group"><summary className="mb-3 cursor-pointer text-sm text-muted hover:text-fg">Archivadas <Chip>{archived.length}</Chip></summary><div className="grid gap-4">{archived.map((c) => <Item key={c.id} c={c} />)}</div></details>}
      </div>
    </>
  );
}
