import type { GenreSeance, Jour, Seance } from '../donnees/types';

const LIBELLES: Record<GenreSeance, string> = {
  strength: 'Force',
  box: 'Boxe',
  walk: 'Marche',
  mob: 'Mobilité',
  cardio: 'Cardio léger',
};

export const GENRES: GenreSeance[] = ['box', 'walk', 'mob', 'cardio', 'strength'];
export const libelleGenre = (kind: GenreSeance): string => LIBELLES[kind];

/** Séance faite en dehors de l'app (Boxa, Heavybox, marche…). Elle compte comme les autres dans ta semaine. */
export function creerSeanceExterne(
  e: { jour: Jour; kind: GenreSeance; durationMin: number; feel?: number; source?: string },
  maintenant: Date,
): Seance {
  const [an, mois, jour] = e.jour.split('-').map(Number) as [number, number, number];
  const aujourdhui = maintenant.getFullYear() === an && maintenant.getMonth() === mois - 1 && maintenant.getDate() === jour;
  const date = aujourdhui ? maintenant : new Date(an, mois - 1, jour, 12, 0);
  const seance: Seance = { id: `ext-${maintenant.getTime().toString(36)}`, date: date.toISOString(), kind: e.kind, durationMin: e.durationMin, exercises: [] };
  if (e.feel !== undefined) seance.feel = e.feel;
  if (e.source) seance.source = e.source;
  return seance;
}
