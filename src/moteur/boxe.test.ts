import { describe, expect, it } from 'vitest';
import { COUPS, PROGRAMMES_DEPART, membreDuCoup, coupDe, type RondeBoxe } from '../donnees/boxe';
import {
  DUREE_RONDE, REPOS, TEMPO, avancer, combosJoues, etatDepart, reglagesValides, repetitionsPossibles,
  resumeRonde, segmentsDeRonde, type Annonce, type EtatRonde,
} from './boxe';

const RONDE_1: RondeBoxe = { combos: [['jab', 'low-kick-arriere'], ['direct', 'low-kick-avant']], enchainer: true };

/** Fait tourner la ronde « en vrai » : un tic toutes les 50 ms, et on note ce qui est annoncé. */
function simuler(ronde: RondeBoxe, dureeSec: number, tempo: number, pas = 0.05) {
  const annonces: { t: number; annonce: Annonce }[] = [];
  let etat: EtatRonde = etatDepart;
  for (let t = 0; t < dureeSec; t = Math.round((t + pas) * 1000) / 1000) {
    const r = avancer(etat, t, ronde, dureeSec, tempo);
    etat = r.etat;
    if (r.annonce) annonces.push({ t, annonce: r.annonce });
  }
  return annonces;
}

describe('boxe — combos joués', () => {
  it('ajoute en dernier un combo qui reprend les précédents bout à bout', () => {
    expect(combosJoues(RONDE_1)).toEqual([
      ['jab', 'low-kick-arriere'],
      ['direct', 'low-kick-avant'],
      ['jab', 'low-kick-arriere', 'direct', 'low-kick-avant'],
    ]);
  });

  it("n'ajoute rien quand l'enchaînement est désactivé", () => {
    expect(combosJoues({ ...RONDE_1, enchainer: false })).toHaveLength(2);
  });

  it('ne fait pas de combo enchaîné avec un seul combo', () => {
    expect(combosJoues({ combos: [['jab']], enchainer: true })).toEqual([['jab']]);
  });

  it('ignore les combos vides', () => {
    expect(combosJoues({ combos: [['jab'], []], enchainer: false })).toEqual([['jab']]);
  });
});

describe('boxe — découpage de la ronde', () => {
  it('partage la durée de la ronde à parts égales entre les combos', () => {
    const segments = segmentsDeRonde(RONDE_1, 180);
    expect(segments.map((s) => [s.debut, s.fin])).toEqual([[0, 60], [60, 120], [120, 180]]);
  });

  it('une durée plus courte donne des segments plus courts, les combos se répètent moins', () => {
    const segments = segmentsDeRonde(RONDE_1, 90);
    expect(segments.map((s) => s.fin - s.debut)).toEqual([30, 30, 30]);
  });

  it('compte les répétitions entières possibles après l\'annonce du combo', () => {
    // 60 s, annonce = 1 temps (1,6 s), puis 2 coups × 1,6 s = 3,2 s par répétition → 18 répétitions
    expect(repetitionsPossibles(2, 60, 1.6)).toBe(18);
    expect(repetitionsPossibles(4, 60, 1.6)).toBe(9);
  });

  it('donne zéro répétition si le combo ne tient pas dans le temps', () => {
    expect(repetitionsPossibles(8, 10, 1.6)).toBe(0);
  });

  it('résume la ronde pour l\'affichage', () => {
    const r = resumeRonde(RONDE_1, 180, 1.6);
    expect(r.map((x) => x.repetitions)).toEqual([18, 18, 9]);
    expect(r[2]!.coups).toEqual(['jab', 'low-kick-arriere', 'direct', 'low-kick-avant']);
  });
});

