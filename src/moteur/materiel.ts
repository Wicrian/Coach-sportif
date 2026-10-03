import type { InventaireHalteres } from '../donnees/types';

/** 'paire' : deux haltères chargés pareil. 'unique' : un seul haltère, tous les disques disponibles. */
export type ModeCharge = 'paire' | 'unique';

const arrondi = (kg: number) => Math.round(kg * 10) / 10;

/**
 * R-22 : toutes les charges réellement réalisables, triées, arrondies à 0,1 kg
 * (c'est l'unité de saisie de l'utilisateur).
 *
 * Le montage est toujours symétrique : autant de disques de chaque côté.
 * En mode 'paire', les disques sont partagés entre deux haltères (4 côtés) ;
 * en mode 'unique', ils se répartissent sur un seul haltère (2 côtés).
 */
export function chargesDisponibles(inventaire: InventaireHalteres, mode: ModeCharge): number[] {
  const cotes = mode === 'paire' ? 4 : 2;
  let parCote = [inventaire.barre / 2];
  for (const lot of inventaire.disques) {
    const max = Math.floor(lot.quantite / cotes);
    const suite: number[] = [];
    for (const base of parCote) for (let k = 0; k <= max; k++) suite.push(base + k * lot.poids);
    parCote = suite;
  }
  return [...new Set(parCote.map((c) => arrondi(c * 2)))].sort((a, b) => a - b);
}
