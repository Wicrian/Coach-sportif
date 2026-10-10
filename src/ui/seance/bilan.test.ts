import { describe, expect, it } from 'vitest';
import type { Donnees, InventaireHalteres, Seance } from '../../donnees/types';
import { preparerBilan } from './bilan';

const INVENTAIRE: InventaireHalteres = { barre: 1.5978, disques: [{ poids: 1.1, quantite: 4 }, { poids: 2.3, quantite: 4 }] };
const serie = (w: number, reps: number, wPrevu: number, repsPrevus: number) => ({ type: 'normal' as const, w, reps, wPrevu, repsPrevus });
const force = (id: string, date: string, extra: Partial<Seance> = {}): Seance => ({
  id, date, kind: 'strength', tplId: 'fb', durationMin: 40,
  exercises: [{ key: 'goblet', sets: [serie(3.8, 13, 3.8, 12), serie(3.8, 13, 3.8, 12), serie(3.8, 13, 3.8, 12)] }],
  ...extra,
});
const donnees = (seances: Seance[]): Donnees => ({ profil: { gear: [], dumbbells: [], halteres: INVENTAIRE }, seances, recuperation: [] });

describe('preparerBilan', () => {
  it('assemble les faits, les phrases et la suite proposée par le moteur', () => {
    const s = force('b', '2026-10-10T18:00:00');
    const prec = force('a', '2026-10-03T18:00:00');
    const b = preparerBilan(s, donnees([s, prec]))!;
    expect(b.accompli.join(' ')).toMatch(/3 séries/);
    expect(b.suite.join(' ')).toMatch(/Squat gobelet/);
  });

  it('la suite tient compte de cette séance : tout au-dessus de la cible → lissage', () => {
    const s = force('b', '2026-10-10T18:00:00');
    const b = preparerBilan(s, donnees([s]))!;
    expect(b.suite.join(' ')).toMatch(/grand saut|plus de reps/);
  });

  it('n\'utilise pas les séances postérieures pour ce bilan', () => {
    const s = force('b', '2026-10-10T18:00:00');
    const futur = force('c', '2026-10-17T18:00:00', { feel: 1 });
    const b = preparerBilan(s, donnees([futur, s]))!;
    expect(b.ressenti.join(' ')).not.toMatch(/allégée/);
  });

  it('annonce l\'allègement quand cette séance a été pénible', () => {
    const s = force('b', '2026-10-10T18:00:00', { feel: 1 });
    const b = preparerBilan(s, donnees([s]))!;
    expect(b.ressenti.join(' ')).toMatch(/allégée d'un cran/);
  });

  it('une séance faite ailleurs a un bilan court', () => {
    const s: Seance = { id: 'x', date: '2026-10-10T12:00:00', kind: 'box', durationMin: 35, source: 'Boxa', feel: 4, exercises: [] };
    const b = preparerBilan(s, donnees([s]))!;
    expect(b.accompli.join(' ')).toMatch(/Boxe, 35 min/);
    expect(b.suite).toEqual([]);
  });
});
