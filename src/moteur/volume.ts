import type { Seance, Serie } from '../donnees/types';

/** Volume d'une série : charge × reps (× 2 avec deux haltères). Échauffements exclus. */
export function volumeSerie(serie: Serie, deuxHalteres: boolean): number {
  if (serie.type === 'warmup') return 0;
  return serie.w * serie.reps * (deuxHalteres ? 2 : 1);
}

export function volumeSeance(seance: Seance, deuxHalteres: (cleExercice: string) => boolean): number {
  if (seance.kind !== 'strength') return 0;
  return seance.exercises.reduce((total, e) => total + e.sets.reduce((t, s) => t + volumeSerie(s, deuxHalteres(e.key)), 0), 0);
}

/** 1RM estimé (Epley), seulement entre 1 et 10 reps. Usage interne : jamais affiché comme un record spectaculaire. */
export function e1rm(charge: number, reps: number): number | null {
  return charge > 0 && reps >= 1 && reps <= 10 ? charge * (1 + reps / 30) : null;
}
