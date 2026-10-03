import { describe, expect, it } from 'vitest';
import type { Profil, Seance } from '../donnees/types';
import { MOMENTS, basculerIndisponible, creneauDuJour, creneauxDuProfil, definirCreneau, libelleJour, libelleType, modeleConseille } from './plan';

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
