import type { Combo, Garde, ReglagesBoxe, ReglagesIntervalles, RondeBoxe, SupportBoxe } from '../donnees/boxe';

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
/** Repos avant une ronde, en secondes. Défaut de 60 s : les sources parlent de 1 à 2 min entre des rondes intenses. */
export const REPOS: Plage = { min: 10, max: 120, defaut: 60, pas: 5 };
/** Préparation avant la toute première ronde, en secondes (plus courte que le repos entre rondes). */
export const PREPARATION_SEC = 30;

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
    sourceVoix: brut?.sourceVoix === 'iphone' ? 'iphone' : 'enregistree',
    progressif: brut?.progressif !== false,
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

/** Durée conseillée au reflex bag mural, à ton propre rythme (hypothèse, voir docs/regles-moteur.md §20). */
export const DUREE_MURAL_MIN = 15;
/** Même chose quand la préparation du jour est allégée (hypothèse). */
export const DUREE_MURAL_ALLEGEE_MIN = 10;

export interface ConseilBoxe {
  support: SupportBoxe;
  /** Durée conseillée, pour le reflex bag (la série guidée a ses propres rondes). */
  dureeMin?: number;
  raison: string;
  regle: 'R-64';
}

/** Dernier support utilisé en boxe, parmi des séances triées dans n'importe quel ordre. */
export function dernierSupport(seances: { kind: string; date: string; support?: SupportBoxe }[]): SupportBoxe | undefined {
  return seances
    .filter((s) => s.kind === 'box' && s.support)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.support;
}

/**
 * R-64 (hypothèse) : conseille le sac sur socle (plus physique : puissance, cardio plus intense, série guidée)
 * ou le reflex bag mural (plus léger : vitesse, synchronisation, durée à son rythme). On alterne pour que les deux
 * se complètent ; si la préparation du jour est allégée, on reste sur le plus léger (prudence par défaut).
 */
export function conseillerBoxe(e: { dernierSupport?: SupportBoxe; allegee: boolean }): ConseilBoxe {
  if (e.allegee) {
    return {
      support: 'mural',
      dureeMin: DUREE_MURAL_ALLEGEE_MIN,
      raison: "Ta forme du jour est basse : le reflex bag mural est plus léger pour le corps, et tu gardes la vitesse et la synchronisation.",
      regle: 'R-64',
    };
  }
  if (e.dernierSupport === 'socle') {
    return {
      support: 'mural',
      dureeMin: DUREE_MURAL_MIN,
      raison: "Ta dernière boxe était sur le sac sur socle : le reflex bag mural complète, avec de la vitesse et de la synchronisation, pour un cardio plus léger.",
      regle: 'R-64',
    };
  }
  if (e.dernierSupport === 'mural') {
    return {
      support: 'socle',
      raison: "Ta dernière boxe était au reflex bag : le sac sur socle complète, avec plus de puissance et un travail plus physique, en série guidée.",
      regle: 'R-64',
    };
  }
  return { support: 'socle', raison: 'Pour commencer, le sac sur socle avec ta série guidée.', regle: 'R-64' };
}

/**
 * Fréquences de coups mesurées chez 9 boxeurs amateurs expérimentés (Arseneau, 2011, Université de Montréal) :
 * environ 35 coups par minute en combat (sparring) et 61 aux paos ; au sac, 71 en séance libre.
 * Ce sont des repères pour situer son rythme, pas des objectifs.
 */
export const REPERES_COUPS_PAR_MIN = { combat: 35, paos: 61, sacLibre: 71 } as const;

/** Coups par minute pour un rythme donné (secondes entre deux coups). */
export const coupsParMinute = (tempoSec: number): number => Math.round(60 / tempoSec);

/**
 * Montée en intensité (hypothèse) : la première ronde est plus lente (×1,25), la deuxième un peu (×1,1), puis le
 * rythme choisi. Raison : on démarre lentement et on monte quand la technique est sûre (Capello) ; la fréquence
 * cardiaque augmente de ronde en ronde à rythme égal (Arseneau). Sans effet sous 3 rondes.
 */
export const FACTEURS_MONTEE = [1.25, 1.1] as const;

export function tempoDeLaRonde(base: number, indiceRonde: number, nbRondes: number, progressif: boolean): number {
  const facteur = progressif && nbRondes >= 3 ? FACTEURS_MONTEE[indiceRonde] ?? 1 : 1;
  const t = Math.round(base * facteur * 10) / 10;
  return Math.min(TEMPO.max, Math.max(TEMPO.min, t));
}

// ---- Intervalles (reflex bag) ----

/**
 * Plages des intervalles. Source : Capello (fiche NSCA), circuit au sac : 20 à 30 s d'effort, 10 à 15 s de repos,
 * 2 min entre les séries. Les plages et les valeurs par défaut (20 s / 10 s, 8 répétitions, 2 blocs) sont des
 * hypothèses : à ajuster à l'usage.
 */
export const INTERVALLES: Record<'effort' | 'repos' | 'repetitions' | 'blocs', Plage> = {
  effort: { min: 15, max: 30, defaut: 20, pas: 5 },
  repos: { min: 10, max: 30, defaut: 10, pas: 5 },
  repetitions: { min: 4, max: 12, defaut: 8, pas: 2 },
  blocs: { min: 1, max: 4, defaut: 2, pas: 1 },
};
/** Pause entre deux blocs, en secondes (2 min dans la source). */
export const PAUSE_ENTRE_BLOCS_SEC = 120;

export function reglagesIntervallesValides(brut: Partial<ReglagesIntervalles> | undefined): ReglagesIntervalles {
  return {
    effortSec: Math.round(borner(brut?.effortSec, INTERVALLES.effort)),
    reposSec: Math.round(borner(brut?.reposSec, INTERVALLES.repos)),
    repetitions: Math.round(borner(brut?.repetitions, INTERVALLES.repetitions)),
    blocs: Math.round(borner(brut?.blocs, INTERVALLES.blocs)),
  };
}

export interface PhaseIntervalle {
  genre: 'effort' | 'repos' | 'pause';
  duree: number;
  /** Numéro du bloc et de la répétition, à partir de 1. */
  bloc: number;
  repetition: number;
}

/** Efforts et repos à la suite ; une pause entre les blocs ; pas de repos après le tout dernier effort. */
export function phasesIntervalles(c: ReglagesIntervalles): PhaseIntervalle[] {
  const phases: PhaseIntervalle[] = [];
  for (let bloc = 1; bloc <= c.blocs; bloc++) {
    for (let rep = 1; rep <= c.repetitions; rep++) {
      phases.push({ genre: 'effort', duree: c.effortSec, bloc, repetition: rep });
      if (rep < c.repetitions) phases.push({ genre: 'repos', duree: c.reposSec, bloc, repetition: rep });
    }
    if (bloc < c.blocs) phases.push({ genre: 'pause', duree: PAUSE_ENTRE_BLOCS_SEC, bloc, repetition: c.repetitions });
  }
  return phases;
}

export const dureeIntervalles = (phases: PhaseIntervalle[]): number => phases.reduce((s, p) => s + p.duree, 0);
