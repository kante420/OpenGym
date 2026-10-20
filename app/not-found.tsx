import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="display text-6xl">404</h1>
      <p className="text-sm text-muted">Esta página no existe.</p>
      <Link href="/" className="btn btn-primary">Ir al inicio</Link>
    </main>
  );
}
