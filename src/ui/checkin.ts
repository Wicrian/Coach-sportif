import type { Jour, MesureRecuperation } from '../donnees/types';

export interface SaisieCheckin {
  energy?: number;
  sore?: number;
  mood?: number;
  sleep?: number;
  weight?: number;
  hrv?: number;
  rhr?: number;
}

/** Ajoute la saisie du jour à la mesure existante : une valeur fournie remplace l'ancienne, le reste est gardé. */
export function fusionnerCheckin(existante: MesureRecuperation | undefined, jour: Jour, saisie: SaisieCheckin): MesureRecuperation {
  const mesure: MesureRecuperation = { ...existante, date: jour };
  for (const [cle, valeur] of Object.entries(saisie)) {
    if (typeof valeur === 'number' && Number.isFinite(valeur)) (mesure as unknown as Record<string, unknown>)[cle] = valeur;
  }
  return mesure;
}

/** Nombre saisi à la française (« 61,5 ») → nombre. Vide ou invalide → undefined. */
export function lireNombre(texte: string): number | undefined {
  const n = parseFloat(texte.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
