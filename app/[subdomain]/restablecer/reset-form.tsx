'use client';
import { useRouter } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Field } from '@/components/ui/primitives';
import { resetPassword } from '@/lib/actions/auth';

export function ResetForm({ subdomain, token }: { subdomain: string; token: string }) {
  const router = useRouter();
  return (
    <ActionForm action={resetPassword.bind(null, subdomain, token)} resetOnSuccess={false} onSuccess={() => router.push(`/${subdomain}?clave=1`)} className="card card-pad space-y-4">
      <Field label="Contraseña nueva"><input name="next" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" /></Field>
      <Field label="Repite la contraseña"><input name="confirm" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" /></Field>
      <SubmitButton size="lg" className="w-full">Guardar contraseña</SubmitButton>
    </ActionForm>
  );
}
