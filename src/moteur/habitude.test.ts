import { describe, expect, it } from 'vitest';
import type { Seance } from '../donnees/types';
import { evaluerHabitude } from './habitude';
import { ajouterJours } from './utilitaires';

// Semaines du lundi au dimanche. 2026-10-05 est un lundi.
const AUJOURDHUI = '2026-10-14'; // mercredi de la semaine du 12 au 18

let n = 0;
const seance = (jour: string, kind: Seance['kind'] = 'strength'): Seance => ({ id: `s${n++}`, date: `${jour}T18:00:00`, kind, exercises: [] });
/** k séances réparties sur les k premiers jours de la semaine qui commence le lundi donné. */
const semaine = (lundi: string, k: number): Seance[] =>
  Array.from({ length: k }, (_, i) => seance(ajouterJours(lundi, i)));

describe('R-40 : semaine réussie à partir de 3 séances', () => {
  it('2 séances ne font pas une semaine réussie, 3 oui', () => {
    expect(evaluerHabitude([...semaine('2026-10-05', 2)], '2026-10-11').serieActuelle).toBe(0);
    expect(evaluerHabitude([...semaine('2026-10-05', 3)], '2026-10-11').serieActuelle).toBe(1);
  });

  it('toutes les séances comptent (marche, mobilité, boxe…), pas seulement la force', () => {
    const s = [seance('2026-10-05', 'walk'), seance('2026-10-06', 'mob'), seance('2026-10-07', 'box')];
    expect(evaluerHabitude(s, '2026-10-11').serieActuelle).toBe(1);
  });

  it('compte les séries consécutives de semaines réussies', () => {
    const s = [...semaine('2026-09-21', 3), ...semaine('2026-09-28', 4), ...semaine('2026-10-05', 3)];
    const h = evaluerHabitude(s, '2026-10-11');
    expect(h.serieActuelle).toBe(3);
    expect(h.regles).toContain('R-40');
  });
});

describe('R-41 : la semaine en cours ne casse jamais la série', () => {
  it('semaine en cours à 1 séance : la série de la semaine précédente reste intacte', () => {
    const s = [...semaine('2026-10-05', 3), seance('2026-10-12')];
    const h = evaluerHabitude(s, AUJOURDHUI);
    expect(h.serieActuelle).toBe(1);
    expect(h.cetteSemaine).toBe(1);
    expect(h.regles).toContain('R-41');
  });

  it('semaine en cours réussie : elle compte', () => {
    const s = [...semaine('2026-10-05', 3), ...semaine('2026-10-12', 3)];
    expect(evaluerHabitude(s, AUJOURDHUI).serieActuelle).toBe(2);
  });
});

describe('R-42 : une semaine manquée n\'efface pas l\'historique', () => {
  const s = [...semaine('2026-09-14', 3), ...semaine('2026-09-21', 3), ...semaine('2026-09-28', 3), ...semaine('2026-10-05', 0), ...semaine('2026-10-12', 1)];

  it('la série actuelle repart de zéro mais la plus longue et le total restent', () => {
    // semaine du 5 octobre manquée → série actuelle = 0
    const h = evaluerHabitude([...s, ...semaine('2026-10-12', 0)], AUJOURDHUI);
    expect(h.serieActuelle).toBe(0);
    expect(h.plusLongue).toBe(3);
    expect(h.totalSemainesReussies).toBe(3);
    expect(h.regles).toContain('R-42');
  });
});

describe('R-43 : adhésion < 4 séances/semaine sur 2 semaines consécutives', () => {
  it('propose le « si… alors… » quand les 2 dernières semaines complètes sont sous 4 séances', () => {
    const s = [...semaine('2026-09-28', 3), ...semaine('2026-10-05', 3)];
    const h = evaluerHabitude(s, AUJOURDHUI);
    expect(h.proposerSiAlors).toBe(true);
    expect(h.regles).toContain('R-43');
  });

  it('ne propose rien si une des 2 semaines atteint 4 séances', () => {
    const s = [...semaine('2026-09-28', 4), ...semaine('2026-10-05', 3)];
    expect(evaluerHabitude(s, AUJOURDHUI).proposerSiAlors).toBe(false);
  });

  it('ne propose rien avant d\'avoir 2 semaines complètes d\'historique', () => {
    expect(evaluerHabitude(semaine('2026-10-05', 1), AUJOURDHUI).proposerSiAlors).toBe(false);
  });

  it('la semaine en cours n\'est jamais jugée', () => {
    const s = [...semaine('2026-09-28', 4), ...semaine('2026-10-05', 4), seance('2026-10-12')];
    expect(evaluerHabitude(s, AUJOURDHUI).proposerSiAlors).toBe(false);
  });
});

describe('semaines actives', () => {
  it('compte les semaines avec au moins une séance', () => {
    const s = [...semaine('2026-09-21', 1), ...semaine('2026-10-05', 2)];
    expect(evaluerHabitude(s, AUJOURDHUI).semainesActives).toBe(2);
  });
  it('aucun historique : tout à zéro', () => {
    const h = evaluerHabitude([], AUJOURDHUI);
    expect([h.serieActuelle, h.plusLongue, h.totalSemainesReussies, h.semainesActives, h.cetteSemaine]).toEqual([0, 0, 0, 0, 0]);
    expect(h.proposerSiAlors).toBe(false);
  });
});
