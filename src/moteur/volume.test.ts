import { describe, expect, it } from 'vitest';
import type { Seance, Serie } from '../donnees/types';
import { e1rm, volumeSerie, volumeSeance } from './volume';

const s = (type: Serie['type'], w: number, reps: number): Serie => ({ type, w, reps });

describe('volume (règles, section 9)', () => {
  it('charge × reps, échauffements exclus', () => {
    expect(volumeSerie(s('normal', 5, 10), false)).toBe(50);
    expect(volumeSerie(s('warmup', 5, 10), false)).toBe(0);
  });

  it('× 2 pour un exercice fait avec deux haltères', () => {
    expect(volumeSerie(s('normal', 5, 10), true)).toBe(100);
  });

  it('une série au poids du corps a un volume nul', () => {
    expect(volumeSerie(s('normal', 0, 12), false)).toBe(0);
  });

  it('volume d\'une séance de force : somme des séries de travail', () => {
    const seance: Seance = {
      id: 'x', date: '2026-10-03T18:00:00', kind: 'strength',
      exercises: [
        { key: 'bench', sets: [s('warmup', 1.6, 10), s('normal', 3.8, 10), s('normal', 3.8, 9)] },
        { key: 'goblet', sets: [s('normal', 6.2, 12)] },
      ],
    };
    const deux = (key: string) => key === 'bench';
    expect(volumeSeance(seance, deux)).toBeCloseTo(3.8 * 10 * 2 + 3.8 * 9 * 2 + 6.2 * 12);
  });

  it('une séance qui n\'est pas de force a un volume nul', () => {
    expect(volumeSeance({ id: 'w', date: '2026-10-03T08:00:00', kind: 'walk', exercises: [] }, () => false)).toBe(0);
  });
});

describe('e1rm (Epley)', () => {
  it('charge × (1 + reps / 30) entre 1 et 10 reps', () => {
    expect(e1rm(5, 10)).toBeCloseTo(5 * (1 + 10 / 30));
    expect(e1rm(5, 1)).toBeCloseTo(5 * (1 + 1 / 30));
  });
  it('null au-delà de 10 reps, sans charge, ou sans rep', () => {
    expect(e1rm(5, 11)).toBeNull();
    expect(e1rm(0, 8)).toBeNull();
    expect(e1rm(5, 0)).toBeNull();
  });
});
