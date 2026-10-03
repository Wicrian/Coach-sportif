import type { Jour } from '../donnees/types';

export function moyenne(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
}

/** Écart-type de population (même calcul que le prototype). */
export function ecartType(valeurs: number[]): number | null {
  const m = moyenne(valeurs);
  if (m === null) return null;
  return Math.sqrt(moyenne(valeurs.map((v) => (v - m) ** 2))!);
}

/** Nombre de jours entre deux jours 'AAAA-MM-JJ' (b - a), sans effet de fuseau horaire. */
export function joursEntre(a: Jour, b: Jour): number {
  const t = (j: Jour) => {
    const [an, mois, jour] = j.split('-').map(Number) as [number, number, number];
    return Date.UTC(an, mois - 1, jour);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
}
