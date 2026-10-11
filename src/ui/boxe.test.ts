import { describe, expect, it } from 'vitest';
import { PROGRAMMES_DEPART } from '../donnees/boxe';
import type { Profil } from '../donnees/types';
import { avecProgrammes, avecReglages, copierProgramme, dureeTotale, nouveauProgramme, phasesDeSeance, programmeChoisi, programmesDe, reglagesDe } from './boxe';

const profil: Profil = { gear: [], dumbbells: [] };

describe('boxe — profil', () => {
  it('propose la série de départ tant que rien n\'est composé', () => {
    expect(programmesDe(profil)).toBe(PROGRAMMES_DEPART);
    expect(programmeChoisi(profil).id).toBe('depart');
  });

  it('garde les séries composées et les réglages dans le profil, sans toucher au reste', () => {
    const p = nouveauProgramme('Kicks', new Date('2026-10-10T12:00:00'));
    const avec = avecReglages(avecProgrammes(profil, [p]), { tempoSec: 2, programmeId: p.id });
    expect(programmesDe(avec)).toEqual([p]);
    expect(programmeChoisi(avec).id).toBe(p.id);
    expect(reglagesDe(avec).tempoSec).toBe(2);
    expect(avec.gear).toEqual([]);
  });

  it('retombe sur la première série si celle choisie n\'existe plus', () => {
    const avec = avecReglages(profil, { programmeId: 'disparue' });
    expect(programmeChoisi(avec).id).toBe('depart');
  });

  it('copie une série sans partager ses combos', () => {
    const copie = copierProgramme(PROGRAMMES_DEPART[0]!, new Date('2026-10-10T12:00:00'));
    copie.rondes[0]!.combos[0]!.push('jab');
    expect(PROGRAMMES_DEPART[0]!.rondes[0]!.combos[0]).toHaveLength(2);
    expect(copie.nom).toContain('copie');
    expect(copie.id).not.toBe('depart');
  });
});

describe('boxe — déroulé de la séance', () => {
  it('met un repos avant chaque ronde, y compris la première', () => {
    const phases = phasesDeSeance(PROGRAMMES_DEPART[0]!, reglagesDe(profil));
    expect(phases.map((p) => `${p.genre}${p.ronde}`)).toEqual(['repos0', 'ronde0', 'repos1', 'ronde1', 'repos2', 'ronde2']);
  });

  it('saute les rondes vides', () => {
    const p = { id: 'x', nom: 'x', rondes: [{ combos: [[], []], enchainer: true }, PROGRAMMES_DEPART[0]!.rondes[0]!] };
    expect(phasesDeSeance(p, reglagesDe(profil)).map((x) => x.ronde)).toEqual([1, 1]);
  });

  it('calcule la durée totale', () => {
    const r = reglagesDe(avecReglages(profil, { dureeRondeSec: 120, reposSec: 20 }));
    expect(dureeTotale(phasesDeSeance(PROGRAMMES_DEPART[0]!, r))).toBe(3 * (120 + 20));
  });
});
