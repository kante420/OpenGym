'use client';
import { useState, useTransition } from 'react';
import { Copy, KeyRound, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { ActionButton, ActionForm, SubmitButton } from '@/components/ui/action';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { Field } from '@/components/ui/primitives';
import { createMember, deleteMember, resetMemberPassword, setMemberActive, updateMember } from '@/lib/actions/members';
import type { Profile } from '@/lib/types';

type Creds = { username: string; password: string };

function CredentialsModal({ creds, onClose }: { creds: Creds | null; onClose: () => void }) {
  const { toast } = useToast();
  const text = creds ? `Usuario: ${creds.username}\nContraseña temporal: ${creds.password}` : '';
  return (
    <Modal open={!!creds} onClose={onClose} title="Credenciales de acceso"
      footer={<>
        <button className="btn btn-ghost" onClick={async () => { await navigator.clipboard.writeText(text); toast('Copiado al portapapeles', 'info'); }}><Copy className="size-4" />Copiar</button>
        <button className="btn btn-primary" onClick={onClose}>Hecho</button>
      </>}>
      <p className="mb-3 text-sm text-muted">Entrégaselas ahora: <strong className="text-fg">no volverán a mostrarse</strong>. Se le pedirá cambiar la contraseña en su primer acceso.</p>
      <pre className="rounded-md border border-line bg-canvas p-4 text-sm leading-7">{text}</pre>
    </Modal>
  );
}

export function MemberCreate({ gymName }: { gymName: string }) {
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="size-4" />Nuevo socio</button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Alta en ${gymName}`}>
        <ActionForm action={createMember} onSuccess={(r) => { setOpen(false); setCreds((r.data as Creds) ?? null); }} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" className="sm:col-span-2"><input name="full_name" className="input" required /></Field>
          <Field label="Usuario" hint="Con él entrará. Ej.: ana.lopez"><input name="username" className="input" required minLength={3} autoCapitalize="none" /></Field>
          <Field label="Rol"><select name="role" className="select" defaultValue="CLIENTE"><option value="CLIENTE">Socio</option><option value="ENTRENADOR">Entrenador</option></select></Field>
          <Field label="Email" hint="Para enviarle los recibos."><input name="email" type="email" className="input" /></Field>
          <Field label="Teléfono"><input name="phone" type="tel" className="input" /></Field>
          <Field label="DNI / NIE"><input name="dni" className="input" /></Field>
          <Field label="Fecha de nacimiento"><input name="birth_date" type="date" className="input" /></Field>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <SubmitButton>Dar de alta</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
    </>
  );
}

export function MemberActions({ member, isSelf }: { member: Profile; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  if (member.role === 'ADMINISTRADOR') return <span className="text-xs text-faint">—</span>;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} aria-label={`Editar a ${member.full_name}`}><Pencil className="size-3.5" />Editar</button>
      <button className="btn btn-ghost btn-sm" disabled={pending} aria-label={`Restablecer contraseña de ${member.full_name}`} title="Generar contraseña temporal"
        onClick={() => start(async () => {
          const r = await resetMemberPassword(member.id);
          if (r.ok && r.data) setCreds({ username: member.username, password: r.data.password });
          else if (!r.ok) toast(r.error, 'bad');
        })}><KeyRound className="size-3.5" /></button>
      {!isSelf && (
        <ActionButton action={() => setMemberActive(member.id, !member.active)} title={member.active ? 'Desactivar' : 'Reactivar'}
          confirm={member.active ? { title: `¿Desactivar a ${member.full_name}?`, message: 'Perderá el acceso de inmediato. Sus datos y recibos se conservan y podrás reactivarlo.', confirmLabel: 'Desactivar' } : undefined}>
          <Power className="size-3.5" />{member.active ? '' : 'Reactivar'}
        </ActionButton>
      )}
      {!isSelf && (
        <ActionButton variant="danger" action={() => deleteMember(member.id)} title="Eliminar"
          confirm={{ title: `¿Eliminar a ${member.full_name}?`, message: 'Se borran su cuenta, inscripciones y marcas. No se puede deshacer. Si tiene recibos emitidos no se podrá eliminar.', confirmLabel: 'Eliminar' }}>
          <Trash2 className="size-3.5" />
        </ActionButton>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar datos">
        <ActionForm action={updateMember.bind(null, member.id)} resetOnSuccess={false} onSuccess={() => setEditing(false)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" className="sm:col-span-2"><input name="full_name" className="input" defaultValue={member.full_name} required /></Field>
          <input type="hidden" name="username" value={member.username} />
          <Field label="Rol"><select name="role" className="select" defaultValue={member.role}><option value="CLIENTE">Socio</option><option value="ENTRENADOR">Entrenador</option></select></Field>
          <Field label="Usuario" hint="No se puede cambiar."><input className="input" value={member.username} disabled readOnly /></Field>
          <Field label="Email"><input name="email" type="email" className="input" defaultValue={member.email ?? ''} /></Field>
          <Field label="Teléfono"><input name="phone" type="tel" className="input" defaultValue={member.phone ?? ''} /></Field>
          <Field label="DNI / NIE"><input name="dni" className="input" defaultValue={member.dni ?? ''} /></Field>
          <Field label="Fecha de nacimiento"><input name="birth_date" type="date" className="input" defaultValue={member.birth_date ?? ''} /></Field>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            <SubmitButton>Guardar cambios</SubmitButton>
          </div>
        </ActionForm>
      </Modal>
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
    </div>
  );
}
