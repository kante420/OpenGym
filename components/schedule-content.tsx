import type { SupabaseClient } from '@supabase/supabase-js';
import { todayISO } from '@/lib/format';
import type { Role, Zone } from '@/lib/types';
import { PageHeader } from '@/components/ui/primitives';
import { PrintButton } from '@/components/print-button';
import { WeeklySchedule, type ScheduleClass } from '@/components/weekly-schedule';

/** Pantalla «Horario»: la misma para los tres perfiles; sólo cambia lo que cada uno puede ver. */
export async function ScheduleContent({ supabase, gymId, role, userId }: { supabase: SupabaseClient; gymId: string; role: Role; userId: string }) {
  const staff = role !== 'CLIENTE';
  const [zRes, cRes, tRes, bRes] = await Promise.all([
    supabase.from('zones').select('*').eq('gym_id', gymId).order('name'),
    supabase.from('classes').select('id, title, zone_id, days_of_week, schedule_time, capacity, trainer_id, bookings(user_id)').eq('gym_id', gymId).eq('active', true),
    staff ? supabase.from('profiles').select('id, full_name').eq('gym_id', gymId).eq('role', 'ENTRENADOR') : Promise.resolve({ data: [] }),
    staff ? Promise.resolve({ data: [] }) : supabase.from('bookings').select('class_id').eq('user_id', userId),
  ]);
  const classes = ((cRes.data ?? []) as (ScheduleClass & { bookings?: unknown[] })[]).map(({ bookings, ...c }) => ({ ...c, enrolled: bookings?.length }));
  const trainers = new Map(((tRes.data ?? []) as { id: string; full_name: string }[]).map((t) => [t.id, t.full_name]));
  const mine = new Set(((bRes.data ?? []) as { class_id: string }[]).map((b) => b.class_id));

  return (
    <>
      <PageHeader title="Horario semanal" subtitle={staff ? 'Todas las actividades del centro por día y zona.' : 'Todas las actividades del centro. Las tuyas aparecen resaltadas.'} actions={<PrintButton />} />
      <WeeklySchedule classes={classes} zones={(zRes.data ?? []) as Zone[]} today={todayISO()} trainerNames={trainers} mineIds={staff ? undefined : mine} showOccupancy={staff} />
    </>
  );
}
