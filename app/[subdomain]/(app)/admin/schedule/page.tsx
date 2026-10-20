import { requirePage } from '@/lib/auth';
import { ScheduleContent } from '@/components/schedule-content';

export const metadata = { title: 'Horario' };

export default async function SchedulePage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  const { supabase, gym, profile } = await requirePage(subdomain, ['ADMINISTRADOR']);
  return <ScheduleContent supabase={supabase} gymId={gym.id} role={profile.role} userId={profile.id} />;
}
