'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/primitives';

/** La sesión usa almacenamiento local (borrador), por eso se carga sólo en el navegador. */
export const LiveSessionClient = dynamic(() => import('./live-session').then((m) => m.LiveSession), {
  ssr: false,
  loading: () => <div className="space-y-4" aria-busy="true"><Skeleton className="h-12 w-72" /><Skeleton className="h-64" /></div>,
});
