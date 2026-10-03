import { describe, expect, it } from 'vitest';
import { fusionnerCheckin } from './checkin';

describe('fusionnerCheckin : le check-in du jour', () => {
  it('crée la mesure du jour', () => {
    expect(fusionnerCheckin(undefined, '2026-10-03', { energy: 4, sore: 2, mood: 3 })).toEqual({ date: '2026-10-03', energy: 4, sore: 2, mood: 3 });
  });

  it('complète la mesure du jour sans effacer ce qui y était (ex. HRV saisie plus tôt)', () => {
    const avant = { date: '2026-10-03', hrv: 61, rhr: 55 };
    expect(fusionnerCheckin(avant, '2026-10-03', { energy: 3 })).toEqual({ date: '2026-10-03', hrv: 61, rhr: 55, energy: 3 });
  });

  it('une nouvelle valeur remplace l\'ancienne', () => {
    expect(fusionnerCheckin({ date: '2026-10-03', energy: 2 }, '2026-10-03', { energy: 4 }).energy).toBe(4);
  });

  it('ignore les champs vides ou invalides', () => {
    const m = fusionnerCheckin(undefined, '2026-10-03', { energy: 3, weight: Number.NaN, hrv: undefined });
    expect(m).toEqual({ date: '2026-10-03', energy: 3 });
  });
});
