import type { RoutineBlock, WorkoutLog } from './types';

/** Texto plano equivalente (se sigue guardando en `description` por compatibilidad). */
export function blocksToDescription(blocks: RoutineBlock[]): string {
  return blocks
    .map((b) => {
      const list = b.exercises.length
        ? b.exercises.map((e) => `• ${e.name}: ${e.sets} series x ${e.reps} reps`).join('\n')
        : '  (Sin ejercicios)';
      return `📌 ${b.name}:\n${list}`;
    })
    .join('\n\n');
}

/** Lee la estructura nueva o, si la rutina es antigua, reconstruye los bloques desde el texto. */
export function getBlocks(log: Pick<WorkoutLog, 'structure' | 'description'>): RoutineBlock[] {
  if (Array.isArray(log.structure) && log.structure.length) return log.structure;
  const blocks: RoutineBlock[] = [];
  for (const raw of (log.description ?? '').split('\n')) {
    const line = raw.trim();
    if (line.startsWith('📌')) {
      blocks.push({ name: line.replace(/^📌\s*/, '').replace(/:$/, '').trim(), exercises: [] });
    } else if (line.startsWith('•')) {
      if (!blocks.length) blocks.push({ name: 'General', exercises: [] });
      const [name, rest = ''] = line.slice(1).split(':');
      const m = rest.match(/(\d+)\s*series?\s*x\s*(\d+)/i);
      blocks.at(-1)!.exercises.push({ name: name.trim(), sets: m ? Number(m[1]) : 3, reps: m ? Number(m[2]) : 10 });
    }
  }
  return blocks;
}

export function exerciseNames(blocks: RoutineBlock[]): string[] {
  const names = [...new Set(blocks.flatMap((b) => b.exercises.map((e) => e.name)))];
  return names.length ? names : ['General / Libres'];
}
