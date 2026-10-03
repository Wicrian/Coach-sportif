import { describe, expect, it } from 'vitest';
import { jourDe } from './utilitaires';

describe('jourDe : le jour local d\'une date de séance', () => {
  it('une date sans fuseau est lue telle quelle', () => {
    expect(jourDe('2026-10-03T18:00:00')).toBe('2026-10-03');
  });

  it('une séance du soir enregistrée en heure universelle reste dans sa journée locale', () => {
    // 23 h 30 locale, convertie en UTC (ISO avec « Z ») : le jour UTC peut être le lendemain.
    const soir = new Date(2026, 9, 3, 23, 30).toISOString();
    expect(jourDe(soir)).toBe('2026-10-03');
  });

  it('une séance de début de matinée reste dans sa journée locale', () => {
    const matin = new Date(2026, 9, 4, 0, 20).toISOString();
    expect(jourDe(matin)).toBe('2026-10-04');
  });
});
