import { describe, expect, it } from 'vitest';
import type { Seance, Serie } from '../donnees/types';
import { analyserSeance } from './debrief';

const s = (w: number, reps: number, wPrevu?: number, repsPrevus?: number, type: Serie['type'] = 'normal'): Serie => {
  const serie: Serie = { type, w, reps };
  if (wPrevu !== undefined) serie.wPrevu = wPrevu;
  if (repsPrevus !== undefined) serie.repsPrevus = repsPrevus;
  return serie;
};
const seance = (exercises: Seance['exercises'], extra: Partial<Seance> = {}): Seance => ({ id: 'x', date: '2026-10-10T18:00:00', kind: 'strength', exercises, ...extra });
const deux = (cle: string) => cle === 'bench';

describe('analyserSeance : les faits d\'une séance de force', () => {
  it('compte les séries de travail (échauffements exclus) et le volume', () => {
    const f = analyserSeance(seance([{ key: 'goblet', sets: [s(1.6, 10, undefined, undefined, 'warmup'), s(3.8, 12, 3.8, 12), s(3.8, 12, 3.8, 12)] }]), null, deux);
    expect(f.series).toBe(2);
    expect(f.volume).toBeCloseTo(3.8 * 12 * 2);
    expect(f.exercices[0]).toMatchObject({ key: 'goblet', series: 2, ecartReps: 0, sens: null });
  });

  it('repère une charge montée ou baissée par rapport au prévu', () => {
    const f = analyserSeance(seance([
      { key: 'goblet', sets: [s(6.2, 12, 3.8, 12), s(6.2, 12, 3.8, 12)] },
      { key: 'row', sets: [s(1.6, 10, 3.8, 10)] },
    ]), null, deux);
    expect(f.exercices[0]).toMatchObject({ chargeFaite: 6.2, chargePrevue: 3.8, sens: 'plus' });
    expect(f.exercices[1]).toMatchObject({ chargeFaite: 1.6, chargePrevue: 3.8, sens: 'moins' });
  });

  it('additionne l\'écart de répétitions avec le prévu', () => {
    const f = analyserSeance(seance([{ key: 'goblet', sets: [s(3.8, 14, 3.8, 12), s(3.8, 11, 3.8, 12), s(3.8, 12, 3.8, 12)] }]), null, deux);
    expect(f.exercices[0]!.ecartReps).toBe(1);
  });

  it('ne compare pas ce qui n\'avait pas de prévu (séance ancienne ou importée)', () => {
    const f = analyserSeance(seance([{ key: 'goblet', sets: [s(3.8, 12), s(3.8, 12)] }]), null, deux);
    expect(f.exercices[0]).toMatchObject({ sens: null, ecartReps: 0, comparable: false });
  });

  it('compare le volume à la séance précédente, avec une marge de 5 % pour « à peu près pareil »', () => {
    const courante = seance([{ key: 'goblet', sets: [s(5, 10)] }]); // 50
    const prec = (v: number) => seance([{ key: 'goblet', sets: [s(v / 10, 10)] }]);
    expect(analyserSeance(courante, prec(40), deux).tendanceVolume).toBe('plus');
    expect(analyserSeance(courante, prec(51), deux).tendanceVolume).toBe('pareil');
    expect(analyserSeance(courante, prec(49), deux).tendanceVolume).toBe('pareil');
    expect(analyserSeance(courante, prec(60), deux).tendanceVolume).toBe('moins');
    expect(analyserSeance(courante, null, deux).tendanceVolume).toBeNull();
  });
});
