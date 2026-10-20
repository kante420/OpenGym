import 'server-only';
import type { Role } from './types';

/** Cada gimnasio vive en /<código>. Se mantiene async por compatibilidad con las llamadas existentes. */
export async function gymBase(subdomain: string): Promise<string> {
  return `/${subdomain}`;
}

export async function gymPath(subdomain: string, path: string): Promise<string> {
  return `/${subdomain}${path}`;
}

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMINISTRADOR: '/admin',
  ENTRENADOR: '/coach',
  CLIENTE: '/me',
};
