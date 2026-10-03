import { describe, expect, it } from 'vitest';
import type { MesureRecuperation, Seance } from '../donnees/types';
import { preparationDuJour } from './readiness';

const AUJOURDHUI = '2026-10-10';
const CIBLES = { bench: 10 };

/** 7 jours précédents (3 au 9 octobre) : HRV autour de 60 (écart-type ~1,4), FC repos autour de 55 (~1,0). */
const HISTORIQUE: MesureRecuperation[] = [
  [3, 60, 55], [4, 62, 54], [5, 58, 56], [6, 61, 55], [7, 59, 57], [8, 60, 55], [9, 62, 54],
].map(([j, hrv, rhr]) => ({ date: `2026-10-${String(j).padStart(2, '0')}`, hrv, rhr }));

function aujourdhui(m: Partial<MesureRecuperation>): MesureRecuperation {
  return { date: AUJOURDHUI, ...m };
}

function seanceForce(reps: number[], types: Array<'warmup' | 'normal'> = []): Seance {
  return {
    id: 's1',
    date: '2026-10-08T18:00:00',
    kind: 'strength',
    exercises: [{ key: 'bench', sets: reps.map((r, i) => ({ type: types[i] ?? 'normal', w: 5, reps: r })) }],
  };
}

function etat(res: ReturnType<typeof preparationDuJour>, id: string) {
  return res.signaux.find((s) => s.id === id)!;
}

describe('R-02 : jamais de décision sur une lecture isolée', () => {
  it('signal physiologique inconnu avec moins de 4 mesures HRV sur les 7 jours précédents', () => {
    const peu = HISTORIQUE.slice(0, 3);
    const res = preparationDuJour({ recuperation: [...peu, aujourdhui({ hrv: 40, rhr: 70 })], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'physio').etat).toBe('inconnu');
    expect(etat(res, 'physio').regles).toContain('R-02');
  });

  it("signal physiologique inconnu s'il n'y a pas de mesure aujourd'hui", () => {
    const res = preparationDuJour({ recuperation: HISTORIQUE, seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'physio').etat).toBe('inconnu');
  });

  it("ignore les mesures de plus de 7 jours", () => {
    const vieilles = HISTORIQUE.map((m, i) => ({ ...m, date: `2026-09-${10 + i}` }));
    const res = preparationDuJour({ recuperation: [...vieilles, aujourdhui({ hrv: 40, rhr: 70 })], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'physio').etat).toBe('inconnu');
  });
});

describe('R-01 : signal physiologique', () => {
  it('rouge si HRV < moyenne − 1 écart-type ET FC repos > moyenne + 1 écart-type', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 50, rhr: 62 })], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'physio').etat).toBe('rouge');
    expect(etat(res, 'physio').regles).toContain('R-01');
  });

  it('vert si la HRV est basse mais la FC de repos normale', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 50, rhr: 55 })], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'physio').etat).toBe('vert');
  });

  it("la HRV seule suffit si la FC de repos du jour est absente", () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 50 })], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'physio').etat).toBe('rouge');
  });

  it('vert si la HRV est dans la fourchette habituelle', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 60, rhr: 55 })], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'physio').etat).toBe('vert');
  });
});

describe('R-03 : signal subjectif', () => {
  const sub = (m: Partial<MesureRecuperation>) =>
    etat(preparationDuJour({ recuperation: [aujourdhui(m)], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES }), 'subjectif');

  it('rouge si courbatures ≥ 4/5', () => expect(sub({ sore: 4 }).etat).toBe('rouge'));
  it('rouge si énergie ≤ 2/5', () => expect(sub({ energy: 2 }).etat).toBe('rouge'));
  it('vert si courbatures 3 et énergie 3', () => expect(sub({ sore: 3, energy: 3 }).etat).toBe('vert'));
  it("inconnu sans check-in aujourd'hui", () => {
    const res = preparationDuJour({ recuperation: [], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(etat(res, 'subjectif').etat).toBe('inconnu');
  });
});

describe('R-04 : signal performance', () => {
  const perf = (s: Seance[]) =>
    etat(preparationDuJour({ recuperation: [], seances: s, aujourdhui: AUJOURDHUI, ciblesReps: CIBLES }), 'performance');

  it('rouge si reps réalisées / reps ciblées < 0,85', () => {
    // 3 séries, cible 10 : 8+8+8 = 24/30 = 0,8
    expect(perf([seanceForce([8, 8, 8])]).etat).toBe('rouge');
  });
  it('vert à exactement 0,85', () => {
    // cible 10 x 2 séries = 20 ; 17/20 = 0,85
    expect(perf([seanceForce([9, 8])]).etat).toBe('vert');
  });
  it("exclut les séries d'échauffement", () => {
    // l'échauffement à 3 reps ne doit pas faire baisser le ratio : 10+10 / 20 = 1
    expect(perf([seanceForce([3, 10, 10], ['warmup'])]).etat).toBe('vert');
  });
  it('inconnu sans séance de force', () => expect(perf([]).etat).toBe('inconnu'));
  it('utilise la séance de force la plus récente', () => {
    const vieille = { ...seanceForce([2, 2, 2]), id: 'v', date: '2026-10-01T18:00:00' };
    expect(perf([vieille, seanceForce([10, 10, 10])]).etat).toBe('vert');
  });
});

describe('R-05 à R-08 : verdict « 2 sur 3 »', () => {
  const rougePhysio = aujourdhui({ hrv: 50, rhr: 62, sore: 2, energy: 4 });
  const rougeSubj = { sore: 5 };

  it('R-07 : aucun signal rouge → normale', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 60, rhr: 55, sore: 2, energy: 4 })], seances: [seanceForce([10, 10, 10])], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(res.verdict).toBe('normale');
    expect(res.regles).toContain('R-07');
  });

  it('R-06 : un seul signal rouge → vigilance', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, rougePhysio], seances: [seanceForce([10, 10, 10])], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(res.rouges).toBe(1);
    expect(res.verdict).toBe('vigilance');
    expect(res.regles).toContain('R-06');
  });

  it('R-05 : deux signaux rouges → allégée', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 50, rhr: 62, ...rougeSubj })], seances: [seanceForce([10, 10, 10])], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(res.verdict).toBe('allegee');
    expect(res.regles).toContain('R-05');
  });

  it('R-05 : trois signaux rouges → allégée', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 50, rhr: 62, ...rougeSubj })], seances: [seanceForce([5, 5, 5])], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(res.rouges).toBe(3);
    expect(res.verdict).toBe('allegee');
  });

  it('R-08 : le subjectif rouge seul, avec une HRV bonne, passe au moins à vigilance', () => {
    const res = preparationDuJour({ recuperation: [...HISTORIQUE, aujourdhui({ hrv: 60, rhr: 55, ...rougeSubj })], seances: [seanceForce([10, 10, 10])], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(res.verdict).toBe('vigilance');
    expect(res.regles).toContain('R-08');
  });

  it("un signal inconnu n'est jamais compté comme rouge", () => {
    const res = preparationDuJour({ recuperation: [], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(res.rouges).toBe(0);
    expect(res.verdict).toBe('normale');
    expect(res.aDesDonnees).toBe(false);
  });

  it('chaque résultat porte une explication en une phrase', () => {
    const res = preparationDuJour({ recuperation: [], seances: [], aujourdhui: AUJOURDHUI, ciblesReps: CIBLES });
    expect(res.explication.length).toBeGreaterThan(10);
    res.signaux.forEach((s) => expect(s.raison.length).toBeGreaterThan(5));
  });
});
