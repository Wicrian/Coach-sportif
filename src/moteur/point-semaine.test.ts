import { describe, expect, it } from 'vitest';
import type { Seance } from '../donnees/types';
import { optionsDeSecours, palierArret, pointDeLaSemaine, projeter, joursSansSeance, lundiDuPoint } from './point-semaine';

const seance = (jour: string, kind: Seance['kind'] = 'strength', minutes = 40): Seance => ({
  id: `${jour}-${kind}`, date: new Date(`${jour}T12:00:00`).toISOString(), kind, durationMin: minutes, exercises: [],
});

describe('arrêt — jours sans séance', () => {
  it('ne dit rien quand il n\'y a aucune séance', () => {
    expect(joursSansSeance([], '2026-10-22')).toBeNull();
  });

  it('compte les jours depuis la dernière séance', () => {
    expect(joursSansSeance([seance('2026-10-17'), seance('2026-10-10')], '2026-10-22')).toBe(5);
    expect(joursSansSeance([seance('2026-10-22')], '2026-10-22')).toBe(0);
  });
});

describe('arrêt — paliers (estimations, hypothèses §25)', () => {
  it('une semaine sans séance reste « normal »', () => {
    expect(palierArret(0)).toBe('normal');
    expect(palierArret(7)).toBe('normal');
  });

  it('de 8 à 14 jours : le début', () => {
    expect(palierArret(8)).toBe('debut');
    expect(palierArret(14)).toBe('debut');
  });

  it('de 15 à 28 jours : léger (arrêt de courte durée, 4 semaines ou moins)', () => {
    expect(palierArret(15)).toBe('leger');
    expect(palierArret(28)).toBe('leger');
  });

  it('au-delà de 4 semaines : net (arrêt de longue durée)', () => {
    expect(palierArret(29)).toBe('net');
    expect(palierArret(90)).toBe('net');
  });

  it('projette ce qui se passerait en continuant 3 et 7 jours de plus', () => {
    expect(projeter(5)).toEqual([
      { dansJours: 3, jours: 8, palier: 'debut' },
      { dansJours: 7, jours: 12, palier: 'debut' },
    ]);
    expect(projeter(12)[1]).toEqual({ dansJours: 7, jours: 19, palier: 'leger' });
  });

  it('depuis une séance du jour, 3 et 7 jours de plus restent « normal »', () => {
    expect(projeter(0).map((x) => x.palier)).toEqual(['normal', 'normal']);
  });
});

describe('le point de la semaine', () => {
  const lundi = '2026-10-12';

  it('trouve le lundi de la semaine en cours et de la précédente', () => {
    expect(lundiDuPoint('2026-10-22', 'courante')).toBe('2026-10-19');
    expect(lundiDuPoint('2026-10-22', 'precedente')).toBe('2026-10-12');
  });

  it('une semaine sans séance : statut « aucune »', () => {
    const p = pointDeLaSemaine([], lundi, '2026-10-22');
    expect(p).toMatchObject({ nbSeances: 0, minutes: 0, statut: 'aucune', semaineReussie: false, enCours: false });
  });

  it('une séance de force : « maintien » (1 séance suffit à garder sa force, Spiering 2021)', () => {
    const p = pointDeLaSemaine([seance('2026-10-14')], lundi, '2026-10-22');
    expect(p).toMatchObject({ nbSeances: 1, seancesForce: 1, statut: 'maintien' });
  });

  it('deux séances de force : « progression » (R-11)', () => {
    const p = pointDeLaSemaine([seance('2026-10-13'), seance('2026-10-16')], lundi, '2026-10-22');
    expect(p.statut).toBe('progression');
  });

  it('de l\'activité sans force : « mouvement »', () => {
    const p = pointDeLaSemaine([seance('2026-10-13', 'walk', 25), seance('2026-10-15', 'box', 20)], lundi, '2026-10-22');
    expect(p).toMatchObject({ statut: 'mouvement', minutes: 45, seancesForce: 0, joursActifs: 2 });
  });

  it('trois séances de n\'importe quel type font une semaine réussie (R-40)', () => {
    const p = pointDeLaSemaine([seance('2026-10-12', 'walk'), seance('2026-10-14', 'mob'), seance('2026-10-16', 'box')], lundi, '2026-10-22');
    expect(p.semaineReussie).toBe(true);
  });

  it('ignore les séances des autres semaines, dimanche inclus', () => {
    const p = pointDeLaSemaine([seance('2026-10-11'), seance('2026-10-18'), seance('2026-10-19')], lundi, '2026-10-22');
    expect(p.nbSeances).toBe(1);
  });

  it('dit si la semaine est encore en cours', () => {
    expect(pointDeLaSemaine([], '2026-10-19', '2026-10-22').enCours).toBe(true);
    expect(pointDeLaSemaine([], '2026-10-12', '2026-10-22').enCours).toBe(false);
  });

  it('compte plusieurs séances le même jour pour un seul jour actif', () => {
    const p = pointDeLaSemaine([seance('2026-10-13', 'strength'), seance('2026-10-13', 'box')], lundi, '2026-10-22');
    expect(p).toMatchObject({ nbSeances: 2, joursActifs: 1 });
  });
});

describe('que faire quand on ne peut pas faire la séance prévue', () => {
  it('propose quatre options honnêtes : force minimale, intensif court, cardio court, mini-dose', () => {
    const o = optionsDeSecours('mixte', { allegee: false });
    expect(o.map((x) => x.id).sort()).toEqual(['cardio-court', 'force-minimale', 'intensif-court', 'mini-dose']);
  });

  it('n\'en propose que trois quand la préparation du jour est allégée : pas d\'intensif (prudence)', () => {
    const o = optionsDeSecours('mixte', { allegee: true });
    expect(o.map((x) => x.id)).not.toContain('intensif-court');
    expect(o).toHaveLength(3);
  });

  it('pour prendre du muscle, la force minimale passe en premier, l\'intensif court ensuite', () => {
    const o = optionsDeSecours('muscle', { allegee: false });
    expect(o[0]!.id).toBe('force-minimale');
    expect(o[1]!.id).toBe('intensif-court');
  });

  it('pour perdre du poids, l\'intensif court passe en premier, la force reste proposée (elle protège le muscle)', () => {
    const o = optionsDeSecours('perte', { allegee: false });
    expect(o[0]!.id).toBe('intensif-court');
    expect(o.map((x) => x.id)).toContain('force-minimale');
  });

  it('quand l\'intensif n\'est pas proposé, pour la perte de poids le cardio court passe en premier', () => {
    expect(optionsDeSecours('perte', { allegee: true })[0]!.id).toBe('cardio-court');
  });

  it('la mini-dose est toujours la dernière et la plus courte', () => {
    for (const allegee of [false, true]) {
      const o = optionsDeSecours(undefined, { allegee });
      expect(o[o.length - 1]!.id).toBe('mini-dose');
      expect(o[o.length - 1]!.dureeMin).toBe(Math.min(...o.map((x) => x.dureeMin)));
    }
  });

  it('l\'intensif court dure environ 12 minutes, échauffement compris', () => {
    expect(optionsDeSecours('mixte', { allegee: false }).find((x) => x.id === 'intensif-court')!.dureeMin).toBe(12);
  });
});
