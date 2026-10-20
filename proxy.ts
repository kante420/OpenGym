import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** Sólo renueva la sesión de Supabase. La autorización real se verifica en cada página y acción. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Sólo renueva el token si está a punto de caducar (sin llamada de red en el caso normal).
  await supabase.auth.getSession();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.png|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
