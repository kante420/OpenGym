import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/figtree';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700-italic.css';
import '@fontsource/barlow-condensed/800-italic.css';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: { default: 'OpenGym · Gestión gratuita para gimnasios', template: '%s · OpenGym' },
  description: 'Crea tu gimnasio gratis: socios, cobros con IVA, horarios, rutinas y progreso, en un enlace propio.',
};

export const viewport: Viewport = { themeColor: '#1a1814', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
