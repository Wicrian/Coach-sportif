export interface ExercicePrevu {
  key: string;
  /** Charge par haltère prévue, en kg. 0 = poids du corps (pas de disques à changer). */
  charge: number;
}

export interface OrdreSeance {
  exercices: ExercicePrevu[];
  /** Nombre de changements de charge entre deux exercices consécutifs (hors poids du corps). */
  changements: number;
  regles: string[];
}

const EPSILON = 0.05;

/**
 * R-26 : à efficacité égale, regrouper les exercices qui utilisent la même charge pour
 * limiter les changements de disques. Chaque charge forme un seul bloc, jamais de va-et-vient.
 * Les blocs suivent l'ordre d'apparition ; les exercices au poids du corps gardent leur place.
 */
export function ordonnerParCharge(exercices: ExercicePrevu[]): OrdreSeance {
  const charges: number[] = [];
  for (const e of exercices) {
    if (e.charge > 0 && !charges.some((c) => Math.abs(c - e.charge) < EPSILON)) charges.push(e.charge);
  }
  const lesses = charges.flatMap((c) => exercices.filter((e) => e.charge > 0 && Math.abs(e.charge - c) < EPSILON));

  // Les emplacements des exercices à charge sont remplis dans l'ordre regroupé.
  let suivant = 0;
  const resultat = exercices.map((e) => (e.charge > 0 ? lesses[suivant++]! : e));

  const chargees = resultat.filter((e) => e.charge > 0);
  let changements = 0;
  for (let i = 1; i < chargees.length; i++) {
    if (Math.abs(chargees[i]!.charge - chargees[i - 1]!.charge) >= EPSILON) changements++;
  }
  return { exercices: resultat, changements, regles: ['R-26'] };
}
