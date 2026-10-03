import type { Jour, Seance } from '../donnees/types';
import type { Verdict } from './readiness';
import { ajouterJours, jourDe, joursEntre, lundiDeLaSemaine } from './utilitaires';

export type Moment = 'matin' | 'midi' | 'soir' | 'journee';

/** Créneau préféré déclaré par l'utilisateur (R-61). */
export interface Creneau {
  /** 1 = lundi … 7 = dimanche. */
  jour: number;
  moment: Moment;
  /** Temps disponible dans ce créneau. */
  dureeMaxMin: number;
}

export type TypePlanifie = 'force' | 'boxe' | 'combine' | 'marche' | 'mobilite' | 'recuperation' | 'repos' | 'deja-fait';

export interface JourPlanifie {
  jour: Jour;
  type: TypePlanifie;
  moment?: Moment;
  dureeMin?: number;
  regles: string[];
  raison: string;
}

export interface Avertissement {
  regle: string;
  /** Lundi de la semaine concernée. */
  semaine: Jour;
  raison: string;
}

export interface EntreePlanification {
  aujourdhui: Jour;
  seances: Seance[];
  creneaux: Creneau[];
  /** Préparation du jour (R-62). */
  preparation: Verdict;
  /** R-63 : l'utilisateur annonce une semaine chargée. */
  semaineChargee?: boolean;
  /** Jours où l'utilisateur ne peut pas s'entraîner (plus tard : alimenté par l'agenda). */
  joursIndisponibles?: Jour[];
}

export interface Planification {
  jours: JourPlanifie[];
  avertissements: Avertissement[];
  regles: string[];
}

const HORIZON = 14; // R-60
const ESPACEMENT_JOURS = 2; // R-10 : 48 h
const FORCE_PAR_SEMAINE = 2; // R-11
const BOXE_PAR_SEMAINE = 1; // préférence de l'utilisateur
const SEANCES_PAR_SEMAINE = 4; // cible conseillée (R-40), utilisée ici comme plafond (hypothèse)
const DUREE_SEMAINE_CHARGEE = 30; // R-63 (hypothèse)

/** Durée typique et durée minimale pour qu'un créneau accueille ce type de séance. */
const DUREES = {
  combine: { typique: 45, mini: 45 },
  force: { typique: 40, mini: 40 },
  boxe: { typique: 35, mini: 30 },
  marche: { typique: 25, mini: 20 },
  mobilite: { typique: 15, mini: 10 },
  recuperation: { typique: 15, mini: 10 },
} as const;

type Compteur = { force: number; boxe: number; total: number };

