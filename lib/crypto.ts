import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { UserError } from './auth';

/** Clave de 32 bytes en hexadecimal (64 caracteres) en SECRETS_KEY. Sin ella, no se guarda ningún secreto. */
export const secretsConfigured = () => /^[0-9a-f]{64}$/i.test(process.env.SECRETS_KEY?.trim() ?? '');

function key(): Buffer {
  const hex = process.env.SECRETS_KEY?.trim() ?? '';
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new UserError('El servidor no tiene configurada la clave de cifrado (SECRETS_KEY). Avisa al administrador de la plataforma.');
  return Buffer.from(hex, 'hex');
}

/** AES-256-GCM: confidencialidad + detección de manipulación. Formato v1:iv:tag:datos (base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(blob: string): string {
  const [v, iv, tag, data] = blob.split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Formato de secreto no válido');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}
