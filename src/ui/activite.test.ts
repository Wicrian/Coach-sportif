import { describe, expect, it } from 'vitest';
import { creerSeanceExterne, libelleGenre } from './activite';
import { jourDe } from '../moteur/utilitaires';

const MAINTENANT = new Date(2026, 9, 3, 20, 15);

describe('séance faite ailleurs', () => {
  it('aujourd\'hui : garde l\'heure actuelle', () => {
    const s = creerSeanceExterne({ jour: '2026-10-03', kind: 'box', durationMin: 35, feel: 4, source: 'Boxa' }, MAINTENANT);
    expect(s).toMatchObject({ kind: 'box', durationMin: 35, feel: 4, source: 'Boxa', exercises: [] });
    expect(s.date).toBe(MAINTENANT.toISOString());
    expect(jourDe(s.date)).toBe('2026-10-03');
  });

  it('un autre jour : placée à midi, dans la bonne journée locale', () => {
    const s = creerSeanceExterne({ jour: '2026-10-01', kind: 'walk', durationMin: 30 }, MAINTENANT);
    expect(jourDe(s.date)).toBe('2026-10-01');
    expect(s.feel).toBeUndefined();
    expect(s.source).toBeUndefined();
  });

  it('un identifiant différent à chaque saisie', () => {
    const a = creerSeanceExterne({ jour: '2026-10-03', kind: 'mob', durationMin: 15 }, new Date(2026, 9, 3, 8, 0, 0));
    const b = creerSeanceExterne({ jour: '2026-10-03', kind: 'mob', durationMin: 15 }, new Date(2026, 9, 3, 8, 0, 1));
    expect(a.id).not.toBe(b.id);
  });

  it('libellés en français', () => {
    expect(libelleGenre('strength')).toBe('Force');
    expect(libelleGenre('box')).toBe('Boxe');
    expect(libelleGenre('walk')).toBe('Marche');
    expect(libelleGenre('mob')).toBe('Mobilité');
    expect(libelleGenre('cardio')).toBe('Cardio léger');
  });
});
