'use client';
import { Pause, Play, Trash2 } from 'lucide-react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/ui/action';
import { Field } from '@/components/ui/primitives';
import { purgeExpiredSignups, setGymLimit, setGymStatus, superAdminSignIn } from '@/lib/actions/superadmin';

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

export function GymControls({ id, name, status, maxMembers }: { id: string; name: string; status: string; maxMembers: number }) {
  const active = status === 'active';
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ActionForm action={setGymLimit.bind(null, id)} resetOnSuccess={false} className="flex items-center gap-1.5">
        <input name="max_members" type="number" min={1} defaultValue={maxMembers} aria-label={`Límite de socios de ${name}`} className="input num !h-8 !w-20 text-right text-sm" />
        <SubmitButton variant="ghost" size="sm">Límite</SubmitButton>
      </ActionForm>
      <ActionButton variant={active ? 'danger' : 'primary'} action={setGymStatus.bind(null, id, active ? 'suspended' : 'active')}
        confirm={active ? { title: `¿Suspender «${name}»?`, message: 'Sus administradores, entrenadores y socios dejarán de poder entrar de inmediato. Sus datos se conservan y podrás reactivarlo.', confirmLabel: 'Suspender' } : undefined}>
        {active ? <><Pause className="size-3.5" />Suspender</> : <><Play className="size-3.5" />Reactivar</>}
      </ActionButton>
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
