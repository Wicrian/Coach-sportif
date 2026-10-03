import { describe, expect, it } from 'vitest';
import { arreter, demarrer, finDeRepos, saisieInitiale, terminer, valider, ajouterSerieBonus, type Brouillon } from './deroulement';
import type { ExercicePlan, PlanSeance } from './preparer';

const exo = (key: string, w: number, reps: number, series = 2): ExercicePlan => ({
  key, nom: key, muscle: 'm', mode: 'paire', poidsDuCorps: w === 0, reposSec: 60, deuxHalteres: false,
  series: Array.from({ length: series }, () => ({ w, reps })), raison: 'ok', regles: ['R-22'], montage: null, chargesDispo: [],
});
const PLAN: PlanSeance = { modeleId: 'fb', nom: 'Test', exercices: [exo('a', 3.8, 10), exo('b', 6.2, 12)], changements: 1, regles: ['R-26'] };
const T0 = new Date('2026-10-03T18:00:00Z');

const jouer = (b: Brouillon, nb: number): Brouillon => {
  let cur = b;
  for (let i = 0; i < nb; i++) {
    const s = saisieInitiale(cur);
    cur = valider(cur, { ...s, type: 'normal' });
    if (cur.phase === 'repos') cur = finDeRepos(cur);
  }
  return cur;
};

describe('démarrer', () => {
  it('commence à la première série du premier exercice', () => {
    const b = demarrer(PLAN, T0);
    expect(b).toMatchObject({ phase: 'serie', ei: 0, si: 0, modeleId: 'fb', debut: T0.toISOString() });
  });
});

describe('saisie pré-remplie', () => {
  it('reprend reps et charge prévues par le moteur', () => {
    expect(saisieInitiale(demarrer(PLAN, T0))).toEqual({ reps: 10, w: 3.8 });
  });

  it('reprend la charge que l\'utilisateur vient de choisir pour la série suivante du même exercice', () => {
    let b = demarrer(PLAN, T0);
    b = valider(b, { reps: 9, w: 1.6, type: 'normal' });
    b = finDeRepos(b);
    expect(saisieInitiale(b)).toEqual({ reps: 10, w: 1.6 });
  });
});

describe('valider une série', () => {
  it('garde le réalisé ET le prévu', () => {
    const b = valider(demarrer(PLAN, T0), { reps: 9, w: 3.8, type: 'normal' });
    expect(b.realisees[0]![0]).toEqual({ type: 'normal', w: 3.8, reps: 9, wPrevu: 3.8, repsPrevus: 10 });
  });

  it('passe au repos, puis à la série suivante', () => {
    let b = valider(demarrer(PLAN, T0), { reps: 10, w: 3.8, type: 'normal' });
    expect(b.phase).toBe('repos');
    b = finDeRepos(b);
    expect(b).toMatchObject({ phase: 'serie', ei: 0, si: 1 });
  });

  it('enchaîne sur l\'exercice suivant après la dernière série', () => {
    const b = jouer(demarrer(PLAN, T0), 2);
    expect(b).toMatchObject({ phase: 'serie', ei: 1, si: 0 });
  });

  it('un échauffement est enregistré comme tel', () => {
    const b = valider(demarrer(PLAN, T0), { reps: 10, w: 1.6, type: 'warmup' });
    expect(b.realisees[0]![0]!.type).toBe('warmup');
  });

  it('finit après la toute dernière série, sans repos', () => {
    const b = jouer(demarrer(PLAN, T0), 3);
    const fin = valider(b, { ...saisieInitiale(b), type: 'normal' });
    expect(fin.phase).toBe('fin');
  });
});

describe('poussée douce : série bonus', () => {
  it('ajoute une série au dernier exercice et reprend', () => {
    let b = jouer(demarrer(PLAN, T0), 3);
    b = valider(b, { ...saisieInitiale(b), type: 'normal' });
    expect(b.phase).toBe('fin');
    b = ajouterSerieBonus(b);
    expect(b).toMatchObject({ phase: 'serie', ei: 1, si: 2 });
    expect(saisieInitiale(b).w).toBe(6.2);
  });
});

describe('terminer', () => {
  it('produit une séance enregistrable, au même format que le prototype', () => {
    let b = jouer(demarrer(PLAN, T0), 3);
    b = valider(b, { ...saisieInitiale(b), type: 'normal' });
    const s = terminer(b, 4, new Date('2026-10-03T18:38:00Z'));
    expect(s).toMatchObject({ kind: 'strength', tplId: 'fb', feel: 4, durationMin: 38 });
    expect(s.date).toBe(T0.toISOString());
    expect(s.exercises.map((e) => e.key)).toEqual(['a', 'b']);
    expect(s.exercises[0]!.sets).toHaveLength(2);
    expect(s.id).toBeTruthy();
  });

  it('n\'inclut pas les exercices sans aucune série faite', () => {
    const b = valider(demarrer(PLAN, T0), { reps: 10, w: 3.8, type: 'normal' });
    const s = terminer(b, undefined, new Date('2026-10-03T18:10:00Z'));
    expect(s.exercises.map((e) => e.key)).toEqual(['a']);
    expect(s.feel).toBeUndefined();
  });
});

describe('arrêter avant la fin', () => {
  it('passe à la fin de séance et ne garde que ce qui a été fait', () => {
    const b = arreter(jouer(demarrer(PLAN, T0), 1));
    expect(b.phase).toBe('fin');
    const s = terminer(b, 3, new Date('2026-10-03T18:20:00Z'));
    expect(s.exercises).toHaveLength(1);
    expect(s.exercises[0]!.sets).toHaveLength(1);
  });
});

describe('terminer avec des détails', () => {
  it('garde l\'effort, la FC et la note saisis en fin de séance', () => {
    const b = valider(demarrer(PLAN, T0), { reps: 10, w: 3.8, type: 'normal' });
    const s = terminer(b, 4, new Date('2026-10-03T18:30:00Z'), { effort: 7, reserve: '1-2', fc: { moy: 128, max: 171 }, note: 'bien' });
    expect(s).toMatchObject({ feel: 4, effort: 7, reserve: '1-2', fc: { moy: 128, max: 171 }, note: 'bien' });
  });
});
