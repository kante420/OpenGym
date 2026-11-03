import { connection } from 'next/server';
import { getGymLogoBySlug } from '@/lib/gym-assets';

/** Logo público de un gimnasio (se muestra también en su pantalla de acceso, sin sesión). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const logo = await getGymLogoBySlug(slug.toLowerCase());
  if (!logo) return new Response('No encontrado', { status: 404 });
  return new Response(new Uint8Array(logo.buffer), {
    headers: { 'Content-Type': logo.type, 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', 'X-Content-Type-Options': 'nosniff' },
  });
}
