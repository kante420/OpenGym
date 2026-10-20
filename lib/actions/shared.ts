import 'server-only';
import { revalidatePath } from 'next/cache';
import { UserError } from '../auth';
import type { ActionResult } from '../types';

/** Traduce errores de Postgres/PostgREST a mensajes para el usuario. */
export function friendlyError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case 'P0001': return error.message; // RAISE EXCEPTION de nuestras funciones: ya está en castellano
    case '23505': return 'Ya existe un registro igual.';
    case '23503': return 'No se puede completar: hay datos relacionados.';
    case '42501': return 'No tienes permiso para realizar esta acción.';
    case '23514': return 'Alguno de los valores no es válido.';
    default:
      console.error('[db]', error.code, error.message);
      return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }
}

/** Lanza si la respuesta de Supabase trae error; devuelve los datos si no. */
export function unwrap<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new UserError(friendlyError(res.error));
  return res.data;
}

/** Ejecuta una acción y convierte cualquier fallo en un ActionResult. */
export async function run<T = undefined>(
  fn: () => Promise<{ message?: string; data?: T } | void>,
  revalidate: string | false = '/[subdomain]',
): Promise<ActionResult<T>> {
  try {
    const r = (await fn()) ?? {};
    if (revalidate) revalidatePath(revalidate, 'layout');
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    if (e instanceof Error && (e as { digest?: string }).digest?.startsWith('NEXT_')) throw e;
    console.error('[action]', e);
    return { ok: false, error: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.' };
  }
}

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
export const optStr = (fd: FormData, key: string) => str(fd, key) || null;
export const num = (fd: FormData, key: string) => Number(String(fd.get(key) ?? '').replace(',', '.'));
