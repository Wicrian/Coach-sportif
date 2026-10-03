import { describe, expect, it } from 'vitest';
import { ordonnerParCharge, type ExercicePrevu } from './ordre-seance';

const ex = (key: string, charge: number): ExercicePrevu => ({ key, charge });
const cles = (r: { exercices: ExercicePrevu[] }) => r.exercices.map((e) => e.key);

describe('R-26 : limiter les changements de disques', () => {
  it('regroupe les exercices qui utilisent la même charge', () => {
    const r = ordonnerParCharge([ex('a', 3.8), ex('b', 6.2), ex('c', 3.8), ex('d', 6.2)]);
    expect(cles(r)).toEqual(['a', 'c', 'b', 'd']);
    expect(r.changements).toBe(1);
    expect(r.regles).toContain('R-26');
  });

  it('jamais de va-et-vient : chaque charge forme un seul bloc', () => {
    const r = ordonnerParCharge([ex('a', 6.2), ex('b', 3.8), ex('c', 6.2), ex('d', 3.8), ex('e', 6.2)]);
    expect(cles(r)).toEqual(['a', 'c', 'e', 'b', 'd']);
    expect(r.changements).toBe(1);
  });

  it('garde l\'ordre d\'origine : le premier bloc est celui du premier exercice', () => {
    const r = ordonnerParCharge([ex('a', 8.4), ex('b', 1.6), ex('c', 8.4)]);
    expect(cles(r)).toEqual(['a', 'c', 'b']);
  });

  it('les exercices au poids du corps ne comptent pas et gardent leur place', () => {
    const r = ordonnerParCharge([ex('a', 3.8), ex('pc', 0), ex('b', 6.2), ex('c', 3.8)]);
    expect(cles(r)).toEqual(['a', 'pc', 'c', 'b']);
    expect(r.changements).toBe(1);
  });

  it('rien à changer quand tout est déjà groupé', () => {
    const r = ordonnerParCharge([ex('a', 3.8), ex('b', 3.8), ex('c', 6.2)]);
    expect(cles(r)).toEqual(['a', 'b', 'c']);
    expect(r.changements).toBe(1);
  });

  it('même charge partout : aucun changement', () => {
    expect(ordonnerParCharge([ex('a', 3.8), ex('b', 3.8)]).changements).toBe(0);
  });

  it('liste vide ou un seul exercice : aucun changement', () => {
    expect(ordonnerParCharge([]).changements).toBe(0);
    expect(ordonnerParCharge([ex('a', 3.8)]).changements).toBe(0);
  });

  it('ne modifie pas la liste reçue', () => {
    const entree = [ex('a', 3.8), ex('b', 6.2), ex('c', 3.8)];
    ordonnerParCharge(entree);
    expect(entree.map((e) => e.key)).toEqual(['a', 'b', 'c']);
  });
});
