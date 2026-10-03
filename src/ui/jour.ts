import type { Jour } from '../donnees/types';

/** Jour local de l'appareil au format 'AAAA-MM-JJ'. */
export function jourLocal(d: Date): Jour {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
