'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { confirmGym } from '@/lib/actions/platform';

export function ConfirmGym({ token }: { token: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-primary btn-lg" disabled={pending}
      onClick={() => start(async () => {
        const r = await confirmGym(token);
        if (r.ok && r.data) router.push(`/${r.data.slug}?creado=1`); else if (!r.ok) toast(r.error, 'bad');
      })}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}Activar mi gimnasio
    </button>
  );
}
