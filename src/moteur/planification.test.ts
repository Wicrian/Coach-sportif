import { describe, expect, it } from 'vitest';
import type { Seance } from '../donnees/types';
import { planifier, type Creneau, type EntreePlanification, type JourPlanifie } from './planification';
import { ajouterJours, joursEntre, lundiDeLaSemaine } from './utilitaires';

const AUJOURDHUI = '2026-10-14'; // mercredi. Horizon : 14 → 27 octobre.
const TOUS_LES_JOURS: Creneau[] = [1, 2, 3, 4, 5, 6, 7].map((jour) => ({ jour, moment: 'soir', dureeMaxMin: 120 }));
const WEEK_END: Creneau[] = [6, 7].map((jour) => ({ jour, moment: 'journee', dureeMaxMin: 90 }));

let n = 0;
const fait = (jour: string, kind: Seance['kind'] = 'strength'): Seance => ({ id: `h${n++}`, date: `${jour}T18:00:00`, kind, exercises: [] });

function entree(partiel: Partial<EntreePlanification>): EntreePlanification {
  return { aujourdhui: AUJOURDHUI, seances: [], creneaux: TOUS_LES_JOURS, preparation: 'normale', ...partiel };
}

const estForce = (j: JourPlanifie) => j.type === 'force' || j.type === 'combine';
const estBoxe = (j: JourPlanifie) => j.type === 'boxe' || j.type === 'combine';
const semaineDe = (p: JourPlanifie[], lundi: string) => p.filter((j) => lundiDeLaSemaine(j.jour) === lundi);

describe('R-60 : projection sur 14 jours', () => {
  it('14 jours consécutifs à partir d\'aujourd\'hui', () => {
    const { jours, regles } = planifier(entree({}));
    expect(jours).toHaveLength(14);
    expect(jours[0]!.jour).toBe(AUJOURDHUI);
    expect(jours[13]!.jour).toBe('2026-10-27');
    expect(regles).toContain('R-60');
  });
});

describe('R-61 : les créneaux déclarés', () => {
  it('rien n\'est planifié hors des créneaux : repos les autres jours', () => {
    const { jours } = planifier(entree({ creneaux: WEEK_END }));
    for (const j of jours) {
      const iso = joursEntre(lundiDeLaSemaine(j.jour), j.jour) + 1;
      if (iso < 6) expect(j.type).toBe('repos');
    }
    expect(jours.some((j) => j.type !== 'repos')).toBe(true);
  });

  it('sans aucun créneau, tout est repos', () => {
    expect(planifier(entree({ creneaux: [] })).jours.every((j) => j.type === 'repos')).toBe(true);
  });
});

describe('R-10 : 48 h entre deux séances de force', () => {
  it('jamais deux séances de force à moins de 2 jours, y compris avec la dernière séance déjà faite', () => {
    const { jours } = planifier(entree({ seances: [fait('2026-10-13')] }));
    expect(estForce(jours[0]!)).toBe(false); // hier : trop tôt
    const forces = jours.filter(estForce).map((j) => j.jour);
    expect(forces.length).toBeGreaterThan(0);
    expect(joursEntre('2026-10-13', forces[0]!)).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < forces.length; i++) expect(joursEntre(forces[i - 1]!, forces[i]!)).toBeGreaterThanOrEqual(2);
  });
});

describe('R-11 et boxe : objectifs hebdomadaires', () => {
  it('une semaine complète contient au moins 2 séances de force et 1 de boxe', () => {
    const { jours } = planifier(entree({}));
    const sem = semaineDe(jours, '2026-10-19');
    expect(sem).toHaveLength(7);
    expect(sem.filter(estForce).length).toBeGreaterThanOrEqual(2);
    expect(sem.filter(estBoxe).length).toBeGreaterThanOrEqual(1);
  });

  it('au plus 4 séances par semaine (cible conseillée)', () => {
    const { jours } = planifier(entree({}));
    for (const lundi of ['2026-10-19']) {
      expect(semaineDe(jours, lundi).filter((j) => j.type !== 'repos').length).toBeLessThanOrEqual(4);
    }
  });

  it('un créneau long le week-end accueille une séance combinée force + boxe', () => {
    const { jours } = planifier(entree({ creneaux: [{ jour: 6, moment: 'journee', dureeMaxMin: 90 }] }));
    const samedi = jours.find((j) => j.jour === '2026-10-17')!;
    expect(samedi.type).toBe('combine');
    expect(samedi.dureeMin).toBeLessThanOrEqual(90);
  });

  it('avertit (R-11) quand les créneaux ne permettent pas 2 séances de force par semaine', () => {
    const { avertissements } = planifier(entree({ creneaux: WEEK_END }));
    expect(avertissements.some((a) => a.regle === 'R-11')).toBe(true);
  });

  it('pas d\'avertissement quand les créneaux suffisent', () => {
    expect(planifier(entree({})).avertissements).toEqual([]);
  });
});

