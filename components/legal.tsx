import { PublicShell } from '@/components/public-shell';

export const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || '[TU NOMBRE O RAZÓN SOCIAL]';
export const LEGAL_EMAIL = process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || '[TU EMAIL DE CONTACTO]';
const isTemplate = LEGAL_NAME.startsWith('[') || LEGAL_EMAIL.startsWith('[');

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl pt-4 [&_h2]:display [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-2xl [&_li]:mb-1.5 [&_p]:mb-3 [&_p]:text-muted [&_li]:text-muted [&_ul]:list-disc [&_ul]:pl-5">
        {isTemplate && (
          <div role="alert" className="mb-6 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
            <strong>Plantilla sin completar.</strong> Define <code>NEXT_PUBLIC_LEGAL_NAME</code> y <code>NEXT_PUBLIC_LEGAL_EMAIL</code> y haz que un profesional revise este texto antes de abrir el servicio.
          </div>
        )}
        <h1 className="display text-5xl">{title}</h1>
        <p className="!mb-6 text-sm !text-faint">Última actualización: {updated}</p>
        {children}
      </article>
    </PublicShell>
  );
}
