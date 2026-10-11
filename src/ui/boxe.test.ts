import { describe, expect, it } from 'vitest';
import { PROGRAMMES_DEPART } from '../donnees/boxe';
import type { Profil } from '../donnees/types';
import { avecProgrammes, avecReglages, copierProgramme, dureeTotale, momentAnnonceCombo, nouveauProgramme, phasesDeSeance, programmeChoisi, programmesDe, reglagesDe, vitesseVoix } from './boxe';

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

  it('la préparation avant la première ronde est plus courte que le repos entre les rondes', () => {
    const phases = phasesDeSeance(PROGRAMMES_DEPART[0]!, reglagesDe(profil));
    expect(phases[0]).toMatchObject({ genre: 'repos', duree: 30 });
    expect(phases[2]).toMatchObject({ genre: 'repos', duree: 60 });
  });

  it('garde un repos court réglé par l\'utilisateur, même pour la première ronde', () => {
    const r = reglagesDe(avecReglages(profil, { reposSec: 15 }));
    expect(phasesDeSeance(PROGRAMMES_DEPART[0]!, r)[0]!.duree).toBe(15);
  });

  it('calcule la durée totale', () => {
    const r = reglagesDe(avecReglages(profil, { dureeRondeSec: 120, reposSec: 20 }));
    expect(dureeTotale(phasesDeSeance(PROGRAMMES_DEPART[0]!, r))).toBe(3 * (120 + 20));
  });
});

describe('boxe — annonce du combo avant la ronde', () => {
  it('nomme le combo après le « Repos. Ronde n » et avant le compte à rebours', () => {
    // repos de 25 s, combo de 2 coups : lecture ≈ 3,1 s, fin de lecture avant les 3 s de compte à rebours
    const t = momentAnnonceCombo(25, 2);
    expect(t).toBeGreaterThanOrEqual(3);
    expect(t + 1.5 + 0.8 * 2).toBeLessThanOrEqual(25 - 3);
  });

  it('commence plus tôt quand le combo est long', () => {
    expect(momentAnnonceCombo(25, 8)).toBeLessThan(momentAnnonceCombo(25, 2));
  });

  it('ne parle jamais avant 3 s, même si le repos est très court', () => {
    expect(momentAnnonceCombo(10, 8)).toBe(3);
  });
});

describe('boxe — vitesse de la voix', () => {
  it('accélère les coups quand le rythme est rapide', () => {
    expect(vitesseVoix(1.2, true)).toBe(1.2);
    expect(vitesseVoix(1.0, true)).toBe(1.2);
  });

  it('ne change pas la vitesse aux rythmes normaux', () => {
    expect(vitesseVoix(1.6, true)).toBe(1);
  });

  it('dit toujours la présentation du combo à vitesse normale, même au rythme le plus rapide', () => {
    expect(vitesseVoix(1.0, false)).toBe(1);
  });
});
