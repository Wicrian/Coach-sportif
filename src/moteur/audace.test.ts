import { describe, expect, it } from 'vitest';
import { curseurAudace, type EntreeAudace } from './audace';

function entree(partiel: Partial<EntreeAudace>): EntreeAudace {
  return { semainesReussiesConsecutives: 0, semainesActives: 0, ressentisRecents: [], preparation: 'normale', contestation: null, ...partiel };
}

describe('R-30 : monte avec la régularité et l\'ancienneté', () => {
  it('formule : (série + min(semaines actives, 6) / 2) / 8', () => {
    // habitude installée (8 semaines) : (4 + 3) / 8
    expect(curseurAudace(entree({ semainesReussiesConsecutives: 4, semainesActives: 8 })).valeur).toBeCloseTo(0.875);
  });

  it('plancher à 0,05 (jamais exactement zéro)', () => {
    expect(curseurAudace(entree({})).valeur).toBeCloseTo(0.05);
  });

  it('plafond à 1', () => {
    expect(curseurAudace(entree({ semainesReussiesConsecutives: 20, semainesActives: 20 })).valeur).toBe(1);
  });
});

describe('R-31 : plafond de 0,75 tant que l\'habitude n\'est pas installée (< 6 semaines)', () => {
  it('plafonne à 0,75 avec 5 semaines actives', () => {
    const c = curseurAudace(entree({ semainesReussiesConsecutives: 5, semainesActives: 5 }));
    expect(c.valeur).toBe(0.75);
    expect(c.regles).toContain('R-31');
  });

  it('plus de plafond à 6 semaines actives', () => {
    expect(curseurAudace(entree({ semainesReussiesConsecutives: 6, semainesActives: 6 })).valeur).toBeGreaterThan(0.75);
  });
});

describe('R-32 : mauvais ressenti récent', () => {
  const base = { semainesReussiesConsecutives: 4, semainesActives: 8 };

  it('moyenne des 4 derniers ressentis ≤ 2,3 → −0,2', () => {
    const c = curseurAudace(entree({ ...base, ressentisRecents: [2, 2, 3, 2] })); // 2,25
    expect(c.valeur).toBeCloseTo(0.675);
    expect(c.regles).toContain('R-32');
  });

  it('moyenne 2,5 → pas de baisse', () => {
    expect(curseurAudace(entree({ ...base, ressentisRecents: [2, 3, 2, 3] })).valeur).toBeCloseTo(0.875);
  });

  it('un seul ressenti ne suffit pas à baisser le curseur', () => {
    expect(curseurAudace(entree({ ...base, ressentisRecents: [1] })).valeur).toBeCloseTo(0.875);
  });

  it('ne tient compte que des 4 derniers ressentis', () => {
    expect(curseurAudace(entree({ ...base, ressentisRecents: [5, 5, 1, 1, 1, 1] })).valeur).toBeCloseTo(0.675);
  });
});

describe('R-33 : préparation du jour', () => {
  const base = { semainesReussiesConsecutives: 4, semainesActives: 8 };
  it('allégée → −0,25', () => expect(curseurAudace(entree({ ...base, preparation: 'allegee' })).valeur).toBeCloseTo(0.625));
  it('vigilance → −0,1', () => expect(curseurAudace(entree({ ...base, preparation: 'vigilance' })).valeur).toBeCloseTo(0.775));
});

describe('R-34 : contestation', () => {
  const base = { semainesReussiesConsecutives: 4, semainesActives: 8 };
  it('« je me sens prêt » → +0,25', () => expect(curseurAudace(entree({ ...base, contestation: 'pousser' })).valeur).toBe(1));
  it('« je préfère rester prudent » → −0,25', () => expect(curseurAudace(entree({ ...base, contestation: 'prudent' })).valeur).toBeCloseTo(0.625));

  it('la contestation ne dépasse pas le plafond tant que l\'habitude n\'est pas installée', () => {
    const c = curseurAudace(entree({ semainesReussiesConsecutives: 3, semainesActives: 4, contestation: 'pousser' }));
    expect(c.valeur).toBe(0.75);
  });
});

describe('R-36 : poussée douce (bonus) — hypothèse', () => {
  const pousser = { semainesReussiesConsecutives: 3, semainesActives: 4, contestation: 'pousser' as const };

  it('envie de pousser + préparation normale → un petit bonus est proposé', () => {
    const c = curseurAudace(entree(pousser));
    expect(c.bonus).not.toBeNull();
    expect(c.bonus!.forme).toBe('serie-en-plus');
    expect(c.regles).toContain('R-36');
  });

  it('pas de bonus si la préparation est allégée ou en vigilance', () => {
    expect(curseurAudace(entree({ ...pousser, preparation: 'allegee' })).bonus).toBeNull();
    expect(curseurAudace(entree({ ...pousser, preparation: 'vigilance' })).bonus).toBeNull();
  });

  it('pas de bonus si les derniers ressentis sont mauvais', () => {
    expect(curseurAudace(entree({ ...pousser, ressentisRecents: [2, 2, 2] })).bonus).toBeNull();
  });

  it('pas de bonus sans demande de l\'utilisateur', () => {
    expect(curseurAudace(entree({ semainesReussiesConsecutives: 3, semainesActives: 4 })).bonus).toBeNull();
  });
});

describe('R-35 : le curseur est toujours expliqué', () => {
  it('une phrase de raison dans tous les cas', () => {
    for (const contestation of [null, 'pousser', 'prudent'] as const) {
      for (const preparation of ['normale', 'vigilance', 'allegee'] as const) {
        const c = curseurAudace(entree({ contestation, preparation, semainesActives: 3 }));
        expect(c.raison.length).toBeGreaterThan(10);
        expect(c.regles).toContain('R-35');
      }
    }
  });
});
