'use client';
import { useState } from 'react';
import { Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/ui/action';
import { Modal } from '@/components/ui/modal';
import { Field } from '@/components/ui/primitives';
import { deleteGymAsOwner, purgeExpiredSignups, setGymLimit, setGymStatus, superAdminSignIn, updateGymAsOwner } from '@/lib/actions/superadmin';

export interface GymRow {
  id: string; name: string; subdomain: string; status: string; max_members: number; city: string | null; province: string | null; country: string | null;
  director_name: string | null; contact_email: string | null; size_range: string | null; address: string | null; postal_code: string | null; phone: string | null; website: string | null;
}

export function SuperLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="display text-center text-4xl">Panel de OpenGym</h1>
        <p className="mb-6 mt-2 text-center text-sm text-muted">Acceso solo para el propietario de la plataforma.</p>
        <ActionForm action={superAdminSignIn} resetOnSuccess={false} className="card card-pad space-y-4">
          <Field label="Email"><input name="email" type="email" className="input" autoComplete="username" required /></Field>
          <Field label="Contraseña"><input name="password" type="password" className="input" autoComplete="current-password" required /></Field>
          <SubmitButton size="lg" className="w-full">Entrar</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}

export function GymControls({ gym }: { gym: GymRow }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const active = gym.status === 'active';
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ActionForm action={setGymLimit.bind(null, gym.id)} resetOnSuccess={false} className="flex items-center gap-1.5">
          <input name="max_members" type="number" min={1} defaultValue={gym.max_members} aria-label={`Límite de socios de ${gym.name}`} className="input num !h-8 !w-20 text-right text-sm" />
          <SubmitButton variant="ghost" size="sm">Límite</SubmitButton>
        </ActionForm>
        <ActionButton variant={active ? 'danger' : 'primary'} action={setGymStatus.bind(null, gym.id, active ? 'suspended' : 'active')}
          confirm={active ? { title: `¿Suspender «${gym.name}»?`, message: 'Sus administradores, entrenadores y socios dejarán de poder entrar de inmediato. Sus datos se conservan y podrás reactivarlo.', confirmLabel: 'Suspender' } : undefined}>
          {active ? <><Pause className="size-3.5" />Suspender</> : <><Play className="size-3.5" />Reactivar</>}
        </ActionButton>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil className="size-3.5" />Editar</button>
        <button className="btn btn-danger btn-sm" onClick={() => setDeleting(true)}><Trash2 className="size-3.5" />Eliminar</button>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Editar «${gym.name}»`}>
        <ActionForm action={updateGymAsOwner.bind(null, gym.id)} resetOnSuccess={false} onSuccess={() => setEditing(false)} className="grid gap-4 text-left sm:grid-cols-2">
          <Field label="Nombre del gimnasio" className="sm:col-span-2"><input name="name" className="input" defaultValue={gym.name} required maxLength={60} /></Field>
          <Field label="Director/a"><input name="director_name" className="input" defaultValue={gym.director_name ?? ''} maxLength={80} /></Field>
          <Field label="Email de contacto"><input name="contact_email" type="email" className="input" defaultValue={gym.contact_email ?? ''} /></Field>
          <Field label="Dirección" className="sm:col-span-2"><input name="address" className="input" defaultValue={gym.address ?? ''} maxLength={120} /></Field>
          <Field label="Código postal"><input name="postal_code" className="input" defaultValue={gym.postal_code ?? ''} maxLength={10} /></Field>
          <Field label="Ciudad"><input name="city" className="input" defaultValue={gym.city ?? ''} maxLength={60} /></Field>
          <Field label="Provincia"><input name="province" className="input" defaultValue={gym.province ?? ''} maxLength={60} /></Field>
          <Field label="País"><input name="country" className="input" defaultValue={gym.country ?? ''} maxLength={60} /></Field>
          <Field label="Teléfono"><input name="phone" className="input" defaultValue={gym.phone ?? ''} maxLength={30} /></Field>
          <Field label="Web"><input name="website" className="input" defaultValue={gym.website ?? ''} maxLength={120} /></Field>
          <Field label="Socios aproximados" className="sm:col-span-2"><select name="size_range" className="select" defaultValue={gym.size_range ?? ''}><option value="">Sin indicar</option><option>1-50</option><option>51-150</option><option>151-500</option><option>500+</option></select></Field>
          <p className="text-xs text-faint sm:col-span-2">El código (<strong>/{gym.subdomain}</strong>) no se puede cambiar: forma parte de las cuentas de acceso del gimnasio.</p>
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button><SubmitButton>Guardar</SubmitButton></div>
        </ActionForm>
      </Modal>

      <Modal open={deleting} onClose={() => setDeleting(false)} title={`Eliminar «${gym.name}»`}>
        <ActionForm action={deleteGymAsOwner.bind(null, gym.id)} resetOnSuccess={false} onSuccess={() => setDeleting(false)} className="space-y-4 text-left">
          <p className="text-sm text-muted">Se borran <strong className="text-fg">para siempre</strong> el gimnasio, sus socios, entrenadores, actividades, rutinas, marcas, <strong className="text-fg">recibos y cobros</strong> y todas sus cuentas de acceso. No se puede deshacer. Si solo quieres bloquear el acceso, usa «Suspender».</p>
          <Field label={`Para confirmar, escribe el código: ${gym.subdomain}`}><input name="confirm" className="input" autoComplete="off" autoCapitalize="none" spellCheck={false} required placeholder={gym.subdomain} /></Field>
          <div className="flex justify-end gap-3"><button type="button" className="btn btn-ghost" onClick={() => setDeleting(false)}>Cancelar</button><SubmitButton variant="danger">Eliminar para siempre</SubmitButton></div>
        </ActionForm>
      </Modal>
    </div>
  );
}

export function PurgeButton() {
  return (
    <ActionButton action={purgeExpiredSignups} confirm={{ title: 'Limpiar solicitudes caducadas', message: 'Se eliminan las solicitudes de alta sin verificar que ya caducaron, junto con sus cuentas provisionales.', confirmLabel: 'Limpiar' }}>
      <Trash2 className="size-3.5" />Limpiar caducadas
    </ActionButton>
  );
}