export function planifier(e: EntreePlanification): Planification {
  const compteurs = new Map<Jour, Compteur>();
  const compteur = (lundi: Jour): Compteur => {
    let c = compteurs.get(lundi);
    if (!c) compteurs.set(lundi, (c = { force: 0, boxe: 0, total: 0 }));
    return c;
  };

  const dateDe = (s: Seance) => jourDe(s.date);
  let derniereIntense: Jour | null = null;
  for (const s of e.seances) {
    const c = compteur(lundiDeLaSemaine(dateDe(s)));
    c.total++;
    if (s.kind === 'strength') {
      c.force++;
      if (derniereIntense === null || dateDe(s) > derniereIntense) derniereIntense = dateDe(s);
    }
    if (s.kind === 'box') c.boxe++;
  }
  const faitAujourdhui = e.seances.some((s) => dateDe(s) === e.aujourdhui);

  const indispos = new Set(e.joursIndisponibles ?? []);
  const jours: JourPlanifie[] = [];
  let derniereLegere: 'marche' | 'mobilite' | null = null;

  for (let i = 0; i < HORIZON; i++) {
    const jour = ajouterJours(e.aujourdhui, i);
    const lundi = lundiDeLaSemaine(jour);
    const c = compteur(lundi);
    const isoJour = joursEntre(lundi, jour) + 1;
    const repos = (raison: string, regles: string[] = ['R-61']): JourPlanifie => ({ jour, type: 'repos', regles, raison });

    if (i === 0 && faitAujourdhui) {
      jours.push({ jour, type: 'deja-fait', regles: [], raison: "Tu as déjà bougé aujourd'hui." });
      continue;
    }
    if (indispos.has(jour)) {
      jours.push(repos("Jour indisponible : on n'y touche pas.", ['R-61']));
      continue;
    }
    const creneau = e.creneaux.filter((k) => k.jour === isoJour).sort((a, b) => b.dureeMaxMin - a.dureeMaxMin)[0];
    if (!creneau) {
      jours.push(repos("Pas de créneau prévu ce jour-là : repos."));
      continue;
    }
    if (c.total >= SEANCES_PAR_SEMAINE) {
      jours.push(repos('Tu as déjà de quoi faire une belle semaine : repos.', ['R-40', 'R-61']));
      continue;
    }

    const dispo = e.semaineChargee ? Math.min(creneau.dureeMaxMin, DUREE_SEMAINE_CHARGEE) : creneau.dureeMaxMin;
    const place = (type: keyof typeof DUREES, regles: string[], raison: string): JourPlanifie => {
      c.total++;
      return { jour, type, moment: creneau.moment, dureeMin: Math.min(DUREES[type].typique, dispo), regles: [...regles, 'R-61'], raison };
    };

    // R-62 : préparation allégée aujourd'hui → récupération active, la force n'est pas consommée.
    if (i === 0 && e.preparation === 'allegee') {
      jours.push(place('recuperation', ['R-62'], "Ta préparation du jour est faible : une récupération active de 10 à 20 minutes (cardio léger, mobilité) te fera plus de bien qu'une séance."));
      continue;
    }

    const besoinForce = c.force < FORCE_PAR_SEMAINE;
    const besoinBoxe = c.boxe < BOXE_PAR_SEMAINE;
    const espaceOk = derniereIntense === null || joursEntre(derniereIntense, jour) >= ESPACEMENT_JOURS;

    if (besoinForce && besoinBoxe && espaceOk && dispo >= DUREES.combine.mini) {
      c.force++;
      c.boxe++;
      derniereIntense = jour;
      jours.push(place('combine', ['R-10', 'R-11'], 'Force courte et boxe dans la même séance, avec échauffement et étirements.'));
    } else if (besoinForce && espaceOk && dispo >= DUREES.force.mini) {
      c.force++;
      derniereIntense = jour;
      jours.push(place('force', ['R-10', 'R-11'], 'Séance de force : tes muscles ont eu au moins 48 h de repos.'));
    } else if (besoinBoxe && dispo >= DUREES.boxe.mini) {
      c.boxe++;
      jours.push(place('boxe', ['R-50'], 'Boxe, à intensité douce : tu dois pouvoir parler en même temps.'));
    } else if (dispo >= DUREES.mobilite.mini) {
      const type: 'marche' | 'mobilite' = derniereLegere !== 'marche' && dispo >= DUREES.marche.mini ? 'marche' : 'mobilite';
      derniereLegere = type;
      jours.push(place(type, ['R-40'], type === 'marche' ? 'Une marche facile : ça compte pour ta semaine.' : 'Un peu de mobilité : ça compte pour ta semaine.'));
    } else {
      jours.push(repos('Créneau trop court pour une séance : repos.'));
    }
  }

  // R-11 : prévenir quand les créneaux ne permettent pas 2 séances de force sur une semaine entière à venir.
  const fin = ajouterJours(e.aujourdhui, HORIZON - 1);
  const avertissements: Avertissement[] = [];
  for (const [lundi, c] of compteurs) {
    if (lundi >= e.aujourdhui && ajouterJours(lundi, 6) <= fin && c.force < FORCE_PAR_SEMAINE) {
      avertissements.push({
        regle: 'R-11',
        semaine: lundi,
        raison: 'Avec ces créneaux, un muscle ne travaille qu\'une fois cette semaine : un créneau en semaine permettrait de passer à deux fois, avec 48 h entre les séances.',
      });
    }
  }

  const regles = ['R-60', 'R-61'];
  if (e.semaineChargee) regles.push('R-63');
  return { jours, avertissements, regles };
}
