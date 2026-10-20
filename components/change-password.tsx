'use client';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Card, Field } from '@/components/ui/primitives';
import { changePassword } from '@/lib/actions/auth';

export function ChangePasswordCard() {
  return (
    <Card title="Cambiar contraseña">
      <ActionForm action={changePassword} className="grid max-w-md gap-4">
        <Field label="Contraseña actual"><input name="current" type="password" className="input" autoComplete="current-password" required /></Field>
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres."><input name="next" type="password" className="input" autoComplete="new-password" minLength={8} required /></Field>
        <Field label="Repite la nueva contraseña"><input name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required /></Field>
        <div><SubmitButton>Guardar contraseña</SubmitButton></div>
      </ActionForm>
    </Card>
  );
}
