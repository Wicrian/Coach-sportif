/** Déroulement d'une séance : fonctions pures qui font avancer le brouillon (séance en cours). */
import type { Serie, Seance, TypeSerie } from '../../donnees/types';
import type { ExercicePlan, PlanSeance } from './preparer';

export type Phase = 'serie' | 'repos' | 'fin';

export interface Brouillon {
  id: string;
  /** Début de séance, date ISO. */
  debut: string;
  modeleId: string;
  nom: string;
  plan: ExercicePlan[];
  /** Position de la série en cours (ou de la prochaine, pendant le repos). */
  ei: number;
  si: number;
  phase: Phase;
  /** Séries réalisées, par exercice (même ordre que le plan). */
  realisees: Serie[][];
}

export interface Saisie {
  reps: number;
  w: number;
}

export function demarrer(plan: PlanSeance, maintenant: Date): Brouillon {
  return {
    id: maintenant.getTime().toString(36),
    debut: maintenant.toISOString(),
    modeleId: plan.modeleId,
    nom: plan.nom,
    plan: plan.exercices.map((e) => ({ ...e, series: e.series.map((s) => ({ ...s })) })),
    ei: 0,
    si: 0,
    phase: 'serie',
    realisees: plan.exercices.map(() => []),
  };
}

/** Reps et charge pré-remplies : le prévu, avec la charge que l'utilisateur vient de choisir sur cet exercice. */
export function saisieInitiale(b: Brouillon): Saisie {
  const prevue = b.plan[b.ei]!.series[b.si]!;
  const derniere = [...b.realisees[b.ei]!].reverse().find((s) => s.type !== 'warmup');
  return { reps: prevue.reps, w: derniere ? derniere.w : prevue.w };
}

/** Enregistre la série. Un échauffement s'ajoute sans consommer une série prévue. */
export function valider(b: Brouillon, saisie: Saisie & { type: TypeSerie }): Brouillon {
  const prevue = b.plan[b.ei]!.series[b.si]!;
  const serie: Serie =
    saisie.type === 'warmup'
      ? { type: 'warmup', w: saisie.w, reps: saisie.reps }
      : { type: saisie.type, w: saisie.w, reps: saisie.reps, wPrevu: prevue.w, repsPrevus: prevue.reps };

  const realisees = b.realisees.map((l, i) => (i === b.ei ? [...l, serie] : l));
  if (saisie.type === 'warmup') return { ...b, realisees, phase: 'repos' };

  const derniereSerie = b.si + 1 >= b.plan[b.ei]!.series.length;
  const dernierExercice = b.ei + 1 >= b.plan.length;
  if (derniereSerie && dernierExercice) return { ...b, realisees, phase: 'fin' };
  return derniereSerie
    ? { ...b, realisees, ei: b.ei + 1, si: 0, phase: 'repos' }
    : { ...b, realisees, si: b.si + 1, phase: 'repos' };
}

export function finDeRepos(b: Brouillon): Brouillon {
  return { ...b, phase: 'serie' };
}

/** Poussée douce (R-36) : une série en plus sur le dernier exercice, avec les mêmes reps et charge. */
export function ajouterSerieBonus(b: Brouillon): Brouillon {
  const e = b.plan[b.ei]!;
  const derniere = e.series[e.series.length - 1]!;
  const plan = b.plan.map((x, i) => (i === b.ei ? { ...x, series: [...x.series, { ...derniere }] } : x));
  return { ...b, plan, si: e.series.length, phase: 'serie' };
}

/** Arrêter ici : on passe directement à la fin de séance, avec ce qui a été fait. */
export function arreter(b: Brouillon): Brouillon {
  return { ...b, phase: 'fin' };
}

/** Transforme le brouillon en séance enregistrable (même format que le prototype). */
export function terminer(b: Brouillon, feel: number | undefined, maintenant: Date): Seance {
  const minutes = Math.max(1, Math.round((maintenant.getTime() - new Date(b.debut).getTime()) / 60_000));
  const seance: Seance = {
    id: b.id,
    date: b.debut,
    kind: 'strength',
    tplId: b.modeleId,
    durationMin: minutes,
    exercises: b.plan.map((e, i) => ({ key: e.key, sets: b.realisees[i]! })).filter((e) => e.sets.length > 0),
  };
  if (feel !== undefined) seance.feel = feel;
  return seance;
}
