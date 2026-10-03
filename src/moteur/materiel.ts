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

export interface DisquesParCote {
  poids: number;
  quantite: number;
}

/**
 * Quels disques mettre de chaque côté de la barre pour obtenir cette charge (le montage le plus
 * simple, c'est-à-dire avec le moins de disques). `[]` = barre seule. `null` = charge impossible.
 */
export function decrireMontage(inventaire: InventaireHalteres, charge: number, mode: ModeCharge): DisquesParCote[] | null {
  const cotes = mode === 'paire' ? 4 : 2;
  let meilleur: DisquesParCote[] | null = null;
  let meilleurNombre = Infinity;

  const explorer = (i: number, parCote: number, choix: DisquesParCote[]) => {
    if (i === inventaire.disques.length) {
      if (Math.abs(arrondi(parCote * 2) - arrondi(charge)) < 0.05) {
        const nombre = choix.reduce((n, d) => n + d.quantite, 0);
        if (nombre < meilleurNombre) {
          meilleur = choix.filter((d) => d.quantite > 0);
          meilleurNombre = nombre;
        }
      }
      return;
    }
    const lot = inventaire.disques[i]!;
    const max = Math.floor(lot.quantite / cotes);
    for (let k = 0; k <= max; k++) explorer(i + 1, parCote + k * lot.poids, [...choix, { poids: lot.poids, quantite: k }]);
  };
  explorer(0, inventaire.barre / 2, []);
  return meilleur;
}
