import { Clock, UserRound } from 'lucide-react';
import { parseDays, WEEKDAYS } from '@/lib/format';
import type { ClassRow, Zone } from '@/lib/types';

export type ScheduleClass = Pick<ClassRow, 'id' | 'title' | 'zone_id' | 'days_of_week' | 'schedule_time' | 'capacity' | 'trainer_id'> & { enrolled?: number };

const startOf = (c: ScheduleClass) => (c.schedule_time ?? '99:99').split('-')[0].trim();

/**
 * Horario semanal: un bloque por día y, dentro de cada día, una columna por zona
 * (Tapiz, Césped…). Se genera solo a partir de las actividades y zonas del centro.
 */
export function WeeklySchedule({ classes, zones, today, trainerNames, mineIds, showOccupancy }: {
  classes: ScheduleClass[]; zones: Zone[]; today: string; trainerNames?: Map<string, string>; mineIds?: Set<string>; showOccupancy?: boolean;
}) {
  const hasNoZone = classes.some((c) => !c.zone_id || !zones.some((z) => z.id === c.zone_id));
  const columns: { id: string | null; name: string }[] = [
    ...zones.map((z) => ({ id: z.id, name: z.name })),
    ...(hasNoZone || zones.length === 0 ? [{ id: null, name: zones.length ? 'Sin zona' : 'Actividades' }] : []),
  ];
  const inColumn = (c: ScheduleClass, colId: string | null) => (colId === null ? !c.zone_id || !zones.some((z) => z.id === c.zone_id) : c.zone_id === colId);
  const todayName = WEEKDAYS[(new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7];

  if (classes.length === 0) {
    return <p className="card card-pad text-center text-sm text-muted">Todavía no hay actividades con horario. Se mostrarán aquí en cuanto se creen.</p>;
  }

  return (
    <div className="space-y-4">
      {WEEKDAYS.map((day) => {
        const dayClasses = classes.filter((c) => parseDays(c.days_of_week).includes(day)).sort((a, b) => startOf(a).localeCompare(startOf(b)));
        const isToday = day === todayName;
        return (
          <section key={day} aria-labelledby={`dia-${day}`} className={`card overflow-hidden ${isToday ? 'border-gold/60' : ''}`}>
            <header className={`flex items-center gap-3 border-b border-line px-5 py-3 ${isToday ? 'bg-gold/10' : ''}`}>
              <h2 id={`dia-${day}`} className={`display text-2xl ${isToday ? 'text-gold-hi' : ''}`}>{day}</h2>
              {isToday && <span className="chip chip-gold">Hoy</span>}
              {dayClasses.length === 0 && <span className="text-sm text-faint">Sin clases</span>}
            </header>
            {dayClasses.length > 0 && (
              <div className="scroll-x">
                <div className="grid min-w-full" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(${columns.length > 2 ? 190 : 150}px, 1fr))` }}>
                  {columns.map((col) => (
                    <div key={col.id ?? 'none'} className="border-r border-line p-3 last:border-r-0">
                      <h3 className="mb-2.5 text-sm font-semibold text-muted">{col.name}</h3>
                      <ul className="space-y-2">
                        {dayClasses.filter((c) => inColumn(c, col.id)).map((c) => {
                          const mine = mineIds?.has(c.id);
                          return (
                            <li key={c.id} className={`rounded-md p-3 ${mine ? 'border border-gold/60 bg-gold/10' : 'bg-panel2'}`}>
                              <p className="num flex items-center gap-1.5 text-xs text-muted"><Clock className="size-3" aria-hidden />{c.schedule_time}</p>
                              <p className="mt-0.5 font-semibold leading-tight">{c.title}{mine && <span className="chip chip-gold ml-2 align-middle">Tuya</span>}</p>
                              {c.trainer_id && trainerNames?.get(c.trainer_id) && <p className="mt-1 flex items-center gap-1.5 text-xs text-faint"><UserRound className="size-3" aria-hidden />{trainerNames.get(c.trainer_id)}</p>}
                              {showOccupancy && c.enrolled !== undefined && <p className="num mt-1 text-xs text-faint">{c.enrolled}{c.capacity ? ` / ${c.capacity}` : ''} inscritos</p>}
                            </li>
                          );
                        })}
                        {dayClasses.filter((c) => inColumn(c, col.id)).length === 0 && <li className="px-1 text-sm text-faint">—</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
