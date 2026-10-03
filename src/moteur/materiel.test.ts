import { describe, expect, it } from 'vitest';
import type { InventaireHalteres } from '../donnees/types';
import { chargesDisponibles } from './materiel';

/** Matériel réel de l'utilisateur : barre 1,5978 kg, 4 disques de 1,1 kg et 4 de 2,3 kg. */
const INVENTAIRE: InventaireHalteres = {
  barre: 1.5978,
  disques: [
    { poids: 1.1, quantite: 4 },
    { poids: 2.3, quantite: 4 },
  ],
};

describe('chargesDisponibles (R-22)', () => {
  it('paire d\'haltères : 1 disque de chaque type par côté → 4 charges', () => {
    expect(chargesDisponibles(INVENTAIRE, 'paire')).toEqual([1.6, 3.8, 6.2, 8.4]);
  });

  it('un seul haltère : tous les disques peuvent servir → jusqu\'à 15,2 kg', () => {
    expect(chargesDisponibles(INVENTAIRE, 'unique')).toEqual([1.6, 3.8, 6.0, 6.2, 8.4, 10.6, 10.8, 13.0, 15.2]);
  });

  it('montage toujours symétrique : jamais un nombre impair de disques d\'un type', () => {
    const impair: InventaireHalteres = { barre: 1, disques: [{ poids: 2, quantite: 3 }] };
    // 3 disques, un seul haltère : 1 par côté au plus (le 3e reste sans partenaire)
    expect(chargesDisponibles(impair, 'unique')).toEqual([1, 5]);
  });

  it('sans disques, seule la barre est disponible', () => {
    expect(chargesDisponibles({ barre: 1.5978, disques: [] }, 'paire')).toEqual([1.6]);
  });

  it('pas de doublon quand deux montages donnent la même charge', () => {
    const inv: InventaireHalteres = { barre: 1, disques: [{ poids: 1, quantite: 8 }, { poids: 2, quantite: 4 }] };
    const charges = chargesDisponibles(inv, 'paire');
    expect(new Set(charges).size).toBe(charges.length);
    expect(charges).toEqual([...charges].sort((a, b) => a - b));
  });
});
