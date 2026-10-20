import { requirePage } from '@/lib/auth';
import { gymBase } from '@/lib/paths';
import { PageHeader } from '@/components/ui/primitives';
import { ProgressView } from '@/components/progress-view';

export const metadata = { title: 'Mi progreso' };

export default async function MeProgress({ params, searchParams }: { params: Promise<{ subdomain: string }>; searchParams: Promise<{ ex?: string }> }) {
  const { subdomain } = await params;
  const { ex } = await searchParams;
  const { supabase, profile } = await requirePage(subdomain, ['CLIENTE']);
  return (
    <>
      <PageHeader title="Mi progreso" subtitle="Tus marcas por ejercicio, tu peso y tu asistencia." />
      <ProgressView supabase={supabase} userId={profile.id} ex={ex} basePath={`${await gymBase(subdomain)}/me/progress`} allowBodyLog />
    </>
  );
}
