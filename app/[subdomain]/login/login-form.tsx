'use client';
import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Field } from '@/components/ui/primitives';
import { signIn } from '@/lib/actions/auth';

export function LoginForm({ subdomain }: { subdomain: string }) {
  return (
    <ActionForm action={signIn.bind(null, subdomain)} resetOnSuccess={false} className="card card-pad space-y-4">
      <Field label="Usuario o email">
        <input name="username" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="usuario o tu@email.com" required />
      </Field>
      <Field label="Contraseña">
        <input name="password" type="password" className="input" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full">Entrar</SubmitButton>
      <p className="text-center text-sm"><Link href={`/${subdomain}/recuperar`} className="text-muted underline hover:text-fg">¿Has olvidado tu contraseña?</Link></p>
    </ActionForm>
  );
}
