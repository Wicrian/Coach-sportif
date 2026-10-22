import type { SupportBoxe } from '../../donnees/boxe';
import type { GenreSeance, Seance } from '../../donnees/types';
import { appliquerDetails, type Details } from '../details';

/** Types de séances qu'on lance dans l'app sans exercices à saisir. */
export type GenreLibre = Extract<GenreSeance, 'box' | 'walk' | 'mob' | 'cardio'>;

export interface BrouillonLibre {
  kind: GenreLibre;
  /** Début, date ISO. */
  debut: string;
  /** Boxe : sur quoi (sac sur socle ou reflex bag mural), s'il est connu. */
  support?: SupportBoxe;
  /** Durée conseillée par le plan, en minutes (reflex bag). */
  dureeConseilleeMin?: number;
  /** Boxe : bloc court et intense au sac sur socle. */
  format?: 'intensif';
}

export interface OptionsLibre {
  support?: SupportBoxe;
  dureeConseilleeMin?: number;
  format?: 'intensif';
}

export function demarrerLibre(kind: GenreLibre, maintenant: Date, options: OptionsLibre = {}): BrouillonLibre {
  const b: BrouillonLibre = { kind, debut: maintenant.toISOString() };
  if (options.support) b.support = options.support;
  if (options.dureeConseilleeMin) b.dureeConseilleeMin = options.dureeConseilleeMin;
  if (options.format) b.format = options.format;
  return b;
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
  if (b.support) seance.support = b.support;
  if (b.format === 'intensif') seance.intensif = true;
  return appliquerDetails(seance, details);
}
