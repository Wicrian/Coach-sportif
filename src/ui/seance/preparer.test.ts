import { describe, expect, it } from 'vitest';
import type { InventaireHalteres, Profil, Seance } from '../../donnees/types';
import { chargesDuProfil, compterLissage, preparerSeance } from './preparer';
import { MODELES } from '../../donnees/exercices';

const INVENTAIRE: InventaireHalteres = { barre: 1.5978, disques: [{ poids: 1.1, quantite: 4 }, { poids: 2.3, quantite: 4 }] };
const PROFIL: Profil = { gear: [], dumbbells: [], halteres: INVENTAIRE };
const FB = MODELES.find((m) => m.id === 'fb')!;
const BW = MODELES.find((m) => m.id === 'bw')!;

let n = 0;
const seanceAvec = (jour: string, key: string, charge: number, reps: number[]): Seance => ({
  id: `h${n++}`, date: `${jour}T18:00:00`, kind: 'strength', tplId: 'fb',
  exercises: [{ key, sets: [{ type: 'warmup', w: 1.6, reps: 10 }, ...reps.map((r) => ({ type: 'normal' as const, w: charge, reps: r }))] }],
});
const exo = (plan: ReturnType<typeof preparerSeance>, key: string) => plan.exercices.find((e) => e.key === key)!;

describe('chargesDuProfil', () => {
  it('calcule les charges réalisables à partir de la barre et des disques', () => {
    const c = chargesDuProfil(PROFIL);
    expect(c.paire).toEqual([1.6, 3.8, 6.2, 8.4]);
    expect(c.unique).toContain(15.2);
  });

  it('retombe sur les anciennes charges fixes si aucun inventaire n\'est saisi', () => {
    const c = chargesDuProfil({ gear: [], dumbbells: [2.5, 5, 10] });
    expect(c.paire).toEqual([2.5, 5, 10]);
    expect(c.unique).toEqual([2.5, 5, 10]);
  });
});

describe('compterLissage (R-23) : séances de lissage déjà faites', () => {
  const s = (reps: number[], charge = 3.8) => seanceAvec('2026-10-01', 'goblet', charge, reps);
  it('0 si la dernière séance n\'a pas dépassé la cible', () => expect(compterLissage([s([12, 11, 12])], 'goblet', 12)).toBe(0));
  it('0 à la première séance qui dépasse la cible (c\'est elle qui déclenche le lissage)', () => expect(compterLissage([s([13, 13, 13])], 'goblet', 12)).toBe(0));
  it('compte les séances suivantes à la même charge', () => {
    const hist = [s([14, 14, 14]), s([14, 13, 14]), s([13, 13, 13])]; // du plus récent au plus ancien : 3 qualifiantes
    expect(compterLissage(hist, 'goblet', 12)).toBe(2);
  });
  it('s\'arrête quand la charge change', () => {
    expect(compterLissage([s([14, 14, 14], 6.2), s([14, 14, 14], 3.8)], 'goblet', 12)).toBe(0);
  });
});

describe('preparerSeance : séance du jour calculée par le moteur', () => {
  it('première fois : charge de départ réalisable, séries et reps cibles', () => {
    const plan = preparerSeance({ modele: FB, seances: [], profil: PROFIL });
    const g = exo(plan, 'goblet');
    expect(g.series).toHaveLength(3);
    expect(g.series.every((x) => x.w === 3.8 && x.reps === 12)).toBe(true); // 5 kg conseillés → 3,8 kg réalisable (un seul haltère)
    expect(g.regles).toContain('R-22');
  });

  it('applique le lissage : saut trop grand → même charge, plus de reps (R-23)', () => {
    const plan = preparerSeance({ modele: FB, seances: [seanceAvec('2026-10-01', 'goblet', 3.8, [13, 13, 13])], profil: PROFIL });
    const g = exo(plan, 'goblet');
    expect(g.series[0]).toMatchObject({ w: 3.8, reps: 14 });
    expect(g.regles).toContain('R-23');
  });

  it('au poids du corps : une rep de plus quand tout dépasse la cible de 2 (R-24)', () => {
    const hist: Seance[] = [{ id: 'p', date: '2026-10-01T18:00:00', kind: 'strength', tplId: 'bw', exercises: [{ key: 'pushup', sets: [10, 10, 10].map((r) => ({ type: 'normal' as const, w: 0, reps: r })) }] }];
    const p = exo(preparerSeance({ modele: BW, seances: hist, profil: PROFIL }), 'pushup');
    expect(p.series[0]).toMatchObject({ w: 0, reps: 11 });
  });

  it('explique son choix en une phrase et donne le montage des disques', () => {
    const g = exo(preparerSeance({ modele: FB, seances: [], profil: PROFIL }), 'goblet');
    expect(g.raison.length).toBeGreaterThan(10);
    expect(g.montage).toEqual([{ poids: 1.1, quantite: 1 }]);
  });

  it('regroupe les exercices par charge : chaque charge forme un seul bloc (R-26)', () => {
    const hist = [
      seanceAvec('2026-10-01', 'ohp', 1.6, [10, 10, 10]),
      seanceAvec('2026-10-01', 'bench', 3.8, [10, 10, 10]),
      seanceAvec('2026-10-01', 'row', 1.6, [10, 10, 10]),
      seanceAvec('2026-10-01', 'goblet', 3.8, [12, 12, 12]),
    ];
    const plan = preparerSeance({ modele: FB, seances: hist, profil: PROFIL });
    const charges = plan.exercices.filter((e) => !e.poidsDuCorps).map((e) => e.series[0]!.w);
    const blocs = charges.filter((c, i) => i === 0 || c !== charges[i - 1]);
    expect(new Set(blocs).size).toBe(blocs.length);
    expect(plan.changements).toBe(blocs.length - 1);
    expect(plan.regles).toContain('R-26');
  });

  it('garde tous les exercices du modèle', () => {
    expect(preparerSeance({ modele: FB, seances: [], profil: PROFIL }).exercices.map((e) => e.key).sort()).toEqual([...FB.exercices].sort());
  });
});
