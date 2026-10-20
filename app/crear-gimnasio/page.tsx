import { PublicShell } from '@/components/public-shell';
import { CrearForm } from './crear-form';

export const metadata = { title: 'Crear gimnasio', description: 'Crea tu gimnasio en OpenGym: gratis y en unos minutos.' };

export default function CrearGimnasio() {
  return (
    <PublicShell cta={false}>
      <div className="mx-auto max-w-3xl pt-4">
        <h1 className="display text-5xl sm:text-6xl">Crea tu gimnasio</h1>
        <p className="mb-8 mt-2 text-muted">Rellena los datos, confirma tu email y tu sistema de gestión estará listo. Es gratis y no pedimos tarjeta.</p>
        <CrearForm />
      </div>
    </PublicShell>
  );
}
