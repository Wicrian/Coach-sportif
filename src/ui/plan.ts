import type { Creneau, GenreSeance, Jour, Moment, Playlist, Profil, Seance } from '../donnees/types';
import type { TypePlanifie } from '../moteur/planification';
import { nf } from './format';
import type { PlanSeance } from './seance/preparer';

/** Durée disponible associée à chaque moment (hypothèses, réglables plus tard dans le profil). */
export const MOMENTS: { moment: Moment; nom: string; dureeMaxMin: number }[] = [
  { moment: 'matin', nom: 'Matin', dureeMaxMin: 40 },
  { moment: 'midi', nom: 'Midi', dureeMaxMin: 30 },
  { moment: 'soir', nom: 'Soir', dureeMaxMin: 60 },
  { moment: 'journee', nom: 'Journée', dureeMaxMin: 90 },
];

export const NOMS_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const CRENEAUX_PAR_DEFAUT: Creneau[] = [
  { jour: 6, moment: 'journee', dureeMaxMin: 90 },
  { jour: 7, moment: 'journee', dureeMaxMin: 90 },
];

export const creneauxDuProfil = (profil: Profil): Creneau[] => profil.creneaux ?? CRENEAUX_PAR_DEFAUT;

export const creneauDuJour = (creneaux: Creneau[], jour: number): Creneau | undefined => creneaux.find((c) => c.jour === jour);

/** Remplace le créneau d'un jour (`null` = aucun créneau). Un seul créneau par jour. */
export function definirCreneau(creneaux: Creneau[], jour: number, moment: Moment | null): Creneau[] {
  const autres = creneaux.filter((c) => c.jour !== jour);
  if (moment === null) return autres;
  const duree = MOMENTS.find((m) => m.moment === moment)!.dureeMaxMin;
  return [...autres, { jour, moment, dureeMaxMin: duree }].sort((a, b) => a.jour - b.jour);
}

/** Ajoute ou retire un jour indisponible, et oublie les jours passés. */
export function basculerIndisponible(liste: Jour[] | undefined, jour: Jour, aujourdhui: Jour): Jour[] {
  const futurs = (liste ?? []).filter((j) => j >= aujourdhui);
  const nouvelle = futurs.includes(jour) ? futurs.filter((j) => j !== jour) : [...futurs, jour];
  return nouvelle.sort();
}

/** Full-body et poids du corps alternent : on propose celui qui n'a pas été fait en dernier. */
export function modeleConseille(seances: Seance[]): 'fb' | 'bw' {
  const derniere = seances.filter((s) => s.kind === 'strength' && s.tplId).sort((a, b) => b.date.localeCompare(a.date))[0];
  return derniere?.tplId === 'fb' ? 'bw' : 'fb';
}

export function libelleJour(jour: Jour, aujourdhui: Jour): string {
  const ecart = Math.round((new Date(`${jour}T12:00:00`).getTime() - new Date(`${aujourdhui}T12:00:00`).getTime()) / 86_400_000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return 'Demain';
  return new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

const TYPES: Record<TypePlanifie, string> = {
  force: 'Force',
  boxe: 'Boxe',
  combine: 'Force et boxe',
  marche: 'Marche',
  mobilite: 'Mobilité',
  recuperation: 'Récupération active',
  repos: 'Repos',
  'deja-fait': 'Déjà fait',
};
export const libelleType = (type: TypePlanifie): string => TYPES[type];


/** Ce que l'utilisateur peut faire directement depuis la séance du jour dans le Plan. */
export function actionPourType(type: TypePlanifie): 'demarrer' | 'noter' | null {
  if (type === 'force' || type === 'combine') return 'demarrer';
  if (type === 'repos' || type === 'deja-fait') return null;
  return 'noter';
}

/** Type d'activité et durée à pré-remplir quand on note une séance prévue au plan. */
export function genrePourType(type: TypePlanifie): { kind: GenreSeance; dureeMin: number } | null {
  switch (type) {
    case 'boxe': return { kind: 'box', dureeMin: 35 };
    case 'marche': return { kind: 'walk', dureeMin: 25 };
    case 'mobilite': return { kind: 'mob', dureeMin: 15 };
    case 'recuperation': return { kind: 'cardio', dureeMin: 15 };
    default: return null;
  }
}

/** Playlists qui conviennent à un type de séance : celles choisies pour ce type, et celles valables pour toutes. */
export function playlistsPour(playlists: Playlist[] | undefined, kind: GenreSeance): Playlist[] {
  return (playlists ?? []).filter((p) => !p.pour || p.pour.length === 0 || p.pour.includes(kind));
}

const DESCRIPTIONS: Record<TypePlanifie, string> = {
  force: 'Une séance de force avec tes haltères ou ton poids du corps. Les charges sont choisies parmi celles que tu as vraiment, avec peu de changements de disques.',
  combine: 'De la force courte, puis de la boxe, avec échauffement et étirements. Tu fais la partie force ici ; la boxe se note ensuite une fois faite (Boxa, Heavybox, sac, reflex bag).',
  boxe: 'Une séance de boxe à intensité douce : tu dois pouvoir parler en même temps. Boxa, Heavybox, sac de frappe ou reflex bag, comme tu préfères, avec échauffement et étirements.',
  marche: 'Une marche facile, à ton rythme. Elle compte pour ta semaine comme n\'importe quelle autre séance.',
  mobilite: 'Un peu de mobilité et d\'étirements, tranquillement. Ça compte pour ta semaine et ça aide la récupération.',
  recuperation: 'Une récupération active de 10 à 20 minutes : cardio léger, mobilité ou shadow-boxing doux. Ton corps a besoin de souffler aujourd\'hui.',
  repos: 'Un jour sans séance prévue. Se reposer fait partie de l\'entraînement. Si tu as quand même envie de bouger, tu peux choisir une séance.',
  'deja-fait': 'Tu as déjà bougé aujourd\'hui. Tu peux t\'arrêter là, ou en faire une autre si l\'envie est là.',
};
export const descriptionType = (type: TypePlanifie): string => DESCRIPTIONS[type];

/** Ce qui est prévu dans une séance de force, ligne par ligne. */
export function lignesPrevues(plan: PlanSeance): { nom: string; detail: string }[] {
  return plan.exercices.map((e) => {
    const s = e.series[0]!;
    return { nom: e.nom, detail: `${e.series.length} × ${s.reps} · ${e.poidsDuCorps ? 'poids du corps' : s.w > 0 ? `${nf(s.w)} kg` : 'charge à choisir'}` };
  });
}
