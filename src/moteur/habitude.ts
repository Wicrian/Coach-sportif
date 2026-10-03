import type { Jour, Seance } from '../donnees/types';
import { ajouterJours, jourDe, lundiDeLaSemaine } from './utilitaires';

export interface BilanHabitude {
  /** Semaines réussies consécutives (R-40, R-41). */
  serieActuelle: number;
  /** Plus longue série jamais atteinte (R-42). */
  plusLongue: number;
  /** Total de semaines réussies, toutes séries confondues (R-42). */
  totalSemainesReussies: number;
  /** Semaines comptant au moins une séance : sert de mesure d'ancienneté (R-31). */
  semainesActives: number;
  /** Séances déjà faites cette semaine. */
  cetteSemaine: number;
  /** R-43 : proposer une planification « si… alors… ». */
  proposerSiAlors: boolean;
  regles: string[];
  raison: string;
}

const SEUIL_SEMAINE_REUSSIE = 3; // R-40
const CIBLE_CONSEILLEE = 4; // R-40, R-43

export function evaluerHabitude(seances: Seance[], aujourdhui: Jour): BilanHabitude {
  const parSemaine = new Map<Jour, number>();
  for (const s of seances) {
    const lundi = lundiDeLaSemaine(jourDe(s.date));
    parSemaine.set(lundi, (parSemaine.get(lundi) ?? 0) + 1);
  }

  const lundiCourant = lundiDeLaSemaine(aujourdhui);
  const nb = (lundi: Jour) => parSemaine.get(lundi) ?? 0;
  const premiere = [...parSemaine.keys()].sort()[0];

  let serie = 0;
  let plusLongue = 0;
  let total = 0;
  if (premiere) {
    for (let lundi = premiere; lundi <= lundiCourant; lundi = ajouterJours(lundi, 7)) {
      if (nb(lundi) >= SEUIL_SEMAINE_REUSSIE) {
        serie++;
        total++;
        plusLongue = Math.max(plusLongue, serie);
      } else if (lundi !== lundiCourant) {
        serie = 0; // R-41 : la semaine en cours, pas encore terminée, ne casse rien
      }
    }
  }

  // R-43 : les 2 dernières semaines complètes (la semaine en cours n'est jamais jugée).
  const avantDerniere = ajouterJours(lundiCourant, -14);
  const derniere = ajouterJours(lundiCourant, -7);
  const proposerSiAlors =
    premiere !== undefined && premiere <= avantDerniere && nb(avantDerniere) < CIBLE_CONSEILLEE && nb(derniere) < CIBLE_CONSEILLEE;

  const regles = ['R-40', 'R-41', 'R-42'];
  if (proposerSiAlors) regles.push('R-43');

  const raison = total === 0
    ? "Pas encore de semaine réussie : trois séances dans la semaine, de n'importe quel type, en font une."
    : `${serie} semaine${serie > 1 ? 's' : ''} réussie${serie > 1 ? 's' : ''} d'affilée, ${plusLongue} au mieux, ${total} au total.`;

  return {
    serieActuelle: serie,
    plusLongue,
    totalSemainesReussies: total,
    semainesActives: parSemaine.size,
    cetteSemaine: nb(lundiCourant),
    proposerSiAlors,
    regles,
    raison,
  };
}
