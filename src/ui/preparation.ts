import { ciblesReps } from '../donnees/exercices';
import type { Donnees } from '../donnees/types';
import { preparationDuJour, type PreparationDuJour } from '../moteur/readiness';
import { jourLocal } from './jour';

/** Préparation du jour : appelle le moteur avec les données de l'appareil. */
export function calculerPreparation(donnees: Donnees, maintenant: Date = new Date()): PreparationDuJour {
  return preparationDuJour({
    recuperation: donnees.recuperation,
    seances: donnees.seances,
    aujourdhui: jourLocal(maintenant),
    ciblesReps: ciblesReps(),
  });
}
