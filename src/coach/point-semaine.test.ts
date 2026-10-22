import { describe, expect, it } from 'vitest';
import { optionsDeSecours, pointDeLaSemaine, projeter, type PalierArret } from '../moteur/point-semaine';
import { CIBLE_INTENSITE, phraseArret, phraseProjection, phraseSecours, phrasesSemaine, retourIntensif } from './point-semaine';

const PALIERS: PalierArret[] = ['normal', 'debut', 'leger', 'net'];
const MOTS_INTERDITS = [/tu dois/i, /il faut que tu/i, /échec/i, /catastroph/i, /honte/i, /paresse/i, /tout perdre/i, /perdu/i, /rattraper/i];
const tout = (t: string[]) => t.join(' ');

describe('coach — arrêt', () => {
  it('chaque palier a un titre et des phrases', () => {
    for (const p of PALIERS) {
      const r = phraseArret(p, undefined);
      expect(r.titre.length).toBeGreaterThan(3);
      expect(r.lignes.length).toBeGreaterThan(0);
    }
  });

  it('jamais culpabilisant ni alarmiste', () => {
    for (const p of PALIERS) for (const o of [undefined, 'muscle', 'perte', 'mixte'] as const) {
      for (const m of MOTS_INTERDITS) expect(tout(phraseArret(p, o).lignes)).not.toMatch(m);
    }
  });

  it('une semaine sans séance est dite normale et sans effet mesurable', () => {
    expect(tout(phraseArret('normal', undefined).lignes)).toMatch(/mesurable/);
  });

  it('dit que reprendre redonne vite ce qui avait baissé, dès 15 jours', () => {
    expect(tout(phraseArret('leger', undefined).lignes)).toMatch(/reprendre/i);
    expect(tout(phraseArret('net', undefined).lignes)).toMatch(/plus légères?/);
  });

  it('adapte la fin à l\'objectif, seulement quand la pause commence à durer', () => {
    expect(tout(phraseArret('normal', 'muscle').lignes)).not.toMatch(/prise de muscle/);
    expect(tout(phraseArret('debut', 'muscle').lignes)).toMatch(/muscle/);
    expect(tout(phraseArret('debut', 'perte').lignes)).toMatch(/alimentation/);
    expect(phraseArret('debut', 'mixte').lignes.length).toBeGreaterThan(phraseArret('debut', undefined).lignes.length);
  });

  it('dit que ce sont des estimations tirées d\'études, pas des mesures sur toi', () => {
    expect(phraseArret('debut', undefined).source).toMatch(/études/);
    expect(phraseArret('debut', undefined).source).toMatch(/pas des mesures/);
  });
});

describe('coach — si tu continues', () => {
  it('décrit les paliers que franchirait une pause plus longue, sans dramatiser', () => {
    const l = phraseProjection(5, projeter(5));
    expect(l.length).toBeGreaterThan(0);
    for (const m of MOTS_INTERDITS) expect(tout(l)).not.toMatch(m);
    expect(tout(l)).toMatch(/3 jours/);
  });

  it('dit que rien ne change quand les paliers restent les mêmes', () => {
    expect(tout(phraseProjection(0, projeter(0)))).toMatch(/rien de notable/);
  });
});

describe('coach — la semaine', () => {
  const rien = pointDeLaSemaine([], '2026-10-12', '2026-10-22');
  const maintien = pointDeLaSemaine([{ id: 'a', date: new Date('2026-10-14T12:00:00').toISOString(), kind: 'strength', durationMin: 40, exercises: [] }], '2026-10-12', '2026-10-22');

  it('une semaine sans séance est dite sans jugement, avec ce qu\'elle n\'efface pas', () => {
    const t = tout(phrasesSemaine(rien, undefined, 0).lignes);
    expect(t).toMatch(/Aucune séance/);
    for (const m of MOTS_INTERDITS) expect(t).not.toMatch(m);
  });

  it('une séance de force : c\'est la dose de maintien, pas la progression', () => {
    const t = tout(phrasesSemaine(maintien, 'muscle', 0).lignes);
    expect(t).toMatch(/maintien/);
    expect(t).toMatch(/deux séances/);
  });

  it('rappelle qu\'une seule semaine ne change rien de mesurable', () => {
    expect(tout(phrasesSemaine(maintien, undefined, 0).effets)).toMatch(/une seule semaine/i);
  });

  it('les semaines réussies déjà acquises restent acquises', () => {
    expect(tout(phrasesSemaine(rien, undefined, 6).lignes)).toMatch(/6 semaines réussies/);
  });
});

describe('coach — quand on ne peut pas faire la séance prévue', () => {
  it('chaque option dit ce qu\'elle fait vraiment et ce qu\'elle ne fait pas', () => {
    for (const o of optionsDeSecours('mixte', { allegee: false })) {
      const t = phraseSecours(o.id);
      expect(t.titre.length).toBeGreaterThan(3);
      expect(t.effetReel.length).toBeGreaterThan(20);
      expect(t.limite.length).toBeGreaterThan(20);
    }
  });

  it('la mini-dose est honnête : elle ne maintient rien de mesurable, elle garde l\'habitude', () => {
    const t = phraseSecours('mini-dose');
    expect(t.limite).toMatch(/ne maintiennent/);
    expect(t.effetReel).toMatch(/habitude/);
  });

  it('la force minimale rappelle que maintenir n\'est pas progresser', () => {
    expect(phraseSecours('force-minimale').limite).toMatch(/progresser/);
  });
});

describe('coach — intensif court', () => {
  it('dit ce que c\'est, et à quelles conditions il vaut la peine', () => {
    const t = phraseSecours('intensif-court');
    expect(t.effetReel).toMatch(/intensité/);
    expect(t.limite).toMatch(/technique/);
    expect(t.limite).toMatch(/forme/);
    expect(t.limite).toMatch(/muscle/);
  });

  it('dit l\'intensité visée en effort perçu et en zones Polar, avec une consigne de prudence', () => {
    expect(CIBLE_INTENSITE.effort).toMatch(/15 à 17/);
    expect(CIBLE_INTENSITE.polar).toMatch(/zones 4 et 5/);
    expect(CIBLE_INTENSITE.prudence).toMatch(/technique/);
  });

  it('félicite quand la zone est atteinte', () => {
    expect(tout(retourIntensif({ zones: [4, 3, 2, 3, 1] }))).toMatch(/atteinte/);
  });

  it('reste bienveillant quand elle ne l\'est pas, sans parler d\'échec', () => {
    const t = tout(retourIntensif({ zones: [6, 4, 2, 1, 0] }));
    expect(t).toMatch(/prochaine/);
    expect(t).toMatch(/pas un échec/);
  });

  it('invite à saisir les zones quand elles manquent', () => {
    expect(tout(retourIntensif(undefined))).toMatch(/zones Polar/);
    expect(tout(retourIntensif({ moy: 150 }))).toMatch(/zones Polar/);
  });
});
