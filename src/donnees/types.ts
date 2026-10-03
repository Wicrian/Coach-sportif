/**
 * Formes de données de l'application.
 * Les noms des champs (hrv, rhr, sleep, weight, energy, sore, feel, kind, tplId…)
 * sont ceux de l'export du prototype : ne pas les renommer sans migration.
 */

/** Jour au format 'AAAA-MM-JJ'. */
export type Jour = string;

export interface MesureRecuperation {
  date: Jour;
  hrv?: number | null;
  rhr?: number | null;
  sleep?: number | null;
  weight?: number | null;
  /** Énergie ressentie, 1 à 5. */
  energy?: number | null;
  /** Courbatures, 1 à 5. */
  sore?: number | null;
}

export type TypeSerie = 'warmup' | 'normal' | 'drop' | 'failure';

export interface Serie {
  type: TypeSerie;
  /** Charge en kg (0 pour le poids du corps). */
  w: number;
  reps: number;
}

export interface ExerciceRealise {
  key: string;
  sets: Serie[];
}

export type GenreSeance = 'strength' | 'walk' | 'mob' | 'box' | 'cardio';

export interface Seance {
  id: string;
  /** Date et heure ISO. */
  date: string;
  kind: GenreSeance;
  tplId?: string;
  /** Ressenti de séance, 1 (Pénible) à 5 (Super). */
  feel?: number;
  durationMin?: number;
  exercises: ExerciceRealise[];
}
