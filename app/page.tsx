import Link from 'next/link';
import { CalendarRange, Dumbbell, ShieldCheck, Users, Wallet } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { GymEntry } from './gym-entry';

const FEATURES = [
  { icon: Users, title: 'Socios y accesos', text: 'Altas en segundos, roles de administrador, entrenador y socio, y contraseñas temporales.' },
  { icon: Wallet, title: 'Cobros con IVA', text: 'Cuotas por mes natural, descuentos automáticos, recibos en PDF con IVA y envío por email.' },
  { icon: CalendarRange, title: 'Horario por zonas', text: 'Actividades con aforo y entrenador, y un horario semanal que se genera solo.' },
  { icon: Dumbbell, title: 'Rutinas y progreso', text: 'Diseña la sesión, preséntala en pantalla completa y anota los pesos de cada alumno.' },
];

export default function Landing() {
  return (
    <PublicShell>
      <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.25fr_1fr] lg:py-16">
        <div>
          <h1 className="display text-6xl sm:text-7xl">Tu gimnasio, <span className="text-gold-hi">bajo control</span></h1>
          <p className="mt-5 max-w-xl text-lg text-muted">OpenGym es un sistema de gestión gratuito para centros deportivos. Crea tu gimnasio en un par de minutos y comparte un enlace propio con tu equipo y tus socios.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/crear-gimnasio" className="btn btn-primary btn-lg">Crear gimnasio gratis</Link>
          </div>
          <p className="mt-4 text-sm text-faint">Sin tarjeta · Tus datos están aislados de los de otros gimnasios</p>
        </div>
        <div className="card card-pad">
          <h2 className="display text-2xl">Accede a tu gimnasio</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Escribe el código que te dio tu centro.</p>
          <GymEntry />
        </div>
      </section>

      <section aria-label="Qué incluye" className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <article key={f.title} className="card card-pad">
            <f.icon className="mb-3 size-6 text-gold" aria-hidden />
            <h3 className="display text-2xl">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{f.text}</p>
          </article>
        ))}
      </section>

      <section className="card card-pad mt-6 flex items-start gap-4">
        <ShieldCheck className="mt-1 size-6 shrink-0 text-gold" aria-hidden />
        <div>
          <h3 className="display text-2xl">Cada gimnasio, a su aire y en privado</h3>
          <p className="mt-1.5 text-sm text-muted">Los datos de cada centro están separados por reglas de seguridad en la base de datos: ningún gimnasio puede ver a socios, cobros ni siquiera a otros gimnasios que usen OpenGym.</p>
        </div>
      </section>
    </PublicShell>
  );
}