describe('boxe — rythme des annonces', () => {
  const annonces = simuler(RONDE_1, 180, 1.6);
  const coups = annonces.filter((a) => a.annonce.genre === 'coup');

  it('annonce le combo, puis ses coups dans l\'ordre, en boucle', () => {
    const premiers = annonces.slice(0, 6).map((a) => a.annonce);
    expect(premiers).toEqual([
      { genre: 'combo', numero: 1, total: 3 },
      { genre: 'coup', coup: 'jab' },
      { genre: 'coup', coup: 'low-kick-arriere' },
      { genre: 'coup', coup: 'jab' },
      { genre: 'coup', coup: 'low-kick-arriere' },
      { genre: 'coup', coup: 'jab' },
    ]);
  });

  it('annonce le combo 2 puis le combo 3 (les deux premiers enchaînés) à chaque minute', () => {
    const cues = annonces.filter((a) => a.annonce.genre === 'combo');
    expect(cues.map((c) => Math.round(c.t))).toEqual([0, 60, 120]);
    const dansLeTroisieme = coups.filter((c) => c.t >= 120).slice(0, 4).map((c) => (c.annonce as { coup: string }).coup);
    expect(dansLeTroisieme).toEqual(['jab', 'low-kick-arriere', 'direct', 'low-kick-avant']);
  });

  it('ne va jamais plus vite que le rythme choisi', () => {
    for (let i = 1; i < annonces.length; i++) {
      expect(annonces[i]!.t - annonces[i - 1]!.t).toBeGreaterThanOrEqual(1.6 - 0.06);
    }
  });

  it('ne coupe jamais un combo en deux : des répétitions entières seulement', () => {
    const parSegment = [0, 1, 2].map((s) => coups.filter((c) => c.t >= s * 60 && c.t < (s + 1) * 60).length);
    expect(parSegment).toEqual([36, 36, 36]);
  });

  it('reste dans la ronde', () => {
    expect(annonces.every((a) => a.t < 180)).toBe(true);
  });

  it('un rythme plus lent donne moins de coups, un rythme plus rapide davantage', () => {
    const lent = simuler(RONDE_1, 180, 2.4).filter((a) => a.annonce.genre === 'coup').length;
    const rapide = simuler(RONDE_1, 180, 1.2).filter((a) => a.annonce.genre === 'coup').length;
    expect(lent).toBeLessThan(coups.length);
    expect(rapide).toBeGreaterThan(coups.length);
  });

  it('applique un changement de rythme à partir du coup suivant', () => {
    let etat: EtatRonde = etatDepart;
    const instants: number[] = [];
    for (let t = 0; t < 30; t = Math.round((t + 0.05) * 1000) / 1000) {
      const tempo = t < 10 ? 1.6 : 2.4;
      const r = avancer(etat, t, RONDE_1, 180, tempo);
      etat = r.etat;
      if (r.annonce?.genre === 'coup') instants.push(t);
    }
    const apres = instants.filter((t) => t > 12);
    for (let i = 1; i < apres.length; i++) expect(apres[i]! - apres[i - 1]!).toBeGreaterThanOrEqual(2.4 - 0.06);
  });

  it('ne fait pas de rafale après un long silence (écran verrouillé, onglet en veille)', () => {
    const debut = avancer(etatDepart, 0, RONDE_1, 180, 1.6);
    const apres = avancer(debut.etat, 30, RONDE_1, 180, 1.6);
    expect(apres.annonce).toEqual({ genre: 'coup', coup: 'jab' });
    const suite = avancer(apres.etat, 30.1, RONDE_1, 180, 1.6);
    expect(suite.annonce).toBeNull();
  });

  it("n'annonce que le combo quand il ne tient pas une seule fois dans son temps", () => {
    const longue: RondeBoxe = { combos: [Array(20).fill('jab')], enchainer: false };
    const a = simuler(longue, 30, 1.6);
    expect(a.map((x) => x.annonce.genre)).toEqual(['combo']);
  });
});

describe('boxe — réglages', () => {
  it('prend les valeurs par défaut', () => {
    const r = reglagesValides({});
    expect(r).toMatchObject({ dureeRondeSec: DUREE_RONDE.defaut, reposSec: REPOS.defaut, tempoSec: TEMPO.defaut, garde: 'gaucher' });
  });

  it('ramène les valeurs hors limites dans la plage viable', () => {
    const r = reglagesValides({ dureeRondeSec: 5, reposSec: 9999, tempoSec: 0.2 });
    expect(r.dureeRondeSec).toBe(DUREE_RONDE.min);
    expect(r.reposSec).toBe(REPOS.max);
    expect(r.tempoSec).toBe(TEMPO.min);
  });

  it('reste cohérent avec des valeurs étranges', () => {
    const r = reglagesValides({ tempoSec: Number.NaN, dureeRondeSec: Infinity });
    expect(r.tempoSec).toBe(TEMPO.defaut);
    expect(r.dureeRondeSec).toBe(DUREE_RONDE.defaut);
  });
});

describe('boxe — données', () => {
  it('la série de départ n\'utilise que des coups connus', () => {
    for (const p of PROGRAMMES_DEPART) {
      for (const ronde of p.rondes) for (const combo of ronde.combos) for (const id of combo) expect(coupDe(id)).toBeDefined();
    }
  });

  it('chaque coup a un identifiant unique', () => {
    expect(new Set(COUPS.map((c) => c.id)).size).toBe(COUPS.length);
  });

  it('en garde gaucher, la main avant est la droite', () => {
    const jab = coupDe('jab')!;
    expect(membreDuCoup(jab, 'gaucher')).toBe('droite');
    expect(membreDuCoup(jab, 'orthodoxe')).toBe('gauche');
    expect(membreDuCoup(coupDe('direct')!, 'gaucher')).toBe('gauche');
    expect(membreDuCoup(coupDe('esquive')!, 'gaucher')).toBeUndefined();
  });
});
