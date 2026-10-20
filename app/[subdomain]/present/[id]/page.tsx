import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { formatDate } from '@/lib/format';
import { loadSessionData } from '@/lib/session-data';
import { PresenterClient } from './presenter-loader';

export const metadata = { title: 'Presentar' };

async function PresentContent({ params }: { params: Promise<{ subdomain: string; id: string }> }) {
  const { subdomain, id } = await params;
  const { supabase, gym } = await requirePage(subdomain, ['ENTRENADOR', 'ADMINISTRADOR']);
  const base = await gymBase(subdomain);
  const d = await loadSessionData(supabase, gym.id, id);
  if (!d) notFound();
  const date = formatDate(d.log.log_date, { weekday: 'long', day: 'numeric', month: 'long', year: undefined });

  return <PresenterClient logId={id} title={d.log.title} groupName={d.log.classes?.title ?? ''} dateLabel={date.charAt(0).toUpperCase() + date.slice(1)}
    blocks={d.blocks} exercises={d.exercises} students={d.students} history={d.history} initialMarks={d.initialMarks} initialAttendance={d.initialAttendance} homeHref={`${base}/coach`} />;
}

export default function PresentPage({ params }: { params: Promise<{ subdomain: string; id: string }> }) {
  return (
    <Suspense fallback={<div className="fixed inset-0 grid place-items-center bg-canvas text-muted">Preparando la presentación…</div>}>
      <PresentContent params={params} />
    </Suspense>
  );
}
