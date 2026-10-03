/**
 * Prépare la séance du jour : c'est ici (côté interface) qu'on appelle le moteur.
 * Le moteur décide, ce module assemble ses décisions pour l'écran.
 */
import { EXERCICES, type ModeleSeance } from '../../donnees/exercices';
import type { Profil, Seance } from '../../donnees/types';
import { chargesDisponibles, decrireMontage, type DisquesParCote, type ModeCharge } from '../../moteur/materiel';
import { ordonnerParCharge } from '../../moteur/ordre-seance';
import { proposerProgression } from '../../moteur/progression';

export interface SeriePrevue {
  w: number;
  reps: number;
}

export interface ExercicePlan {
  key: string;
  nom: string;
  muscle: string;
  mode: ModeCharge;
  poidsDuCorps: boolean;
  deuxHalteres: boolean;
  reposSec: number;
  series: SeriePrevue[];
  raison: string;
  regles: string[];
  /** Disques à mettre de chaque côté ; null si poids du corps ou matériel inconnu. */
  montage: DisquesParCote[] | null;
  chargesDispo: number[];
}

export interface PlanSeance {
  modeleId: string;
  nom: string;
  exercices: ExercicePlan[];
  /** Nombre de changements de charge dans la séance (R-26). */
  changements: number;
  regles: string[];
}

/** Charges réalisables selon le matériel du profil. Sans inventaire, on utilise les anciennes charges fixes. */
export function chargesDuProfil(profil: Profil): { paire: number[]; unique: number[] } {
  if (profil.halteres) {
    return { paire: chargesDisponibles(profil.halteres, 'paire'), unique: chargesDisponibles(profil.halteres, 'unique') };
  }
  return { paire: profil.dumbbells, unique: profil.dumbbells };
}

const recentesD = (seances: Seance[]) =>
  seances.filter((s) => s.kind === 'strength').sort((a, b) => b.date.localeCompare(a.date));

function travail(s: Seance, key: string) {
  const ex = s.exercises.find((e) => e.key === key);
  const sets = ex ? ex.sets.filter((x) => x.type !== 'warmup') : [];
  return sets.length ? sets : null;
}

/** Dernière fois : charge de la dernière série de travail et reps de chaque série. */
function derniere(seances: Seance[], key: string) {
  for (const s of recentesD(seances)) {
    const sets = travail(s, key);
    if (sets) return { charge: sets[sets.length - 1]!.w, reps: sets.map((x) => x.reps) };
  }
  return null;
}

/**
 * R-23 : nombre de séances de lissage déjà faites. Chaque séance récente, à la même charge, où toutes
 * les séries dépassent la cible compte ; la première est celle qui a déclenché le lissage.
 */
export function compterLissage(seances: Seance[], key: string, cibleReps: number): number {
  let reference: number | null = null;
  let n = 0;
  for (const s of recentesD(seances)) {
    const sets = travail(s, key);
    if (!sets) continue;
    const charge = sets[sets.length - 1]!.w;
    if (reference === null) reference = charge;
    if (charge !== reference || Math.min(...sets.map((x) => x.reps)) < cibleReps + 1) break;
    n++;
  }
  return Math.max(0, n - 1);
}

export function preparerSeance(entree: { modele: ModeleSeance; seances: Seance[]; profil: Profil }): PlanSeance {
  const { modele, seances, profil } = entree;
  const charges = chargesDuProfil(profil);

  const exercices: ExercicePlan[] = modele.exercices.map((key) => {
    const e = EXERCICES[key]!;
    const dispo = e.poidsDuCorps ? [] : charges[e.mode];
    const p = proposerProgression({
      cibleReps: e.cibleReps,
      poidsDuCorps: e.poidsDuCorps,
      derniere: derniere(seances, key),
      chargesDisponibles: dispo,
      chargeInitiale: e.chargeInitiale,
      seancesLissage: compterLissage(seances, key, e.cibleReps),
    });
    return {
      key,
      nom: e.nom,
      muscle: e.muscle,
      mode: e.mode,
      poidsDuCorps: e.poidsDuCorps,
      deuxHalteres: e.deuxHalteres,
      reposSec: e.reposSec,
      series: Array.from({ length: modele.series }, () => ({ w: p.charge, reps: p.reps })),
      raison: p.raison,
      regles: p.regles,
      montage: !e.poidsDuCorps && profil.halteres ? decrireMontage(profil.halteres, p.charge, e.mode) : null,
      chargesDispo: dispo,
    };
  });

  // R-26 : regrouper les exercices qui utilisent la même charge.
  const ordre = ordonnerParCharge(exercices.map((e) => ({ key: e.key, charge: e.series[0]!.w })));
  const parCle = new Map(exercices.map((e) => [e.key, e]));
  return {
    modeleId: modele.id,
    nom: modele.nom,
    exercices: ordre.exercices.map((o) => parCle.get(o.key)!),
    changements: ordre.changements,
    regles: ordre.regles,
  };
}
