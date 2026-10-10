import type { Seance } from '../donnees/types';
import { volumeSeance } from './volume';

export interface FaitsExercice {
  key: string;
  /** Séries de travail (échauffements exclus). */
  series: number;
  /** Charge réellement montée (dernière série de travail). */
  chargeFaite: number;
  /** Charge qui était prévue, si on la connaît. */
  chargePrevue?: number;
  /** Plus ou moins lourd que prévu ; null si identique ou inconnu. */
  sens: 'plus' | 'moins' | null;
  /** Répétitions réalisées moins répétitions prévues, séries cumulées. */
  ecartReps: number;
  /** Vrai si le prévu était enregistré et peut être comparé. */
  comparable: boolean;
}

export interface FaitsSeance {
  exercices: FaitsExercice[];
  /** Séries de travail de toute la séance. */
  series: number;
  volume: number;
  volumePrecedent: number | null;
  /** Comparaison sobre au volume de la séance précédente du même type (marge de 5 % pour « pareil »). */
  tendanceVolume: 'plus' | 'pareil' | 'moins' | null;
}

const MARGE_PAREIL = 0.05; // hypothèse de présentation : en dessous de 5 % d'écart, on dit « à peu près pareil »
const EPSILON = 0.05;

/** Les faits d'une séance de force : ce qui a été fait, comparé à ce qui était prévu et à la fois précédente. Aucun jugement. */
export function analyserSeance(
  seance: Seance,
  precedente: Seance | null,
  deuxHalteres: (cleExercice: string) => boolean,
): FaitsSeance {
  const exercices: FaitsExercice[] = seance.exercises
    .map((e) => {
      const travail = e.sets.filter((x) => x.type !== 'warmup');
      if (travail.length === 0) return null;
      const comparables = travail.filter((x) => x.repsPrevus !== undefined && x.wPrevu !== undefined);
      const derniere = travail[travail.length - 1]!;
      const chargePrevue = comparables.length ? comparables[comparables.length - 1]!.wPrevu : undefined;
      const sens: FaitsExercice['sens'] =
        chargePrevue === undefined || Math.abs(derniere.w - chargePrevue) < EPSILON ? null : derniere.w > chargePrevue ? 'plus' : 'moins';
      const fait: FaitsExercice = {
        key: e.key,
        series: travail.length,
        chargeFaite: derniere.w,
        sens,
        ecartReps: comparables.reduce((n, x) => n + (x.reps - x.repsPrevus!), 0),
        comparable: comparables.length > 0,
      };
      if (chargePrevue !== undefined) fait.chargePrevue = chargePrevue;
      return fait;
    })
    .filter((e): e is FaitsExercice => e !== null);

  const volume = volumeSeance(seance, deuxHalteres);
  const volumePrecedent = precedente ? volumeSeance(precedente, deuxHalteres) : null;
  let tendanceVolume: FaitsSeance['tendanceVolume'] = null;
  if (volumePrecedent !== null && volumePrecedent > 0) {
    const ecart = (volume - volumePrecedent) / volumePrecedent;
    tendanceVolume = Math.abs(ecart) <= MARGE_PAREIL ? 'pareil' : ecart > 0 ? 'plus' : 'moins';
  }

  return { exercices, series: exercices.reduce((n, e) => n + e.series, 0), volume, volumePrecedent, tendanceVolume };
}
