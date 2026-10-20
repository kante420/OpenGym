'use client';
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="display text-5xl">Algo ha fallado</h1>
      <p className="max-w-sm text-sm text-muted">No hemos podido cargar esta pantalla. Prueba de nuevo; si sigue ocurriendo, avisa a recepción.</p>
      <button onClick={reset} className="btn btn-primary">Reintentar</button>
    </main>
  );
}
