'use client';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/ui/action';
import { Card, Chip, Field } from '@/components/ui/primitives';
import { GymLogo } from '@/components/gym-logo';
import { MAIL_PRESETS, type MailPreset } from '@/lib/mail-presets';
import { formatDate } from '@/lib/format';
import { removeGymLogo, removeMailSettings, saveGymLogo, saveMailSettings, sendTestMail } from '@/lib/actions/settings';

export function LogoCard({ slug, version }: { slug: string; version: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <Card title="Logo del gimnasio">
      <div className="flex flex-wrap items-center gap-6">
        <div className="grid size-24 shrink-0 place-items-center rounded-md border border-line bg-panel2" aria-label="Logo actual">
          {preview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={preview} alt="Vista previa" className="h-16 w-16 object-contain" />
            : <GymLogo slug={slug} version={version} className="h-16 w-16" />}
        </div>
        <ActionForm action={saveGymLogo} onSuccess={() => setPreview(null)} className="min-w-0 flex-1 space-y-3">
          <Field label="Subir un logo nuevo" hint="PNG, JPG o WebP, hasta 2 MB. Se reduce solo. Aparece en tu panel, en la pantalla de acceso y en los recibos.">
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required className="input !h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-panel2 file:px-3 file:py-1 file:text-sm file:text-fg"
              onChange={(e) => { const f = e.target.files?.[0]; setPreview((old) => { if (old) URL.revokeObjectURL(old); return f ? URL.createObjectURL(f) : null; }); }} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <SubmitButton>Guardar logo</SubmitButton>
            {version && <ActionButton variant="danger" size="md" action={removeGymLogo} confirm={{ title: 'Quitar el logo', message: 'Se mostrará la marca de OpenGym en su lugar.', confirmLabel: 'Quitar' }}>Quitar logo</ActionButton>}
          </div>
        </ActionForm>
      </div>
    </Card>
  );
}

export function MailCard({ status, canEncrypt }: { status: { provider: MailPreset; username: string; fromName: string; verifiedAt: string | null } | null; canEncrypt: boolean }) {
  return (
    <Card title="Correo para enviar los recibos">
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Tus socios recibirán los recibos desde <strong className="text-fg">tu propio correo</strong> (por ejemplo, forzagym@gmail.com). Crea una cuenta de Gmail para tu gimnasio,
          activa la verificación en dos pasos y genera una <strong className="text-fg">contraseña de aplicación</strong>: es una clave de 16 letras que solo sirve para enviar correo y se puede revocar cuando quieras.{' '}
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gold underline">Crear contraseña de aplicación <ExternalLink className="size-3" aria-hidden /></a>
        </p>

        {status && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ok/40 bg-ok/10 px-4 py-3">
            <div><Chip tone="ok">Conectado</Chip><p className="mt-1.5 text-sm"><strong>{status.username}</strong> · {MAIL_PRESETS[status.provider]?.label ?? status.provider}</p><p className="text-xs text-faint">Verificado el {formatDate(status.verifiedAt)}</p></div>
            <div className="flex gap-2">
              <ActionButton action={sendTestMail}>Enviar correo de prueba</ActionButton>
              <ActionButton variant="danger" action={removeMailSettings} confirm={{ title: 'Desconectar el correo', message: 'Se borra la contraseña guardada. Los recibos dejarán de enviarse desde tu cuenta.', confirmLabel: 'Desconectar' }}>Desconectar</ActionButton>
            </div>
          </div>
        )}

        {!canEncrypt && <p role="alert" className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm">La plataforma aún no tiene configurada la clave de cifrado, así que no se pueden guardar contraseñas. Avisa al administrador de OpenGym.</p>}

        <ActionForm action={saveMailSettings} className="grid gap-4 sm:grid-cols-2">
          <Field label="Proveedor"><select name="provider" className="select" defaultValue={status?.provider ?? 'gmail'}>{Object.entries(MAIL_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label="Correo del gimnasio"><input name="username" type="email" className="input" required placeholder="forzagym@gmail.com" defaultValue={status?.username ?? ''} autoComplete="off" /></Field>
          <Field label="Contraseña de aplicación" hint="No es la contraseña normal de tu correo. Se guarda cifrada y nadie puede verla."><input name="password" type="password" className="input" required autoComplete="new-password" placeholder="16 letras" /></Field>
          <Field label="Nombre que verán tus socios"><input name="from_name" className="input" maxLength={60} placeholder="Forza Gym" defaultValue={status?.fromName ?? ''} /></Field>
          <div className="sm:col-span-2"><SubmitButton>{status ? 'Actualizar y verificar' : 'Conectar y verificar'}</SubmitButton></div>
        </ActionForm>
        <p className="text-xs text-faint">Gmail permite unos 500 correos al día por cuenta. Resend no puede enviar desde direcciones @gmail.com, por eso se usa tu propia cuenta.</p>
      </div>
    </Card>
  );
}
