'use client';
import Script from 'next/script';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MailCheck, XCircle } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/ui/action';
import { Card, Field } from '@/components/ui/primitives';
import { checkSlug, requestGym } from '@/lib/actions/platform';
import { slugify } from '@/lib/slug';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://opengym.vercel.app').replace(/^https?:\/\//, '').replace(/\/$/, '');
const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function CrearForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [avail, setAvail] = useState<{ slug: string; ok: boolean; message: string } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const startRef = useRef(0);

  useEffect(() => { startRef.current = Date.now(); }, []);
  useEffect(() => {
    if (!slug) return;
    const t = setTimeout(async () => setAvail({ slug, ...(await checkSlug(slug)) }), 450);
    return () => clearTimeout(t);
  }, [slug]);

  if (sentTo) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MailCheck className="size-10 text-gold" aria-hidden />
          <h2 className="display text-4xl">Revisa tu email</h2>
          <p className="max-w-md text-muted">Hemos enviado un enlace de confirmación a <strong className="text-fg">{sentTo}</strong>. Púlsalo para activar tu gimnasio. Caduca en 24 horas.</p>
          <p className="text-sm text-faint">¿No llega? Mira en spam o correo no deseado.</p>
          <Link href="/" className="btn btn-ghost mt-2">Volver al inicio</Link>
        </div>
      </Card>
    );
  }

  const status = avail && avail.slug === slug ? avail : null;
  return (
    <>
      {TURNSTILE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
      <ActionForm action={requestGym} resetOnSuccess={false} onSuccess={(r) => setSentTo(r.data?.email ?? '')} extraFields={() => ({ t0: String(startRef.current) })} className="space-y-6">
        <Card title="Tu gimnasio">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del gimnasio" className="sm:col-span-2"><input name="gym_name" className="input" value={name} onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} required maxLength={60} autoComplete="organization" /></Field>
            <div className="sm:col-span-2">
              <Field label="Dirección web de tu gimnasio" hint="Solo letras minúsculas, números y guiones. No se puede cambiar después con facilidad.">
                <div className="flex items-center">
                  <span className="hidden h-10 items-center rounded-l-md border border-r-0 border-line bg-panel2 px-3 text-sm text-muted sm:flex">{SITE}/</span>
                  <input name="slug" className="input sm:!rounded-l-none" value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} required maxLength={30} autoCapitalize="none" spellCheck={false} placeholder="mi-gimnasio" />
                </div>
              </Field>
              <p aria-live="polite" className="mt-1.5 min-h-5 text-xs">
                {status && (status.ok
                  ? <span className="inline-flex items-center gap-1 text-ok"><CheckCircle2 className="size-3.5" />{SITE}/{slug} está disponible</span>
                  : <span className="inline-flex items-center gap-1 text-bad"><XCircle className="size-3.5" />{status.message}</span>)}
              </p>
            </div>
            <Field label="Dirección" className="sm:col-span-2"><input name="address" className="input" required maxLength={120} autoComplete="street-address" placeholder="Calle y número" /></Field>
            <Field label="Código postal"><input name="postal_code" className="input" maxLength={10} autoComplete="postal-code" /></Field>
            <Field label="Ciudad"><input name="city" className="input" required maxLength={60} autoComplete="address-level2" /></Field>
            <Field label="Provincia"><input name="province" className="input" maxLength={60} autoComplete="address-level1" /></Field>
            <Field label="País"><input name="country" className="input" required maxLength={60} defaultValue="España" autoComplete="country-name" /></Field>
            <Field label="Teléfono del gimnasio"><input name="phone" type="tel" className="input" maxLength={30} autoComplete="tel" /></Field>
            <Field label="Web (opcional)"><input name="website" className="input" maxLength={120} placeholder="https://" /></Field>
            <Field label="Socios aproximados" className="sm:col-span-2">
              <select name="size_range" className="select" required defaultValue=""><option value="" disabled>Elige una opción</option><option>1-50</option><option>51-150</option><option>151-500</option><option>500+</option></select>
            </Field>
          </div>
        </Card>

        <Card title="Administrador">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del director o directora" className="sm:col-span-2"><input name="director_name" className="input" required maxLength={80} autoComplete="name" /></Field>
            <Field label="Email" hint="Con él entrarás y recuperarás tu contraseña. Lo verificaremos." className="sm:col-span-2"><input name="email" type="email" className="input" required autoComplete="email" /></Field>
            <Field label="Contraseña" hint="Mínimo 10 caracteres."><input name="password" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" /></Field>
            <Field label="Repite la contraseña"><input name="password2" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" /></Field>
          </div>
        </Card>

        {/* Campo trampa para bots: una persona no lo ve ni lo rellena */}
        <div aria-hidden className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"><label>No rellenes este campo<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>

        {TURNSTILE_KEY && <div className="cf-turnstile" data-sitekey={TURNSTILE_KEY} data-theme="dark" />}

        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-[var(--color-gold)]" />
          <span>He leído y acepto los <Link href="/legal/terminos" target="_blank" className="text-gold underline">términos de uso</Link> y la <Link href="/legal/privacidad" target="_blank" className="text-gold underline">política de privacidad</Link>, incluido el contrato de encargado del tratamiento de los datos de mis socios.</span>
        </label>

        <SubmitButton size="lg" className="w-full sm:w-auto">Crear gimnasio</SubmitButton>
      </ActionForm>
    </>
  );
}
