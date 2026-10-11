import { PROGRAMMES_DEPART, type ProgrammeBoxe, type ReglagesBoxe, type RondeBoxe } from '../donnees/boxe';
import type { Profil } from '../donnees/types';
import { reglagesValides } from '../moteur/boxe';

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

/** Déroulé d'une séance : un repos puis une ronde, pour chaque ronde. Pas de repos après la dernière. */
export function phasesDeSeance(programme: ProgrammeBoxe, reglages: ReglagesBoxe): PhaseBoxe[] {
  return programme.rondes.flatMap((r, i): PhaseBoxe[] =>
    r.combos.some((c) => c.length > 0)
      ? [{ genre: 'repos', ronde: i, duree: reglages.reposSec }, { genre: 'ronde', ronde: i, duree: reglages.dureeRondeSec }]
      : [],
  );
}

/** Durée totale en secondes, repos compris. */
export const dureeTotale = (phases: PhaseBoxe[]): number => phases.reduce((s, p) => s + p.duree, 0);
