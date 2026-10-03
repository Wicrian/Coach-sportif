/**
 * Double progression (R-20 à R-27), contrainte par le matériel réel.
 * Fonction pure : elle reçoit l'historique et les charges possibles, elle renvoie
 * une proposition expliquée.
 */

export type ActionProgression =
  | 'demarrer'
  | 'monter'
  | 'lisser'
  | 'consolider'
  | 'reps'
  | 'variante'
  | 'limite-materiel';

export interface PropositionProgression {
  action: ActionProgression;
  /** Charge à prendre (kg). 0 pour le poids du corps. */
  charge: number;
  /** Reps visées par série. */
  reps: number;
  /** Leviers de progression proposés quand la charge ne monte pas. */
  leviers?: string[];
  /** R-27 : vrai seulement quand charge max atteinte ET variantes déjà proposées. */
  suggestionAchat?: boolean;
  regles: string[];
  raison: string;
}

export interface EntreeProgression {
  cibleReps: number;
  poidsDuCorps: boolean;
  /** Séries de travail de la dernière fois (échauffements exclus). null = jamais fait. */
  derniere: { charge: number; reps: number[] } | null;
  /** Charges réalisables, triées (voir materiel.ts). */
  chargesDisponibles: number[];
  /** Charge conseillée pour une première fois. */
  chargeInitiale?: number;
  /** Nombre de séances déjà passées à lisser avant de monter (R-23). */
  seancesLissage?: number;
  /** R-25 : l'utilisateur a refusé une montée (« trop de changements », « pas motivé »). */
  refus?: { chargePrecedente: number; seancesDepuis: number };
  /** R-27 : les variantes sans achat ont déjà été proposées. */
  variantesDejaProposees?: boolean;
}

const SAUT_MAX = 0.25; // R-23 (hypothèse)
const SEANCES_LISSAGE = 2; // R-23
const SEANCES_APRES_REFUS = 2; // R-25
const PLAFOND_REPS_POIDS_DU_CORPS = 20; // R-24 (hypothèse)
const EPSILON = 0.05; // tolérance de comparaison de charges (kg)

const kg = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

export function proposerProgression(e: EntreeProgression): PropositionProgression {
  const { cibleReps: cible } = e;

  if (!e.derniere) {
    const charge = e.poidsDuCorps ? 0 : chargeDeDepart(e.chargesDisponibles, e.chargeInitiale);
    return {
      action: 'demarrer',
      charge,
      reps: cible,
      regles: ['R-22'],
      raison: e.poidsDuCorps
        ? 'Première fois sur cet exercice : on commence au poids du corps.'
        : `Première fois sur cet exercice : on part sur ${kg(charge)} kg, une charge confortable que tu as vraiment.`,
    };
  }

  const { charge, reps } = e.derniere;
  const mini = Math.min(...reps);
  const description = reps.join(' / ') + (e.poidsDuCorps ? ' reps' : ` reps à ${kg(charge)} kg`);

  if (e.poidsDuCorps) return progressionPoidsDuCorps(cible, mini, description);

  // R-25 : après un refus, on reste à la charge précédente le temps de souffler.
  if (e.refus && e.refus.seancesDepuis < SEANCES_APRES_REFUS) {
    return {
      action: 'consolider',
      charge: e.refus.chargePrecedente,
      reps: Math.min(mini + 1, cible + 1),
      regles: ['R-25'],
      raison: `Tu as trouvé la dernière montée trop rapide : on reste à ${kg(e.refus.chargePrecedente)} kg encore un peu, sans pression.`,
    };
  }

  // R-20 : toutes les séries de travail au-dessus de la cible d'au moins 1 rep ?
  if (mini < cible + 1) {
    return {
      action: 'consolider',
      charge,
      reps: Math.min(mini + 1, cible + 1),
      regles: ['R-20'],
      raison: `La dernière fois : ${description}. On consolide avant de monter.`,
    };
  }

  const suivante = e.chargesDisponibles.find((c) => c > charge + EPSILON);

  // R-27 : plus de charge disponible → variantes d'abord, achat en dernier recours.
  if (suivante === undefined) {
    const achat = e.variantesDejaProposees === true;
    return {
      action: 'limite-materiel',
      charge,
      reps: cible + 2,
      leviers: ['unilateral', 'tempo', 'reps'],
      suggestionAchat: achat,
      regles: ['R-20', 'R-27'],
      raison: achat
        ? `Tu es à ${kg(charge)} kg, le maximum de tes haltères, et les variantes ont déjà servi : si tu veux continuer à progresser, un modèle plus lourd peut valoir le coup.`
        : `Tu es à ${kg(charge)} kg, le maximum de tes haltères. Avant tout achat, on peut progresser par une variante à une jambe ou un bras, un tempo plus lent ou plus de reps.`,
    };
  }

  const saut = (suivante - charge) / charge;
  const lissees = e.seancesLissage ?? 0;

  // R-23 : saut trop brutal → on lisse d'abord par les reps, le tempo, le repos.
  if (saut > SAUT_MAX + 1e-9 && lissees < SEANCES_LISSAGE) {
    return {
      action: 'lisser',
      charge,
      reps: cible + 2,
      leviers: ['reps', 'tempo', 'repos'],
      regles: ['R-20', 'R-22', 'R-23'],
      raison: `La dernière fois : ${description}. Le prochain palier (${kg(suivante)} kg) est un grand saut : on reste à ${kg(charge)} kg avec plus de reps ou un tempo plus lent pendant ${SEANCES_LISSAGE} séances, puis on tente.`,
    };
  }

  return {
    action: 'monter',
    charge: suivante,
    reps: cible,
    regles: saut > SAUT_MAX + 1e-9 ? ['R-20', 'R-22', 'R-23'] : ['R-20', 'R-22'],
    raison: `La dernière fois : ${description}. Tout passe au-dessus de la cible : tu peux tenter ${kg(suivante)} kg.`,
  };
}

/** R-22 (première fois) : la plus grande charge disponible ≤ charge conseillée, sinon la plus légère. */
function chargeDeDepart(charges: number[], conseillee: number | undefined): number {
  if (charges.length === 0) return 0;
  if (conseillee === undefined) return charges[0]!;
  const ok = charges.filter((c) => c <= conseillee + EPSILON);
  return ok.length ? ok[ok.length - 1]! : charges[0]!;
}

/** R-24 : poids du corps. */
function progressionPoidsDuCorps(cible: number, mini: number, description: string): PropositionProgression {
  if (mini >= cible + 2) {
    const visees = mini + 1;
    if (visees > PLAFOND_REPS_POIDS_DU_CORPS) {
      return {
        action: 'variante',
        charge: 0,
        reps: cible,
        regles: ['R-24'],
        raison: `La dernière fois : ${description}. Tu maîtrises cet exercice : c'est le moment de passer à une variante plus difficile.`,
      };
    }
    return {
      action: 'reps',
      charge: 0,
      reps: visees,
      regles: ['R-24'],
      raison: `La dernière fois : ${description}. On peut viser une rep de plus par série.`,
    };
  }
  return {
    action: 'consolider',
    charge: 0,
    reps: Math.min(mini + 1, cible + 1),
    regles: ['R-24'],
    raison: `La dernière fois : ${description}. On consolide avant d'ajouter des reps.`,
  };
}
