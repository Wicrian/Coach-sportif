import type { Jour, MesureRecuperation, Seance } from '../donnees/types';
import { ecartType, joursEntre, moyenne } from './utilitaires';

export type EtatSignal = 'vert' | 'rouge' | 'inconnu';
export type Verdict = 'normale' | 'vigilance' | 'allegee';

export interface Signal {
  id: 'physio' | 'subjectif' | 'performance';
  nom: string;
  etat: EtatSignal;
  raison: string;
  regles: string[];
}

export interface PreparationDuJour {
  signaux: Signal[];
  rouges: number;
  verdict: Verdict;
  /** Vrai dès qu'au moins un signal est connu. */
  aDesDonnees: boolean;
  explication: string;
  /** Toutes les règles appliquées (signaux + verdict). */
  regles: string[];
}

export interface EntreePreparation {
  recuperation: MesureRecuperation[];
  seances: Seance[];
  aujourdhui: Jour;
  /** Reps ciblées par exercice (clé d'exercice → reps), pour R-04. */
  ciblesReps: Record<string, number>;
}

const MIN_MESURES_HRV = 4; // R-02
const FENETRE_JOURS = 7; // R-01, R-02
const SEUIL_COURBATURES = 4; // R-03 (hypothèse)
const SEUIL_ENERGIE = 2; // R-03 (hypothèse)
const SEUIL_PERFORMANCE = 0.85; // R-04 (hypothèse)

/** R-01 / R-02 : HRV et FC de repos du jour contre les 7 jours précédents. */
function signalPhysio(rec: MesureRecuperation[], aujourdhui: Jour): Signal {
  const base = { id: 'physio' as const, nom: 'Récupération physiologique' };
  const jour = rec.find((r) => r.date === aujourdhui);
  const precedentes = rec.filter((r) => {
    const ecart = joursEntre(r.date, aujourdhui);
    return ecart >= 1 && ecart <= FENETRE_JOURS;
  });
  const hrvHisto = precedentes.map((r) => r.hrv).filter((v): v is number => v != null);

  if (!jour || jour.hrv == null || hrvHisto.length < MIN_MESURES_HRV) {
    return { ...base, etat: 'inconnu', regles: ['R-02'], raison: 'Pas encore assez de mesures de HRV pour juger une tendance : je ne décide jamais sur une lecture isolée.' };
  }

  const hrvBasse = jour.hrv < moyenne(hrvHisto)! - ecartType(hrvHisto)!;
  const rhrHisto = precedentes.map((r) => r.rhr).filter((v): v is number => v != null);
  const rhrUtilisable = jour.rhr != null && rhrHisto.length >= MIN_MESURES_HRV;
  const rhrHaute = rhrUtilisable && jour.rhr! > moyenne(rhrHisto)! + ecartType(rhrHisto)!;

  // FC du jour absente → la HRV seule suffit. FC présente → il faut les deux.
  const rouge = jour.rhr == null ? hrvBasse : hrvBasse && rhrHaute;
  return rouge
    ? { ...base, etat: 'rouge', regles: ['R-01'], raison: jour.rhr == null ? 'Ta HRV est sous ta moyenne récente.' : 'Ta HRV est sous ta moyenne récente et ta FC de repos est élevée.' }
    : { ...base, etat: 'vert', regles: ['R-01'], raison: 'HRV et FC de repos dans ta fourchette habituelle.' };
}

/** R-03 : courbatures ≥ 4/5 ou énergie ≤ 2/5. */
function signalSubjectif(rec: MesureRecuperation[], aujourdhui: Jour): Signal {
  const base = { id: 'subjectif' as const, nom: 'Ressenti' };
  const jour = rec.find((r) => r.date === aujourdhui);
  if (!jour || (jour.sore == null && jour.energy == null)) {
    return { ...base, etat: 'inconnu', regles: ['R-03'], raison: "Pas de check-in aujourd'hui." };
  }
  const rouge = (jour.sore != null && jour.sore >= SEUIL_COURBATURES) || (jour.energy != null && jour.energy <= SEUIL_ENERGIE);
  return rouge
    ? { ...base, etat: 'rouge', regles: ['R-03'], raison: 'Tu te sens courbaturé ou à plat.' }
    : { ...base, etat: 'vert', regles: ['R-03'], raison: 'Ressenti correct.' };
}

/** R-04 : reps réalisées / reps ciblées de la dernière séance de force, échauffements exclus. */
function signalPerformance(seances: Seance[], cibles: Record<string, number>): Signal {
  const base = { id: 'performance' as const, nom: 'Performance récente' };
  const derniere = seances.filter((s) => s.kind === 'strength').sort((a, b) => b.date.localeCompare(a.date))[0];
  const inconnu: Signal = { ...base, etat: 'inconnu', regles: ['R-04'], raison: 'Pas encore de séance de force à comparer.' };
  if (!derniere) return inconnu;

  let faites = 0;
  let visees = 0;
  for (const ex of derniere.exercises) {
    const cible = cibles[ex.key];
    if (cible == null) continue;
    for (const s of ex.sets) {
      if (s.type === 'warmup') continue;
      faites += s.reps;
      visees += cible;
    }
  }
  if (visees === 0) return inconnu;
  return faites / visees < SEUIL_PERFORMANCE
    ? { ...base, etat: 'rouge', regles: ['R-04'], raison: 'La dernière séance est restée en dessous de la cible de reps.' }
    : { ...base, etat: 'vert', regles: ['R-04'], raison: 'La dernière séance a tenu la cible.' };
}

const EXPLICATIONS: Record<Verdict, string> = {
  allegee: "Deux signaux sur trois demandent de ralentir : une séance allégée ou une récupération active te fera du bien aujourd'hui.",
  vigilance: 'Un signal est au rouge : on garde la séance, mais je reste à ton écoute.',
  normale: "Tout est dans le vert ou sans alerte : séance normale aujourd'hui.",
};

/** Règle « 2 sur 3 » : on n'allège jamais sur un seul signal (R-05 à R-08). */
export function preparationDuJour(entree: EntreePreparation): PreparationDuJour {
  const signaux = [
    signalPhysio(entree.recuperation, entree.aujourdhui),
    signalSubjectif(entree.recuperation, entree.aujourdhui),
    signalPerformance(entree.seances, entree.ciblesReps),
  ];
  const rouges = signaux.filter((s) => s.etat === 'rouge').length;

  const verdict: Verdict = rouges >= 2 ? 'allegee' : rouges === 1 ? 'vigilance' : 'normale';
  const regles = [...new Set(signaux.flatMap((s) => s.regles))];
  regles.push(verdict === 'allegee' ? 'R-05' : verdict === 'vigilance' ? 'R-06' : 'R-07');

  // R-08 : le ressenti peut à lui seul faire passer de « normale » à « vigilance ».
  const subjectifSeul = rouges === 1 && signaux.find((s) => s.id === 'subjectif')!.etat === 'rouge';
  if (subjectifSeul) regles.push('R-08');

  return {
    signaux,
    rouges,
    verdict,
    aDesDonnees: signaux.some((s) => s.etat !== 'inconnu'),
    explication: EXPLICATIONS[verdict],
    regles,
  };
}
