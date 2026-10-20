import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { loadSessionData } from '@/lib/session-data';
import { LiveSessionClient } from './live-session-loader';

export const metadata = { title: 'Sesión en vivo' };

export default async function SessionPage({ params }: { params: Promise<{ subdomain: string; id: string }> }) {
  const { subdomain, id } = await params;
  const { supabase, gym } = await requirePage(subdomain, ['ENTRENADOR', 'ADMINISTRADOR']);
  const base = await gymBase(subdomain);
  const d = await loadSessionData(supabase, gym.id, id);
  if (!d) notFound();

  return <LiveSessionClient logId={id} title={d.log.title} groupName={d.log.classes?.title ?? ''} blocks={d.blocks} exercises={d.exercises} students={d.students}
    initialAttendance={d.initialAttendance} initialMarks={d.initialMarks} history={d.history} homeHref={`${base}/coach`} />;
}
