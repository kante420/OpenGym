'use client';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return <button className="btn btn-ghost no-print" onClick={() => window.print()}><Printer className="size-4" />Imprimir</button>;
}
