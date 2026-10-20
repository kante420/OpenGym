'use server';
import { z } from 'zod';
import { requireRole, UserError } from '../auth';
import type { ActionResult } from '../types';
import { num, optStr, run, str, unwrap } from './shared';

const schema = z.object({
  name: z.string().min(2, 'Escribe el nombre comercial.').max(80),
  legal_name: z.string().max(120).nullable(),
  tax_id: z.string().max(20).nullable(),
  address: z.string().max(200).nullable(),
  phone: z.string().max(30).nullable(),
  contact_email: z.string().email('El email de contacto no es válido.').nullable(),
  vat_rate: z.number().min(0, 'El IVA no puede ser negativo.').max(30, 'El IVA no es válido.'),
  prices_include_vat: z.boolean(),
  receipt_prefix: z.string().regex(/^[A-Z0-9]{1,6}$/, 'El prefijo admite 1–6 letras o números en mayúsculas.'),
});

export async function updateGymSettings(_p: ActionResult | null, fd: FormData) {
  return run(async () => {
    const { supabase, gym } = await requireRole(['ADMINISTRADOR']);
    const r = schema.safeParse({
      name: str(fd, 'name'),
      legal_name: optStr(fd, 'legal_name'),
      tax_id: optStr(fd, 'tax_id'),
      address: optStr(fd, 'address'),
      phone: optStr(fd, 'phone'),
      contact_email: optStr(fd, 'contact_email'),
      vat_rate: num(fd, 'vat_rate'),
      prices_include_vat: str(fd, 'prices_include_vat') === 'true',
      receipt_prefix: str(fd, 'receipt_prefix').toUpperCase(),
    });
    if (!r.success) throw new UserError(r.error.issues[0].message);
    unwrap(await supabase.from('gyms').update(r.data).eq('id', gym.id));
    return { message: 'Ajustes guardados. Los próximos recibos usarán estos datos.' };
  });
}
