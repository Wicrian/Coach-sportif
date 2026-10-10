import type { GenreSeance, Seance } from '../../donnees/types';
import { appliquerDetails, type Details } from '../details';

/** Types de séances qu'on lance dans l'app sans exercices à saisir. */
export type GenreLibre = Extract<GenreSeance, 'box' | 'walk' | 'mob' | 'cardio'>;

export interface BrouillonLibre {
  kind: GenreLibre;
  /** Début, date ISO. */
  debut: string;
}

export function demarrerLibre(kind: GenreLibre, maintenant: Date): BrouillonLibre {
  return { kind, debut: maintenant.toISOString() };
}

export function terminerLibre(b: BrouillonLibre, feel: number | undefined, maintenant: Date, details: Details = {}): Seance {
  const debut = new Date(b.debut).getTime();
  const seance: Seance = {
    id: `libre-${debut.toString(36)}`,
    date: b.debut,
    kind: b.kind,
    durationMin: Math.max(1, Math.round((maintenant.getTime() - debut) / 60_000)),
    exercises: [],
  };
  if (feel !== undefined) seance.feel = feel;
  return appliquerDetails(seance, details);
}
