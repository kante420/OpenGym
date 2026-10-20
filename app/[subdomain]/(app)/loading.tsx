import { PageSkeleton } from '@/components/ui/primitives';

/**
 * Esqueleto instantáneo: al cambiar de sección dentro del área autenticada, el menú permanece y
 * esto se muestra al momento mientras llegan los datos. También es el <Suspense> que Next exige
 * alrededor de las páginas que leen la sesión.
 */
export default function Loading() {
  return <PageSkeleton />;
}
