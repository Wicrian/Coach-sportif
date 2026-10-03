import { describe, expect, it } from 'vitest';
import { proposerProgression, type EntreeProgression } from './progression';

const CHARGES = [1.6, 3.8, 6.2, 8.4]; // paire d'haltères de l'utilisateur

function entree(partiel: Partial<EntreeProgression>): EntreeProgression {
  return { cibleReps: 10, poidsDuCorps: false, derniere: null, chargesDisponibles: CHARGES, ...partiel };
}

describe('première fois (R-22)', () => {
  it('démarre à la plus grande charge disponible ≤ la charge de départ', () => {
    const p = proposerProgression(entree({ chargeInitiale: 5 }));
    expect(p.action).toBe('demarrer');
    expect(p.charge).toBe(3.8);
    expect(p.reps).toBe(10);
    expect(p.regles).toContain('R-22');
  });

  it('démarre à la charge la plus légère si la charge de départ est trop basse', () => {
    expect(proposerProgression(entree({ chargeInitiale: 1 })).charge).toBe(1.6);
  });
});

describe('R-20 : double progression', () => {
  it('toutes les séries au-dessus de la cible de 1+ rep et saut ≤ 25 % → monter à la charge dispo suivante (R-22)', () => {
    const p = proposerProgression(entree({ chargesDisponibles: [8, 10, 12], derniere: { charge: 8, reps: [11, 11, 11] } }));
    expect(p.action).toBe('monter');
    expect(p.charge).toBe(10); // +25 % exactement : autorisé
    expect(p.reps).toBe(10);
    expect(p.regles).toEqual(expect.arrayContaining(['R-20', 'R-22']));
  });

  it('une seule série à la cible → on consolide, sans monter', () => {
    const p = proposerProgression(entree({ derniere: { charge: 3.8, reps: [12, 11, 10] } }));
    expect(p.action).toBe('consolider');
    expect(p.charge).toBe(3.8);
    expect(p.reps).toBe(11); // min(10 + 1, cible + 1)
  });

  it('la charge actuelle peut ne pas être dans la liste (ancien historique) : on prend la suivante au-dessus', () => {
    const p = proposerProgression(entree({ derniere: { charge: 5, reps: [11, 11, 11] } }));
    expect(p.action).toBe('monter');
    expect(p.charge).toBe(6.2); // +24 %
  });
});

describe('R-23 : lissage des sauts de charge', () => {
  const base = { derniere: { charge: 3.8, reps: [11, 11, 11] } };

  it('saut > 25 % (3,8 → 6,2 = +63 %) → on reste sur la charge et on progresse par les reps', () => {
    const p = proposerProgression(entree(base));
    expect(p.action).toBe('lisser');
    expect(p.charge).toBe(3.8);
    expect(p.reps).toBe(12); // cible + 2
    expect(p.leviers).toEqual(expect.arrayContaining(['reps', 'tempo', 'repos']));
    expect(p.regles).toContain('R-23');
  });

  it('après 2 séances de lissage → on propose la nouvelle charge', () => {
    const p = proposerProgression(entree({ ...base, seancesLissage: 2 }));
    expect(p.action).toBe('monter');
    expect(p.charge).toBe(6.2);
    expect(p.regles).toContain('R-23');
  });

  it('après 1 séance de lissage → on continue de lisser', () => {
    expect(proposerProgression(entree({ ...base, seancesLissage: 1 })).action).toBe('lisser');
  });
});

describe('R-25 : refus d\'une proposition', () => {
  it('« trop de changements » : retour à la charge précédente pendant 2 séances', () => {
    const p = proposerProgression(entree({
      derniere: { charge: 6.2, reps: [12, 12, 12] },
      refus: { chargePrecedente: 3.8, seancesDepuis: 1 },
    }));
    expect(p.action).toBe('consolider');
    expect(p.charge).toBe(3.8);
    expect(p.regles).toContain('R-25');
  });

  it('au bout de 2 séances, on peut re-proposer', () => {
    const p = proposerProgression(entree({
      derniere: { charge: 3.8, reps: [12, 12, 12] },
      refus: { chargePrecedente: 3.8, seancesDepuis: 2 },
      seancesLissage: 2,
    }));
    expect(p.action).toBe('monter');
  });
});

describe('R-27 : limite du matériel', () => {
  const haut = { derniere: { charge: 8.4, reps: [12, 12, 12] } };

  it('charge max atteinte → variantes sans achat d\'abord', () => {
    const p = proposerProgression(entree(haut));
    expect(p.action).toBe('limite-materiel');
    expect(p.suggestionAchat).toBe(false);
    expect(p.leviers).toEqual(expect.arrayContaining(['unilateral', 'tempo', 'reps']));
    expect(p.regles).toContain('R-27');
  });

  it('achat suggéré seulement après que les variantes ont été proposées', () => {
    expect(proposerProgression(entree({ ...haut, variantesDejaProposees: true })).suggestionAchat).toBe(true);
  });

  it('pas de suggestion d\'achat tant que la charge max n\'est pas atteinte', () => {
    const p = proposerProgression(entree({ derniere: { charge: 6.2, reps: [12, 12, 12] }, variantesDejaProposees: true }));
    expect(p.suggestionAchat).not.toBe(true);
  });
});

describe('R-24 : poids du corps', () => {
  const pc = (reps: number[], cibleReps = 10) =>
    proposerProgression(entree({ poidsDuCorps: true, cibleReps, chargesDisponibles: [], derniere: { charge: 0, reps } }));

  it('toutes les séries à cible + 2 → +1 rep par série', () => {
    const p = pc([12, 12, 12]);
    expect(p.action).toBe('reps');
    expect(p.reps).toBe(13);
    expect(p.regles).toContain('R-24');
  });

  it('cible + 1 seulement → on consolide', () => {
    expect(pc([11, 11, 11]).action).toBe('consolider');
  });

  it('au-delà du plafond de reps (20) → variante plus difficile', () => {
    const p = pc([20, 20, 20], 15);
    expect(p.action).toBe('variante');
    expect(p.regles).toContain('R-24');
  });
});
