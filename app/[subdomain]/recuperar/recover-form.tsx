'use client';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Field } from '@/components/ui/primitives';
import { requestPasswordReset } from '@/lib/actions/auth';

export function RecoverForm({ subdomain }: { subdomain: string }) {
  const [sent, setSent] = useState(false);
  if (sent) return <div className="card card-pad flex flex-col items-center gap-2 text-center"><MailCheck className="size-8 text-gold" aria-hidden /><p className="text-sm text-muted">Si existe una cuenta con ese email, te hemos enviado un enlace. Caduca en 1 hora; mira también el spam.</p></div>;
  return (
    <ActionForm action={requestPasswordReset.bind(null, subdomain)} resetOnSuccess={false} onSuccess={() => setSent(true)} className="card card-pad space-y-4">
      <Field label="Email"><input name="email" type="email" className="input" required autoComplete="email" /></Field>
      <SubmitButton size="lg" className="w-full">Enviar enlace</SubmitButton>
    </ActionForm>
  );
}
