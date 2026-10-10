import { describe, expect, it } from 'vitest';
import { demarrerLibre, terminerLibre } from './libre';

const T0 = new Date('2026-10-10T12:00:00Z');

describe('séance libre (boxe, marche, mobilité, cardio léger)', () => {
  it('démarre avec le type et l\'heure', () => {
    expect(demarrerLibre('box', T0)).toEqual({ kind: 'box', debut: T0.toISOString() });
  });

  it('se termine en séance enregistrable, durée comprise', () => {
    const s = terminerLibre(demarrerLibre('box', T0), 4, new Date('2026-10-10T12:41:00Z'));
    expect(s).toMatchObject({ kind: 'box', durationMin: 41, feel: 4, exercises: [] });
    expect(s.date).toBe(T0.toISOString());
    expect(s.id).toBeTruthy();
  });

  it('garde les détails saisis en fin de séance', () => {
    const s = terminerLibre(demarrerLibre('walk', T0), undefined, new Date('2026-10-10T12:30:00Z'), { effort: 3, fc: { moy: 105 }, note: 'tranquille' });
    expect(s).toMatchObject({ effort: 3, fc: { moy: 105 }, note: 'tranquille' });
    expect(s.feel).toBeUndefined();
  });

  it('dure au moins une minute', () => {
    expect(terminerLibre(demarrerLibre('mob', T0), 3, new Date(T0.getTime() + 5000)).durationMin).toBe(1);
  });
});
