import type { Combo, Garde, ReglagesBoxe, RondeBoxe } from '../donnees/boxe';

/**
 * Boxe guidée : le rythme des annonces vocales.
 *
 * Principe (voulu par l'utilisateur) : la voix dicte chaque coup, et il le frappe au moment où elle le dit.
 * Une ronde se découpe en parts égales, une par combo ; chaque combo se répète pendant sa part. Le dernier
 * combo reprend les précédents bout à bout. Le rythme (secondes par coup) est réglable, mais borné pour
 * rester jouable : on ne peut pas demander 36 jabs à la seconde.
 *
 * Toutes les valeurs chiffrées ci-dessous sont des HYPOTHÈSES à valider à l'usage (voir docs/regles-moteur.md, §20).
 */

export interface Plage { min: number; max: number; defaut: number; pas: number }

/** Secondes entre deux coups annoncés. */
export const TEMPO: Plage = { min: 1.0, max: 3.0, defaut: 1.6, pas: 0.2 };
/** Durée d'une ronde, en secondes. */
export const DUREE_RONDE: Plage = { min: 30, max: 600, defaut: 180, pas: 30 };
/** Repos avant une ronde, en secondes. */
export const REPOS: Plage = { min: 10, max: 120, defaut: 25, pas: 5 };

const EPSILON = 1e-6;

function borner(valeur: unknown, plage: Plage): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return plage.defaut;
  return Math.min(plage.max, Math.max(plage.min, valeur));
}

/** Ramène des réglages (possiblement vides ou hors limites) dans la plage jouable. */
export function reglagesValides(brut: Partial<ReglagesBoxe> | undefined): ReglagesBoxe {
  const garde: Garde = brut?.garde === 'orthodoxe' ? 'orthodoxe' : 'gaucher';
  const r: ReglagesBoxe = {
    dureeRondeSec: borner(brut?.dureeRondeSec, DUREE_RONDE),
    reposSec: borner(brut?.reposSec, REPOS),
    tempoSec: Math.round(borner(brut?.tempoSec, TEMPO) * 10) / 10,
    garde,
  };
  if (brut?.voix) r.voix = brut.voix;
  if (brut?.programmeId) r.programmeId = brut.programmeId;
  return r;
}

/** Les combos réellement joués dans une ronde : ceux de la ronde, plus l'enchaînement s'il est demandé. */
export function combosJoues(ronde: RondeBoxe): Combo[] {
  const combos = ronde.combos.filter((c) => c.length > 0);
  if (ronde.enchainer && combos.length > 1) return [...combos, combos.flat()];
  return combos;
}

export interface SegmentRonde {
  indice: number;
  coups: Combo;
  /** Secondes depuis le début de la ronde. */
  debut: number;
  fin: number;
}

export function segmentsDeRonde(ronde: RondeBoxe, dureeSec: number): SegmentRonde[] {
  const combos = combosJoues(ronde);
  if (combos.length === 0) return [];
  const part = dureeSec / combos.length;
  return combos.map((coups, indice) => ({ indice, coups, debut: indice * part, fin: (indice + 1) * part }));
}

/** Répétitions entières d'un combo : on retire le temps de l'annonce du combo (un « temps »), puis on divise. */
export function repetitionsPossibles(nbCoups: number, dureeSegmentSec: number, tempo: number): number {
  if (nbCoups <= 0) return 0;
  return Math.max(0, Math.floor((dureeSegmentSec - tempo) / (nbCoups * tempo) + EPSILON));
}

export interface ResumeCombo {
  coups: Combo;
  repetitions: number;
}

export function resumeRonde(ronde: RondeBoxe, dureeSec: number, tempo: number): ResumeCombo[] {
  return segmentsDeRonde(ronde, dureeSec).map((s) => ({
    coups: s.coups,
    repetitions: repetitionsPossibles(s.coups.length, s.fin - s.debut, tempo),
  }));
}

export type Annonce =
  | { genre: 'combo'; numero: number; total: number }
  | { genre: 'coup'; coup: string };

/** Où en est la ronde : le segment en cours, le prochain coup à dire et l'instant prévu. */
export interface EtatRonde {
  segment: number;
  coup: number;
  prochain: number;
}

export const etatDepart: EtatRonde = { segment: -1, coup: 0, prochain: 0 };

/**
 * À appeler à chaque tic avec `t` = secondes écoulées depuis le début de la ronde. Renvoie au plus une
 * annonce, et le nouvel état. Le rythme est celui du moment (`tempo`) : un changement s'applique au coup suivant.
 */
export function avancer(
  etat: EtatRonde,
  t: number,
  ronde: RondeBoxe,
  dureeSec: number,
  tempo: number,
): { etat: EtatRonde; annonce: Annonce | null } {
  const segments = segmentsDeRonde(ronde, dureeSec);
  if (segments.length === 0 || t < 0) return { etat, annonce: null };

  const indice = Math.min(segments.length - 1, Math.floor(t / (dureeSec / segments.length) + EPSILON));
  const segment = segments[indice]!;

  if (indice !== etat.segment) {
    return {
      etat: { segment: indice, coup: 0, prochain: t + tempo },
      annonce: { genre: 'combo', numero: indice + 1, total: segments.length },
    };
  }

  if (t + EPSILON < etat.prochain) return { etat, annonce: null };

  // Si on a pris du retard (écran verrouillé…), on repart de maintenant plutôt que de rattraper en rafale.
  const quand = t - etat.prochain > tempo ? t : etat.prochain;
  const n = segment.coups.length;

  // Une nouvelle répétition ne démarre que si elle tient en entier avant la fin du segment.
  if (etat.coup === 0 && segment.fin - quand + EPSILON < n * tempo) {
    return { etat: { ...etat, prochain: Infinity }, annonce: null };
  }

  return {
    etat: { segment: indice, coup: (etat.coup + 1) % n, prochain: quand + tempo },
    annonce: { genre: 'coup', coup: segment.coups[etat.coup]! },
  };
}
