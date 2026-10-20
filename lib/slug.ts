/** Códigos de gimnasio: la parte de la URL tras el dominio (opengym.vercel.app/<código>). */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

// Rutas de la plataforma y palabras que confundirían o suplantarían
export const RESERVED_SLUGS = new Set([
  'api', 'admin', 'login', 'logout', 'registro', 'signup', 'superadmin', 'crear-gimnasio', 'verificar', 'legal', 'privacidad',
  'terminos', 'opengym', 'open-gym', 'app', 'www', 'static', 'assets', 'public', 'soporte', 'ayuda', 'help', 'docs', 'blog',
  'status', 'coach', 'me', 'present', 'recuperar', 'restablecer', 'icon', 'favicon', 'robots', 'sitemap', 'test', 'demo', 'null', 'undefined',
]);

export function slugify(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/g, '');
}

/** Devuelve el motivo del rechazo o null si el formato es válido. */
export function validateSlug(slug: string): string | null {
  if (slug.length < 2) return 'El código debe tener al menos 2 caracteres.';
  if (slug.length > 30) return 'El código admite como máximo 30 caracteres.';
  if (!SLUG_RE.test(slug)) return 'Usa solo letras minúsculas, números y guiones (sin empezar ni acabar en guion).';
  if (RESERVED_SLUGS.has(slug)) return 'Ese código está reservado. Elige otro.';
  return null;
}
