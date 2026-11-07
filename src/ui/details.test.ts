import { describe, expect, it } from 'vitest';
import type { Seance } from '../donnees/types';
import { appliquerDetails, lireDetails, type SaisieDetails } from './details';

const vide: SaisieDetails = { reserve: undefined, effort: undefined, gene: undefined, zoneGene: '', fcMoy: '', fcMax: '', zones: ['', '', '', '', ''], note: '' };

describe('lireDetails : convertir la saisie de fin de séance', () => {
  it('une saisie vide ne donne rien', () => {
    expect(lireDetails(vide)).toEqual({});
  });

  it('convertit tout ce qui est renseigné', () => {
    const d = lireDetails({
      effort: 7, reserve: '1-2', gene: 'legere', zoneGene: ' épaule ',
      fcMoy: '128', fcMax: '171,5', zones: ['3', '12', '10', '5', '0'], note: '  bonne séance  ',
    });
    expect(d).toEqual({
      effort: 7, reserve: '1-2', gene: { niveau: 'legere', zone: 'épaule' },
      fc: { moy: 128, max: 171.5, zones: [3, 12, 10, 5, 0] }, note: 'bonne séance',
    });
  });

  it('ignore les nombres invalides', () => {
    expect(lireDetails({ ...vide, fcMoy: 'abc', fcMax: '-5' })).toEqual({});
  });

  it('une gêne sans zone est gardée telle quelle', () => {
    expect(lireDetails({ ...vide, gene: 'a-surveiller' })).toEqual({ gene: { niveau: 'a-surveiller' } });
  });

  it('zones partiellement remplies : les cases vides comptent pour 0 minute', () => {
    expect(lireDetails({ ...vide, zones: ['', '20', '', '', ''] })).toEqual({ fc: { zones: [0, 20, 0, 0, 0] } });
  });

  it('FC moyenne seule : pas de zones inventées', () => {
    expect(lireDetails({ ...vide, fcMoy: '120' })).toEqual({ fc: { moy: 120 } });
  });
});

describe('appliquerDetails', () => {
  const seance: Seance = { id: 's', date: '2026-10-03T18:00:00', kind: 'strength', feel: 4, exercises: [] };

  it('ajoute les détails sans toucher au reste', () => {
    expect(appliquerDetails(seance, { effort: 6, note: 'ok' })).toEqual({ ...seance, effort: 6, note: 'ok' });
  });

  it('sans détails, la séance est inchangée', () => {
    expect(appliquerDetails(seance, {})).toEqual(seance);
  });
});

describe('zones Polar en minutes et secondes', () => {
  it('additionne les minutes et les secondes saisies', () => {
    const d = lireDetails({ ...vide, zones: ['5', '', '', '', ''], zonesSec: ['51', '', '', '', ''] });
    expect(d.fc?.zones?.[0]).toBeCloseTo(5 + 51 / 60, 5);
  });

  it('accepte des secondes seules, sans minutes', () => {
    const d = lireDetails({ ...vide, zones: ['', '', '', '', ''], zonesSec: ['', '', '', '45', ''] });
    expect(d.fc?.zones?.[3]).toBeCloseTo(0.75, 5);
  });

  it('ignore des secondes impossibles (60 ou plus)', () => {
    const d = lireDetails({ ...vide, zones: ['2', '', '', '', ''], zonesSec: ['75', '', '', '', ''] });
    expect(d.fc?.zones?.[0]).toBe(2);
  });

  it('reste compatible avec la saisie en minutes entières seulement', () => {
    expect(lireDetails({ ...vide, zones: ['3', '12', '10', '5', '0'] }).fc?.zones).toEqual([3, 12, 10, 5, 0]);
  });
});

