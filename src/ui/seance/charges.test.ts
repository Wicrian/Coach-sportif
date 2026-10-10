import { describe, expect, it } from 'vitest';
import { voisine } from './charges';

describe('voisine : charge suivante ou précédente', () => {
  const liste = [1.6, 3.8, 6.2, 8.4];
  it('monte à la charge réalisable suivante', () => expect(voisine(liste, 3.8, 1)).toBe(6.2));
  it('descend à la charge réalisable précédente', () => expect(voisine(liste, 3.8, -1)).toBe(1.6));
  it('reste sur place aux extrémités', () => {
    expect(voisine(liste, 8.4, 1)).toBe(8.4);
    expect(voisine(liste, 1.6, -1)).toBe(1.6);
  });
  it('depuis une charge hors liste, va à la plus proche dans le bon sens', () => {
    expect(voisine(liste, 5, 1)).toBe(6.2);
    expect(voisine(liste, 5, -1)).toBe(3.8);
  });
  it('matériel inconnu (liste vide) : pas de 1 kg, jamais en dessous de 0', () => {
    expect(voisine([], 2, 1)).toBe(3);
    expect(voisine([], 2, -1)).toBe(1);
    expect(voisine([], 0.5, -1)).toBe(0);
  });
});
