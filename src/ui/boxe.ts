import { PROGRAMMES_DEPART, type ProgrammeBoxe, type ReglagesBoxe, type ReglagesIntervalles, type RondeBoxe } from '../donnees/boxe';
import type { Profil } from '../donnees/types';
import { PREPARATION_SEC, conseillerBoxe, dernierSupport, reglagesIntervallesValides, reglagesValides, type ConseilBoxe } from '../moteur/boxe';
import { calculerPreparation } from './preparation';
import type { Donnees } from '../donnees/types';

/** Séries de l'utilisateur, ou celles de départ tant qu'il n'a rien composé. */
export function programmesDe(profil: Profil): ProgrammeBoxe[] {
  const perso = profil.boxe?.programmes;
  return perso && perso.length > 0 ? perso : PROGRAMMES_DEPART;
}

export function reglagesDe(profil: Profil): ReglagesBoxe {
  return reglagesValides(profil.boxe?.reglages);
}

/** La série choisie dans les réglages, sinon la première. */
export function programmeChoisi(profil: Profil): ProgrammeBoxe {
  const tous = programmesDe(profil);
  return tous.find((p) => p.id === reglagesDe(profil).programmeId) ?? tous[0]!;
}

export function intervallesDe(profil: Profil): ReglagesIntervalles {
  return reglagesIntervallesValides(profil.boxe?.intervalles);
}

export function avecIntervalles(profil: Profil, partiel: Partial<ReglagesIntervalles>): Profil {
  return { ...profil, boxe: { ...profil.boxe, intervalles: { ...profil.boxe?.intervalles, ...partiel } } };
}

export function avecProgrammes(profil: Profil, programmes: ProgrammeBoxe[]): Profil {
  return { ...profil, boxe: { ...profil.boxe, programmes } };
}

export function avecReglages(profil: Profil, partiel: Partial<ReglagesBoxe>): Profil {
  return { ...profil, boxe: { ...profil.boxe, reglages: { ...profil.boxe?.reglages, ...partiel } } };
}

export const rondeVide = (): RondeBoxe => ({ combos: [[], []], enchainer: true });

export function nouveauProgramme(nom: string, maintenant: Date): ProgrammeBoxe {
  return { id: `boxe-${maintenant.getTime().toString(36)}`, nom: nom.trim() || 'Ma série', rondes: [rondeVide()] };
}

/** Copie d'une série (nouvel identifiant, nom « … (copie) »). */
export function copierProgramme(p: ProgrammeBoxe, maintenant: Date): ProgrammeBoxe {
  return {
    id: `boxe-${maintenant.getTime().toString(36)}`,
    nom: `${p.nom} (copie)`,
    rondes: p.rondes.map((r) => ({ enchainer: r.enchainer, combos: r.combos.map((c) => [...c]) })),
  };
}

export type PhaseBoxe =
  | { genre: 'repos'; ronde: number; duree: number }
  | { genre: 'ronde'; ronde: number; duree: number };

/**
 * Déroulé d'une séance : un repos puis une ronde, pour chaque ronde. Pas de repos après la dernière.
 * Avant la toute première ronde, c'est une préparation plus courte que le repos entre les rondes.
 */
export function phasesDeSeance(programme: ProgrammeBoxe, reglages: ReglagesBoxe): PhaseBoxe[] {
  const phases = programme.rondes.flatMap((r, i): PhaseBoxe[] =>
    r.combos.some((c) => c.length > 0)
      ? [{ genre: 'repos', ronde: i, duree: reglages.reposSec }, { genre: 'ronde', ronde: i, duree: reglages.dureeRondeSec }]
      : [],
  );
  if (phases[0]) phases[0] = { ...phases[0], duree: Math.min(phases[0].duree, PREPARATION_SEC) };
  return phases;
}

/** Durée totale en secondes, repos compris. */
export const dureeTotale = (phases: PhaseBoxe[]): number => phases.reduce((s, p) => s + p.duree, 0);

/**
 * Instant (en secondes depuis le début du repos) où la voix nomme le premier combo, juste avant le compte à
 * rebours de 3 s. Durée de lecture estimée : 1,5 s + 0,8 s par coup (hypothèse). Jamais avant 3 s, pour laisser
 * finir « Repos. Ronde n sur N ».
 */
export function momentAnnonceCombo(reposSec: number, nbCoups: number): number {
  const lecture = 1.5 + 0.8 * nbCoups;
  return Math.max(3, reposSec - 3 - lecture - 0.5);
}

/**
 * Vitesse de la voix : les coups suivent le rythme (un peu plus vite quand le rythme est ≤ 1,2 s par coup,
 * hypothèse) ; tout le reste (présentation du combo, repos, compte à rebours) se dit toujours à vitesse normale,
 * pour être bien compris avant de partir.
 */
export function vitesseVoix(tempoSec: number, estUnCoup: boolean): number {
  return estUnCoup && tempoSec <= 1.2 ? 1.2 : 1;
}

/** Conseil de boxe (sac sur socle ou reflex bag), selon la dernière boxe et la forme du jour. */
export function conseilBoxeDuJour(donnees: Donnees, estAujourdhui = true, maintenant: Date = new Date()): ConseilBoxe {
  const allegee = estAujourdhui && calculerPreparation(donnees, maintenant).verdict === 'allegee';
  return conseillerBoxe({ dernierSupport: dernierSupport(donnees.seances), allegee });
}
