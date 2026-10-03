import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXERCICES, MODELES, ciblesReps } from './exercices';

describe('bibliothèque d\'exercices', () => {
  it('contient les 9 exercices du prototype', () => {
    expect(Object.keys(EXERCICES).sort()).toEqual(['bench', 'bridge', 'bug', 'goblet', 'ohp', 'pushup', 'rdl', 'row', 'squat']);
  });

  it.each(Object.entries(EXERCICES))('%s : photos présentes et consigne rédigée', (_cle, e) => {
    for (const photo of e.photos) expect(existsSync(`public/${photo}`), photo).toBe(true);
    expect(e.consigne.length).toBeGreaterThan(30);
    expect(e.cibleReps).toBeGreaterThan(0);
  });

  it('un exercice au poids du corps n\'a pas de charge de départ', () => {
    for (const e of Object.values(EXERCICES)) if (e.poidsDuCorps) expect(e.chargeInitiale).toBe(0);
  });

  it('les modèles de séance ne citent que des exercices connus', () => {
    for (const m of MODELES) for (const cle of m.exercices) expect(EXERCICES[cle], cle).toBeDefined();
  });

  it('fournit les reps cibles pour la préparation du jour', () => {
    expect(ciblesReps().goblet).toBe(12);
  });
});
