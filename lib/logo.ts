import 'server-only';
import sharp from 'sharp';
import { UserError } from './auth';

export interface ProcessedLogo { type: 'image/png' | 'image/jpeg'; b64: string; width: number; height: number }

const MAX_INPUT = 2 * 1024 * 1024;

/**
 * Valida y normaliza un logo subido: sólo PNG/JPG/WebP (se comprueban los bytes, no la extensión),
 * se descartan metadatos, se reduce a 256 px y se guarda como PNG (o JPEG si pesa demasiado).
 * SVG no se admite a propósito: puede contener scripts.
 */
export async function processLogo(file: File): Promise<ProcessedLogo> {
  if (file.size === 0) throw new UserError('El archivo del logo está vacío.');
  if (file.size > MAX_INPUT) throw new UserError('El logo pesa demasiado (máximo 2 MB).');
  const input = Buffer.from(await file.arrayBuffer());
  const png = input.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpg = input[0] === 0xff && input[1] === 0xd8;
  const webp = input.subarray(0, 4).toString('latin1') === 'RIFF' && input.subarray(8, 12).toString('latin1') === 'WEBP';
  if (!png && !jpg && !webp) throw new UserError('Formato no admitido. Usa una imagen PNG, JPG o WebP.');

  try {
    const base = sharp(input, { limitInputPixels: 24_000_000 }).rotate().resize(256, 256, { fit: 'inside', withoutEnlargement: true });
    let out = await base.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer({ resolveWithObject: true });
    let type: ProcessedLogo['type'] = 'image/png';
    if (out.data.length > 100_000) {
      out = await base.clone().flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer({ resolveWithObject: true });
      type = 'image/jpeg';
    }
    return { type, b64: out.data.toString('base64'), width: out.info.width, height: out.info.height };
  } catch {
    throw new UserError('No se pudo leer la imagen. Prueba con otro archivo.');
  }
}
