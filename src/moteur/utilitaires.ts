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

export function ajouterJours(jour: Jour, n: number): Jour {
  const [an, mois, j] = jour.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(an, mois - 1, j + n)).toISOString().slice(0, 10);
}

/** Lundi de la semaine du jour donné (semaines du lundi au dimanche). */
export function lundiDeLaSemaine(jour: Jour): Jour {
  const [an, mois, j] = jour.split('-').map(Number) as [number, number, number];
  const jourSemaine = new Date(Date.UTC(an, mois - 1, j)).getUTCDay(); // 0 = dimanche
  return ajouterJours(jour, -((jourSemaine + 6) % 7));
}
