import { describe, expect, it } from 'vitest';
import type { Profil, Seance } from '../donnees/types';
import type { PlanSeance } from './seance/preparer';
import { MOMENTS, actionPourType, descriptionType, lignesPrevues, basculerIndisponible, creneauDuJour, creneauxDuProfil, definirCreneau, genrePourType, libelleJour, libelleType, modeleConseille, playlistsPour } from './plan';

const profil = (extra: Partial<Profil> = {}): Profil => ({ gear: [], dumbbells: [], ...extra });
const force = (tplId: string, jour: string): Seance => ({ id: jour, date: `${jour}T18:00:00`, kind: 'strength', tplId, exercises: [] });

describe('créneaux du profil', () => {
  it('par défaut : samedi et dimanche, toute la journée', () => {
    expect(creneauxDuProfil(profil())).toEqual([
      { jour: 6, moment: 'journee', dureeMaxMin: 90 },
      { jour: 7, moment: 'journee', dureeMaxMin: 90 },
    ]);
  });

  it('utilise les créneaux choisis', () => {
    const c = [{ jour: 3, moment: 'midi' as const, dureeMaxMin: 30 }];
    expect(creneauxDuProfil(profil({ creneaux: c }))).toEqual(c);
  });

  it('un choix de moment donne la durée correspondante', () => {
    const duree = (m: string) => MOMENTS.find((x) => x.moment === m)!.dureeMaxMin;
    expect([duree('matin'), duree('midi'), duree('soir'), duree('journee')]).toEqual([40, 30, 60, 90]);
  });

  it('définir le créneau d\'un jour remplace l\'ancien', () => {
    const avant = creneauxDuProfil(profil());
    const apres = definirCreneau(avant, 6, 'matin');
    expect(creneauDuJour(apres, 6)).toEqual({ jour: 6, moment: 'matin', dureeMaxMin: 40 });
    expect(creneauDuJour(apres, 7)?.moment).toBe('journee');
  });

  it('« aucun » retire le créneau du jour', () => {
    expect(creneauDuJour(definirCreneau(creneauxDuProfil(profil()), 7, null), 7)).toBeUndefined();
  });

  it('ajoute un créneau en semaine et garde les jours triés', () => {
    const c = definirCreneau(creneauxDuProfil(profil()), 3, 'midi');
    expect(c.map((x) => x.jour)).toEqual([3, 6, 7]);
  });
});

describe('jours indisponibles', () => {
  it('bascule un jour : ajouté, puis retiré', () => {
    const a = basculerIndisponible(undefined, '2026-10-08', '2026-10-03');
    expect(a).toEqual(['2026-10-08']);
    expect(basculerIndisponible(a, '2026-10-08', '2026-10-03')).toEqual([]);
  });

  it('oublie les jours passés et garde la liste triée', () => {
    expect(basculerIndisponible(['2026-09-30', '2026-10-09'], '2026-10-05', '2026-10-03')).toEqual(['2026-10-05', '2026-10-09']);
  });
});

describe('modèle de séance conseillé', () => {
  it('alterne : après le full-body, le poids du corps', () => expect(modeleConseille([force('fb', '2026-10-01')])).toBe('bw'));
  it('alterne : après le poids du corps, le full-body', () => expect(modeleConseille([force('bw', '2026-10-01')])).toBe('fb'));
  it('full-body par défaut', () => expect(modeleConseille([])).toBe('fb'));
  it('se base sur la séance de force la plus récente', () => {
    expect(modeleConseille([force('bw', '2026-09-20'), force('fb', '2026-10-01')])).toBe('bw');
  });
});

describe('libellés', () => {
  it('jours', () => {
    expect(libelleJour('2026-10-03', '2026-10-03')).toBe("Aujourd'hui");
    expect(libelleJour('2026-10-04', '2026-10-03')).toBe('Demain');
    expect(libelleJour('2026-10-06', '2026-10-03')).toBe('mardi 6 octobre');
  });
  it('types de séance', () => {
    expect(libelleType('force')).toBe('Force');
    expect(libelleType('combine')).toBe('Force et boxe');
    expect(libelleType('recuperation')).toBe('Récupération active');
    expect(libelleType('repos')).toBe('Repos');
  });
});

describe('que faire de la séance du jour', () => {
  it('force et force + boxe : on peut les démarrer', () => {
    expect(actionPourType('force')).toBe('demarrer');
    expect(actionPourType('combine')).toBe('demarrer');
  });
  it('boxe, marche, mobilité, récupération : on peut les noter une fois faites', () => {
    for (const t of ['boxe', 'marche', 'mobilite', 'recuperation'] as const) expect(actionPourType(t)).toBe('noter');
  });
  it('repos et déjà fait : pas d\'action directe', () => {
    expect(actionPourType('repos')).toBeNull();
    expect(actionPourType('deja-fait')).toBeNull();
  });
  it('type de séance de l\'activité correspondant', () => {
    expect(genrePourType('boxe')).toEqual({ kind: 'box', dureeMin: 35 });
    expect(genrePourType('marche')).toEqual({ kind: 'walk', dureeMin: 25 });
    expect(genrePourType('mobilite')).toEqual({ kind: 'mob', dureeMin: 15 });
    expect(genrePourType('recuperation')).toEqual({ kind: 'cardio', dureeMin: 15 });
    expect(genrePourType('force')).toBeNull();
  });
});

describe('playlistsPour : celles qui conviennent à une séance', () => {
  const p = (nom: string, pour?: Array<'strength' | 'box'>) => ({ nom, url: 'https://music.apple.com/x', pour });
  it('toutes celles du type demandé, plus celles sans type précis', () => {
    const liste = [p('Force', ['strength']), p('Boxe', ['box']), p('Tout')];
    expect(playlistsPour(liste, 'strength').map((x) => x.nom)).toEqual(['Force', 'Tout']);
    expect(playlistsPour(liste, 'box').map((x) => x.nom)).toEqual(['Boxe', 'Tout']);
  });
  it('liste vide ou absente : rien', () => {
    expect(playlistsPour([], 'strength')).toEqual([]);
    expect(playlistsPour(undefined, 'strength')).toEqual([]);
  });
});

describe('fiche d\'une séance du plan', () => {
  it('chaque type de séance a une description', () => {
    for (const t of ['force', 'boxe', 'combine', 'marche', 'mobilite', 'recuperation', 'repos', 'deja-fait'] as const) {
      expect(descriptionType(t).length).toBeGreaterThan(20);
    }
  });

  it('résume ce qui est prévu : séries × reps, charge ou poids du corps', () => {
    const plan = {
      modeleId: 'fb', nom: 'Full-body', changements: 0, regles: [],
      exercices: [
        { nom: 'Squat gobelet', poidsDuCorps: false, series: [{ w: 3.8, reps: 12 }, { w: 3.8, reps: 12 }, { w: 3.8, reps: 12 }] },
        { nom: 'Pompes', poidsDuCorps: true, series: [{ w: 0, reps: 8 }, { w: 0, reps: 8 }] },
        { nom: 'Rowing', poidsDuCorps: false, series: [{ w: 0, reps: 10 }] },
      ],
    } as unknown as PlanSeance;
    expect(lignesPrevues(plan)).toEqual([
      { nom: 'Squat gobelet', detail: '3 × 12 · 3,8 kg' },
      { nom: 'Pompes', detail: '2 × 8 · poids du corps' },
      { nom: 'Rowing', detail: '1 × 10 · charge à choisir' },
    ]);
  });
});
