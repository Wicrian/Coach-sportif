import { describe, expect, it } from 'vitest';
import type { Seance, Serie } from '../donnees/types';
import { reperesDeLaSemaine } from './reperes';

const muscles: Record<string, string[]> = { goblet: ['Jambes'], ohp: ['Épaules'], bench: ['Pectoraux'], rdl: ['Ischios', 'Fessiers'] };
const muscleDe = (k: string) => muscles[k] ?? [];
const sets = (n: number, type: Serie['type'] = 'normal'): Serie[] => Array.from({ length: n }, () => ({ type, w: 3.8, reps: 10 }));
const force = (jour: string, exercices: Array<[string, number]>, min = 40): Seance => ({
  id: jour + exercices.map((e) => e[0]).join(''), date: `${jour}T18:00:00`, kind: 'strength', durationMin: min,
  exercises: exercices.map(([key, n]) => ({ key, sets: sets(n) })),
});
const autre = (jour: string, kind: Seance['kind'], min: number): Seance => ({ id: jour + kind, date: `${jour}T12:00:00`, kind, durationMin: min, exercises: [] });

// 2026-10-12 est un lundi ; la semaine va jusqu'au dimanche 18.
describe('reperesDeLaSemaine', () => {
  it('compte les séries de travail par muscle, échauffements exclus', () => {
    const s: Seance = { ...force('2026-10-13', [['goblet', 3]]), exercises: [{ key: 'goblet', sets: [...sets(2, 'warmup'), ...sets(3)] }] };
    const r = reperesDeLaSemaine([s], s, muscleDe);
    expect(r.muscles).toEqual([{ muscle: 'Jambes', series: 3, seances: 1, etat: 'sous' }]);
  });

  it('classe selon le repère débutant : moins de 4, de 4 à 10, plus de 10', () => {
    const detail = (n: number) => reperesDeLaSemaine([force('2026-10-13', [['goblet', n]])], force('2026-10-13', [['goblet', n]]), muscleDe).muscles[0]!.etat;
    expect(detail(3)).toBe('sous');
    expect(detail(4)).toBe('dans');
    expect(detail(10)).toBe('dans');
    expect(detail(11)).toBe('au-dessus');
  });

  it('additionne plusieurs séances de la semaine et compte la fréquence', () => {
    const a = force('2026-10-12', [['goblet', 3]]);
    const b = force('2026-10-15', [['goblet', 3], ['ohp', 3]]);
    const r = reperesDeLaSemaine([a, b], b, muscleDe);
    expect(r.muscles.find((m) => m.muscle === 'Jambes')).toMatchObject({ series: 6, seances: 2, etat: 'dans' });
    expect(r.muscles.find((m) => m.muscle === 'Épaules')).toMatchObject({ series: 3, seances: 1 });
  });

  it('un exercice qui travaille deux muscles compte pour les deux', () => {
    const s = force('2026-10-13', [['rdl', 3]]);
    const r = reperesDeLaSemaine([s], s, muscleDe);
    expect(r.muscles.map((m) => m.muscle).sort()).toEqual(['Fessiers', 'Ischios']);
  });

  it('ne regarde que la semaine de la séance, et pas les séances postérieures', () => {
    const avant = force('2026-10-07', [['goblet', 6]]); // semaine précédente
    const cette = force('2026-10-13', [['goblet', 3]]);
    const apres = force('2026-10-16', [['goblet', 6]]); // plus tard dans la semaine
    const r = reperesDeLaSemaine([avant, cette, apres], cette, muscleDe);
    expect(r.muscles[0]!.series).toBe(3);
  });

  it('additionne le temps d\'activité de toutes les séances, de tout type', () => {
    const f = force('2026-10-13', [['goblet', 3]], 40);
    // la marche du 13 à midi est avant la séance de 18 h ; celle du 15 est postérieure et ne compte pas
    const r = reperesDeLaSemaine([f, autre('2026-10-12', 'box', 35), autre('2026-10-13', 'walk', 25), autre('2026-10-15', 'walk', 30)], f, muscleDe);
    expect(r.minutes).toBe(100);
    expect(r.minutesRepere).toBe(150);
  });

  it('une séance sans durée connue ne compte pas de minutes', () => {
    const s: Seance = { ...force('2026-10-13', [['goblet', 3]]), durationMin: undefined };
    expect(reperesDeLaSemaine([s], s, muscleDe).minutes).toBe(0);
  });
});
