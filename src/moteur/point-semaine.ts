import type { GenreSeance, Jour, Seance } from '../donnees/types';
import { ajouterJours, joursEntre, jourDe, lundiDeLaSemaine } from './utilitaires';

/**
 * Le point de la semaine, et ce que fait une interruption.
 *
 * Les seuils en jours sont des ESTIMATIONS tirées d'études (voir docs/recherche/arret-et-dose-minimale.md et
 * docs/regles-moteur.md §25) : jamais des mesures sur l'utilisateur. Le moteur renvoie des faits et des
 * identifiants ; les phrases sont écrites dans `src/coach/point-semaine.ts`.
 */

/** Jours depuis la dernière séance (0 = aujourd'hui), ou `null` s'il n'y en a aucune. */
export function joursSansSeance(seances: { date: string }[], aujourdhui: Jour): number | null {
  if (seances.length === 0) return null;
  const derniere = seances.map((s) => jourDe(s.date)).sort().pop()!;
  return Math.max(0, joursEntre(derniere, aujourdhui));
}

export type PalierArret = 'normal' | 'debut' | 'leger' | 'net';

/**
 * Hypothèse §25 : jusqu'à 7 jours, un repos ordinaire ; de 8 à 14 jours, le début (premières baisses cardio
 * discrètes, l'habitude s'effrite) ; de 15 à 28 jours, un arrêt « de courte durée » (4 semaines ou moins,
 * classement de Mujika et Padilla) ; au-delà, un arrêt « de longue durée ».
 */
export function palierArret(jours: number): PalierArret {
  if (jours <= 7) return 'normal';
  if (jours <= 14) return 'debut';
  if (jours <= 28) return 'leger';
  return 'net';
}

export interface Projection {
  /** Combien de jours de plus sans séance. */
  dansJours: number;
  /** Total de jours sans séance à ce moment-là. */
  jours: number;
  palier: PalierArret;
}

/** « Si tu continues encore quelques jours » : où on en serait. */
export function projeter(jours: number, plus: number[] = [3, 7]): Projection[] {
  return plus.map((dansJours) => ({ dansJours, jours: jours + dansJours, palier: palierArret(jours + dansJours) }));
}

export type StatutSemaine = 'aucune' | 'mouvement' | 'maintien' | 'progression';

export interface PointSemaine {
  lundi: Jour;
  dimanche: Jour;
  /** La semaine n'est pas terminée. */
  enCours: boolean;
  nbSeances: number;
  minutes: number;
  /** Jours distincts avec au moins une séance. */
  joursActifs: number;
  seancesForce: number;
  parType: Partial<Record<GenreSeance, number>>;
  /** R-40 : au moins 3 séances, de n'importe quel type. */
  semaineReussie: boolean;
  /**
   * Hypothèse §25 : `aucune` (rien) ; `mouvement` (de l'activité mais pas de force) ; `maintien` (1 séance de
   * force : suffit à garder sa force, Spiering 2021) ; `progression` (2 séances de force ou plus, R-11).
   */
  statut: StatutSemaine;
}

/** Lundi de la semaine qu'on veut regarder : la semaine en cours, ou la dernière semaine terminée. */
export function lundiDuPoint(aujourdhui: Jour, quelle: 'courante' | 'precedente'): Jour {
  const courant = lundiDeLaSemaine(aujourdhui);
  return quelle === 'courante' ? courant : ajouterJours(courant, -7);
}

export function pointDeLaSemaine(seances: Seance[], lundi: Jour, aujourdhui: Jour): PointSemaine {
  const dimanche = ajouterJours(lundi, 6);
  const semaine = seances.filter((s) => {
    const j = jourDe(s.date);
    return j >= lundi && j <= dimanche;
  });
  const parType: Partial<Record<GenreSeance, number>> = {};
  for (const s of semaine) parType[s.kind] = (parType[s.kind] ?? 0) + 1;
  const seancesForce = parType.strength ?? 0;
  const statut: StatutSemaine = semaine.length === 0 ? 'aucune' : seancesForce >= 2 ? 'progression' : seancesForce === 1 ? 'maintien' : 'mouvement';
  return {
    lundi,
    dimanche,
    enCours: aujourdhui <= dimanche,
    nbSeances: semaine.length,
    minutes: semaine.reduce((n, s) => n + (s.durationMin ?? 0), 0),
    joursActifs: new Set(semaine.map((s) => jourDe(s.date))).size,
    seancesForce,
    parType,
    semaineReussie: semaine.length >= 3,
    statut,
  };
}

export type Objectif = 'perte' | 'muscle' | 'mixte' | undefined;

export interface OptionSecours {
  id: 'force-minimale' | 'intensif-court' | 'cardio-court' | 'mini-dose';
  /** Durée proposée, en minutes (hypothèse §25). */
  dureeMin: number;
}

/**
 * Quand on ne peut pas faire la séance prévue : des façons de faire moins, de la plus utile à la plus courte.
 * - Muscle (et objectif non précisé) : force minimale d'abord, c'est elle qui garde le muscle.
 * - Perte de poids : l'intensif court d'abord, la force reste proposée (elle protège le muscle pendant un déficit).
 * - **Intensif court** (R-82) : pas proposé quand la préparation du jour est allégée (prudence par défaut).
 * - La mini-dose est toujours la dernière et la plus courte.
 */
export function optionsDeSecours(objectif: Objectif, contexte: { allegee: boolean } = { allegee: false }): OptionSecours[] {
  const force: OptionSecours = { id: 'force-minimale', dureeMin: 15 };
  const intensif: OptionSecours = { id: 'intensif-court', dureeMin: 12 };
  const cardio: OptionSecours = { id: 'cardio-court', dureeMin: 12 };
  const mini: OptionSecours = { id: 'mini-dose', dureeMin: 5 };
  if (contexte.allegee) return objectif === 'perte' ? [cardio, force, mini] : [force, cardio, mini];
  return objectif === 'perte' ? [intensif, cardio, force, mini] : [force, intensif, cardio, mini];
}
