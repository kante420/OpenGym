'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Search } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { getBlocks } from '@/lib/routine';
import type { WorkoutLog } from '@/lib/types';
import { ActionButton } from '@/components/ui/action';
import { Card, Chip, EmptyState } from '@/components/ui/primitives';
import { PresentButton } from '@/components/present-button';
import { deleteRoutine, reopenSession } from '@/lib/actions/routines';
import { DuplicateButton } from './routine-tools';

export function RoutineHistoryView({
  logs,
  classes,
  base,
  nextDate,
}: {
  logs: WorkoutLog[];
  classes: { id: string; title: string }[];
  base: string;
  nextDate: string;
}) {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (classFilter && l.class_id !== classFilter) return false;
      if (statusFilter === 'completed' && !l.is_completed) return false;
      if (statusFilter === 'pending' && l.is_completed) return false;
      if (!q) return true;

      const titleMatch = l.title?.toLowerCase().includes(q);
      const classMatch = l.classes?.title?.toLowerCase().includes(q);
      const descMatch = l.description?.toLowerCase().includes(q);
      return Boolean(titleMatch || classMatch || descMatch);
    });
  }, [logs, query, classFilter, statusFilter]);

  return (
    <Card title="Historial completo de rutinas" pad={false}>
      {/* Barra de filtros y búsqueda */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, ejercicio o grupo..."
            className="input !h-9 pl-9 text-sm"
          />
        </div>

        {classes.length > 0 && (
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="select !h-9 text-sm"
            aria-label="Filtrar por grupo"
          >
            <option value="">Todos los grupos</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}

        <div className="flex rounded-md border border-line bg-panel2 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded px-2.5 py-1 font-medium transition ${statusFilter === 'all' ? 'bg-gold font-bold text-ink' : 'text-muted hover:text-ink'}`}
          >
            Todas ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`rounded px-2.5 py-1 font-medium transition ${statusFilter === 'completed' ? 'bg-gold font-bold text-ink' : 'text-muted hover:text-ink'}`}
          >
            Completadas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`rounded px-2.5 py-1 font-medium transition ${statusFilter === 'pending' ? 'bg-gold font-bold text-ink' : 'text-muted hover:text-ink'}`}
          >
            Pendientes
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No se encontraron rutinas">
          {query || classFilter || statusFilter !== 'all'
            ? 'Prueba a cambiar o limpiar los filtros.'
            : 'Aún no has creado rutinas.'}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((l) => {
            const blocks = getBlocks(l);
            const nExercises = blocks.reduce((acc, b) => acc + b.exercises.length, 0);
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-canvas/30">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{l.title}</span>
                    {l.is_completed ? (
                      <Chip tone="ok">Completada</Chip>
                    ) : (
                      <Chip tone="muted">Programada</Chip>
                    )}
                  </div>
                  <p className="text-xs text-faint">
                    {l.classes?.title ?? 'Sin grupo'} · {formatDate(l.log_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {blocks.length} {blocks.length === 1 ? 'bloque' : 'bloques'}, {nExercises} ejercicios
                  </p>
                  {l.description && (
                    <p className="line-clamp-1 max-w-xl text-xs text-muted">
                      {l.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PresentButton href={`${base}/present/${l.id}`} variant="ghost" />
                  {l.is_completed && (
                    <ActionButton
                      action={reopenSession.bind(null, l.id)}
                      variant="ghost"
                      size="sm"
                      title="Quitar el check de completada"
                      confirm={{
                        title: `¿Reabrir «${l.title}»?`,
                        message: 'La rutina volverá a figurar como pendiente (sin el check de completada) manteniendo las marcas registradas.',
                        confirmLabel: 'Reabrir',
                      }}
                    >
                      Reabrir
                    </ActionButton>
                  )}
                  <Link
                    href={`${base}/coach/routines?edit=${l.id}&tab=designer`}
                    scroll
                    className="btn btn-ghost btn-sm"
                    title="Editar rutina original"
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Link>
                  <DuplicateButton
                    id={l.id}
                    title={l.title}
                    defaultDate={nextDate}
                    classes={classes}
                    defaultClassId={l.class_id}
                    base={base}
                    isReuse
                  />
                  <ActionButton
                    variant="danger"
                    action={deleteRoutine.bind(null, l.id)}
                    confirm={{
                      title: `¿Eliminar «${l.title}»?`,
                      message: 'Se eliminará la rutina del historial junto con sus marcas registradas.',
                      confirmLabel: 'Eliminar',
                    }}
                  >
                    Eliminar
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
