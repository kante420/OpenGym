/**
 * Proveedores de correo permitidos para que un gimnasio envíe sus recibos. Fijos a propósito: si cada gimnasio
 * pudiera indicar cualquier servidor, nuestro servidor serviría para conectarse a direcciones arbitrarias.
 */
export const MAIL_PRESETS = {
  gmail: { label: 'Gmail (recomendado)', host: 'smtp.gmail.com', port: 465 },
  outlook: { label: 'Outlook / Hotmail', host: 'smtp-mail.outlook.com', port: 587 },
  yahoo: { label: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 465 },
  icloud: { label: 'iCloud', host: 'smtp.mail.me.com', port: 587 },
} as const;
export type MailPreset = keyof typeof MAIL_PRESETS;