describe('R-62 : préparation allégée aujourd\'hui', () => {
  it('la séance du jour devient une récupération active, la suite n\'est pas pénalisée', () => {
    const { jours } = planifier(entree({ preparation: 'allegee' }));
    expect(jours[0]!.type).toBe('recuperation');
    expect(jours[0]!.regles).toContain('R-62');
    expect(jours[0]!.dureeMin).toBeLessThanOrEqual(20);
    expect(estForce(jours[1]!)).toBe(true); // la force n'a pas été consommée aujourd'hui
  });

  it('sans créneau aujourd\'hui, c\'est repos', () => {
    const creneaux = TOUS_LES_JOURS.filter((c) => c.jour !== 3); // aujourd'hui = mercredi
    expect(planifier(entree({ preparation: 'allegee', creneaux })).jours[0]!.type).toBe('repos');
  });
});

describe('semaine chargée et jours indisponibles', () => {
  it('semaine chargée : séances de 30 min maximum, ni force ni combinée', () => {
    const { jours, regles } = planifier(entree({ semaineChargee: true }));
    for (const j of jours) {
      expect(estForce(j)).toBe(false);
      if (j.dureeMin) expect(j.dureeMin).toBeLessThanOrEqual(30);
    }
    expect(jours.some((j) => j.type !== 'repos')).toBe(true);
    expect(regles).toContain('R-63');
  });

  it('semaine chargée jusqu\'à une date : les jours suivants redeviennent normaux', () => {
    const { jours } = planifier(entree({ semaineChargeeJusquAu: '2026-10-18' }));
    for (const j of jours.filter((x) => x.jour <= '2026-10-18')) expect(estForce(j)).toBe(false);
    expect(jours.filter((x) => x.jour > '2026-10-18').some(estForce)).toBe(true);
  });

  it('un jour indisponible reste en repos', () => {
    const { jours } = planifier(entree({ joursIndisponibles: ['2026-10-14', '2026-10-15'] }));
    expect(jours[0]!.type).toBe('repos');
    expect(jours[1]!.type).toBe('repos');
    expect(jours[0]!.raison).toMatch(/indisponible/i);
  });
});

describe('séances déjà faites', () => {
  it('une séance déjà faite aujourd\'hui est affichée comme faite', () => {
    const { jours } = planifier(entree({ seances: [fait(AUJOURDHUI, 'walk')] }));
    expect(jours[0]!.type).toBe('deja-fait');
  });

  it('les séances déjà faites cette semaine comptent dans les objectifs', () => {
    // lundi 12 et mardi 13 : 2 séances dont 1 boxe → la semaine du 12 a déjà 2 séances
    const { jours } = planifier(entree({ seances: [fait('2026-10-12', 'box'), fait('2026-10-13')] }));
    const restant = semaineDe(jours, '2026-10-12').filter((j) => j.type !== 'repos' && j.type !== 'deja-fait');
    expect(restant.length).toBeLessThanOrEqual(2); // 4 au total dans la semaine
  });
});

describe('explication', () => {
  it('chaque jour porte une raison', () => {
    for (const j of planifier(entree({})).jours) expect(j.raison.length).toBeGreaterThan(5);
  });
  it('jours consécutifs', () => {
    const { jours } = planifier(entree({}));
    jours.forEach((j, i) => expect(j.jour).toBe(ajouterJours(AUJOURDHUI, i)));
  });
});
