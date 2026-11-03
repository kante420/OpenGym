import 'server-only';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { escapeHtml } from './format';
import type { Gym, Receipt } from './types';

/** Hay algún método de envío configurado: SMTP (Gmail, etc.) o Resend. */
export const emailConfigured = () => Boolean(process.env.SMTP_HOST?.trim() || process.env.RESEND_API_KEY?.trim());

/** Traduce el error del proveedor a algo que el administrador pueda entender y corregir. */
export function explainEmailError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  if (/testing emails|own email address|verify a domain/i.test(msg))
    return 'Resend está en modo prueba y solo envía al email de tu propia cuenta. Verifica un dominio en Resend o configura SMTP (ver README).';
  if (/domain is not verified|not verified/i.test(msg)) return 'El dominio del remitente no está verificado en Resend. Revisa RESEND_FROM o verifica el dominio.';
  if (/api key/i.test(msg)) return 'La clave de Resend (RESEND_API_KEY) no es válida.';
  if (code === 'EAUTH') return 'Usuario o contraseña SMTP incorrectos. En Gmail hace falta una «contraseña de aplicación», no la normal.';
  if (code && ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(code)) return 'No se pudo conectar con el servidor de correo. Inténtalo de nuevo en unos minutos o revisa la configuración.';
  return `No se pudo enviar el email (${msg.slice(0, 160)}).`;
}

export interface MailOptions {
  to: string; subject: string; html: string; replyTo?: string; fromName?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

export interface SmtpOverride { host: string; port: number; user: string; pass: string; fromName?: string }

/** Envío genérico. Con `smtp` usa la cuenta de ese gimnasio; si no, SMTP_HOST de la plataforma; si no, Resend. */
export async function sendEmail(o: MailOptions, smtp?: SmtpOverride) {
  // Sin comillas, ángulos ni saltos de línea: evita romper/inyectar la cabecera From
  const fromName = (smtp?.fromName || o.fromName || 'OpenGym').replace(/["<>\r\n]/g, '').trim() || 'OpenGym';
  if (smtp) {
    await nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass }, connectionTimeout: 10_000, greetingTimeout: 10_000 }).sendMail({
      from: `"${fromName.replace(/"/g, '')}" <${smtp.user}>`, to: o.to, replyTo: o.replyTo, subject: o.subject, html: o.html, attachments: o.attachments,
    });
    return;
  }
  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER?.trim();
    const transport = nodemailer.createTransport({
      host, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: user ? { user, pass: process.env.SMTP_PASS } : undefined, connectionTimeout: 10_000,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM?.trim() || `"${fromName.replace(/"/g, '')}" <${user}>`,
      to: o.to, replyTo: o.replyTo, subject: o.subject, html: o.html, attachments: o.attachments,
    });
    return;
  }
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error('No hay ningún método de envío configurado');
  const { error } = await new Resend(key).emails.send({
    from: process.env.RESEND_FROM?.trim() || `${fromName} <onboarding@resend.dev>`,
    to: [o.to], replyTo: o.replyTo, subject: o.subject, html: o.html,
    attachments: o.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  });
  if (error) throw new Error(error.message);
}

/** Plantilla común de los correos de la plataforma. */
export function emailLayout(title: string, bodyHtml: string, button?: { label: string; url: string }) {
  const btn = button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="background:#e0a93b;color:#1a1814;padding:12px 22px;text-decoration:none;font-weight:700;border-radius:6px;display:inline-block">${escapeHtml(button.label)}</a></p>
       <p style="font-size:12px;color:#6b665b">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapeHtml(button.url)}</p>`
    : '';
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1b1a17">
    <p style="font-weight:800;font-size:20px;margin:0 0 18px">Open<span style="color:#aa5a18">Gym</span></p>
    <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>${bodyHtml}${btn}</div>`;
}

export async function sendReceiptEmail(opts: { gym: Gym; to: string; clientName: string; receipt: Receipt; pdf: Buffer; smtp?: SmtpOverride }) {
  const { gym, receipt } = opts;
  await sendEmail({
    to: opts.to, fromName: gym.name, replyTo: gym.contact_email || undefined,
    subject: `Recibo ${receipt.receipt_code} · ${gym.name}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1b1a17">
      <h2 style="margin:0 0 12px">Hola, ${escapeHtml(opts.clientName)}</h2>
      <p>Hemos recibido tu pago de <strong>${receipt.amount.toFixed(2).replace('.', ',')} €</strong> en <strong>${escapeHtml(gym.name)}</strong>.</p>
      <p style="color:#6b665b">${escapeHtml(receipt.concept)}</p>
      <p>Tienes el recibo ${escapeHtml(receipt.receipt_code ?? '')} adjunto en PDF.</p>
      <p>¡Gracias por entrenar con nosotros!</p></div>`,
    attachments: [{ filename: `Recibo_${receipt.receipt_code}.pdf`, content: opts.pdf, contentType: 'application/pdf' }],
  }, opts.smtp);
}
