import Link from 'next/link';
import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { Avatar, Card, EmptyState, PageHeader } from '@/components/ui/primitives';
import { ProgressView } from '@/components/progress-view';

export const metadata = { title: 'Seguimiento' };

export default async function CoachProgress({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ class?: string; student?: string; ex?: string }> }) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const { supabase, gym, profile } = await requirePage(subdomain, ['ENTRENADOR', 'ADMINISTRADOR']);
  const base = `${await gymBase(subdomain)}/coach/progress`;

  const { data: cls } = await supabase.from('classes').select('id, title, trainer_id, bookings(user_id, profiles(id, full_name))').eq('gym_id', gym.id).eq('active', true).order('title');
  const classes = (cls ?? []) as unknown as { id: string; title: string; trainer_id: string | null; bookings: { profiles: { id: string; full_name: string } | null }[] }[];
  const mine = classes.filter((c) => c.trainer_id === profile.id);
  const shown = mine.length ? mine : classes;
  const current = shown.find((c) => c.id === sp.class);
  const students = (current?.bookings ?? []).map((b) => b.profiles).filter((p): p is { id: string; full_name: string } => !!p).sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));
  const student = students.find((s) => s.id === sp.student);

  return (
    <>
      <PageHeader title="Seguimiento" subtitle="Elige un grupo y un socio para ver su evolución de marcas, peso y asistencia." />
      <div className="mb-6 flex flex-wrap gap-2" role="list" aria-label="Grupos">
        {shown.length === 0 && <p className="text-sm text-faint">No hay actividades todavía.</p>}
        {shown.map((c) => <Link key={c.id} role="listitem" href={`${base}?class=${c.id}`} className={`chip px-4 py-1.5 text-sm ${c.id === current?.id ? 'chip-gold' : ''}`}>{c.title}</Link>)}
      </div>

      {!current ? <Card><EmptyState title="Elige un grupo" /></Card> : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Card title="Socios" pad={false}>
            {students.length === 0 ? <EmptyState title="Sin inscritos" /> : (
              <ul className="divide-y divide-line">{students.map((s) => (
                <li key={s.id}><Link href={`${base}?class=${current.id}&student=${s.id}`} aria-current={s.id === student?.id ? 'true' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${s.id === student?.id ? 'bg-panel2 text-gold-hi' : 'hover:bg-panel2/60'}`}><Avatar name={s.full_name} size={30} />{s.full_name}</Link></li>
              ))}</ul>
            )}
          </Card>
          <div>
            {!student ? <Card><EmptyState title="Elige un socio" /></Card> : (
              <>
                <h2 className="display mb-4 text-3xl">{student.full_name}</h2>
                <ProgressView supabase={supabase} userId={student.id} ex={sp.ex} basePath={`${base}?class=${current.id}&student=${student.id}`} allowBodyLog={false} />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
