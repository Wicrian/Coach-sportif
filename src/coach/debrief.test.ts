import { describe, expect, it } from 'vitest';
import type { Seance } from '../donnees/types';
import type { FaitsSeance } from '../moteur/debrief';
import type { ReperesSemaine } from '../moteur/reperes';
import { redigerBilan } from './debrief';

const NOMS = { goblet: 'Squat gobelet', row: 'Rowing unilatéral' };
const seance = (extra: Partial<Seance> = {}): Seance => ({ id: 's', date: '2026-10-10T18:00:00', kind: 'strength', durationMin: 38, exercises: [], ...extra });
const faits = (extra: Partial<FaitsSeance> = {}): FaitsSeance => ({
  exercices: [{ key: 'goblet', series: 3, chargeFaite: 3.8, chargePrevue: 3.8, sens: null, ecartReps: 0, comparable: true }],
  series: 3, volume: 1368, volumePrecedent: null, tendanceVolume: null, ...extra,
});
const bilan = (f: FaitsSeance, s: Seance = seance(), suite = [{ nom: 'Squat gobelet', raison: 'La dernière fois : 12 / 12 / 12 reps à 3,8 kg. On consolide avant de monter.' }], allegee = false) =>
  redigerBilan({ seance: s, typeSeance: 'Force', faits: f, noms: NOMS, suite, prochaineAllegee: allegee, reperes: null });
const tout = (b: ReturnType<typeof bilan>) => [...b.accompli, ...b.modifications, ...b.suite, ...b.ressenti, ...b.polar, b.conseil].join(' ');

describe('bilan d\'une séance qui n\'est pas de force', () => {
  it('résume le type, la durée et l\'application, sans volume', () => {
    const b = redigerBilan({
      seance: seance({ kind: 'box', durationMin: 35, source: 'Boxa', feel: 4 }),
      typeSeance: 'Boxe',
      faits: { exercices: [], series: 0, volume: 0, volumePrecedent: null, tendanceVolume: null },
      noms: {}, suite: [], prochaineAllegee: false, reperes: null,
    });
    expect(b.accompli.join(' ')).toMatch(/Boxe, 35 min \(Boxa\)/);
    expect(b.accompli.join(' ')).not.toMatch(/volume/);
    expect(b.suite).toEqual([]);
    expect(b.ressenti.join(' ')).toMatch(/bien/);
  });
});

describe('bilan de séance', () => {
  it('résume ce qui a été fait, avec la durée', () => {
    const b = bilan(faits());
    expect(b.accompli[0]).toMatch(/3 séries/);
    expect(b.accompli[0]).toMatch(/38 min/);
  });

  it('compare le volume avec honnêteté, sans pourcentage', () => {
    expect(bilan(faits({ tendanceVolume: 'plus', volumePrecedent: 1200 })).accompli.join(' ')).toMatch(/un peu plus/);
    expect(bilan(faits({ tendanceVolume: 'pareil', volumePrecedent: 1360 })).accompli.join(' ')).toMatch(/à peu près pareil/);
    expect(bilan(faits({ tendanceVolume: 'moins', volumePrecedent: 1500 })).accompli.join(' ')).toMatch(/un peu moins/);
    expect(bilan(faits({ tendanceVolume: null })).accompli.join(' ')).toMatch(/point de départ/);
    expect(tout(bilan(faits({ tendanceVolume: 'plus', volumePrecedent: 1200 })))).not.toMatch(/%/);
  });

  it('dit que le plan a été suivi quand rien n\'a changé', () => {
    expect(bilan(faits()).modifications.join(' ')).toMatch(/plan tel quel/);
  });

  it('explique une charge montée et ce que ça change', () => {
    const f = faits({ exercices: [{ key: 'goblet', series: 3, chargeFaite: 6.2, chargePrevue: 3.8, sens: 'plus', ecartReps: 0, comparable: true }] });
    const m = bilan(f).modifications.join(' ');
    expect(m).toMatch(/monté la charge/);
    expect(m).toMatch(/Squat gobelet/);
    expect(m).toMatch(/6,2 kg/);
    expect(m).toMatch(/3,8 kg/);
    expect(m).toMatch(/je pars de là|on repart de là/);
  });

  it('valorise une charge baissée', () => {
    const f = faits({ exercices: [{ key: 'row', series: 3, chargeFaite: 1.6, chargePrevue: 3.8, sens: 'moins', ecartReps: 0, comparable: true }] });
    expect(bilan(f).modifications.join(' ')).toMatch(/bonne décision/);
  });

  it('signale les répétitions en plus ou en moins sans jugement', () => {
    const plus = faits({ exercices: [{ key: 'goblet', series: 3, chargeFaite: 3.8, chargePrevue: 3.8, sens: null, ecartReps: 3, comparable: true }] });
    expect(bilan(plus).modifications.join(' ')).toMatch(/3 reps de plus/);
    const moins = faits({ exercices: [{ key: 'goblet', series: 3, chargeFaite: 3.8, chargePrevue: 3.8, sens: null, ecartReps: -2, comparable: true }] });
    const texte = bilan(moins).modifications.join(' ');
    expect(texte).toMatch(/2 reps de moins/);
    expect(texte).not.toMatch(/raté|échec|dois|faute/i);
  });

  it('reprend les décisions du moteur pour la prochaine fois', () => {
    expect(bilan(faits()).suite.join(' ')).toMatch(/Squat gobelet/);
    expect(bilan(faits()).suite.join(' ')).toMatch(/consolide/);
  });

  it('annonce une prochaine séance allégée quand le ressenti était bas', () => {
    const b = bilan(faits(), seance({ feel: 1 }), undefined, true);
    expect(b.ressenti.join(' ')).toMatch(/allégée d'un cran/);
    expect(b.ressenti.join(' ')).toMatch(/pénible/);
  });

  it('un bon ressenti est salué', () => {
    expect(bilan(faits(), seance({ feel: 5 })).ressenti.join(' ')).toMatch(/super/i);
  });

  it('commente l\'effort et les répétitions en réserve', () => {
    const b = bilan(faits(), seance({ effort: 9, reserve: 'aucune' }));
    expect(b.ressenti.join(' ')).toMatch(/9 sur 10/);
    expect(b.ressenti.join(' ')).toMatch(/1 à 3/);
  });

  it('garde une gêne en note et renvoie vers un professionnel, sans diagnostic', () => {
    const b = bilan(faits(), seance({ gene: { niveau: 'a-surveiller', zone: 'épaule' } }));
    const t = b.ressenti.join(' ');
    expect(t).toMatch(/épaule/);
    expect(t).toMatch(/professionnel de santé/);
  });

  it('affiche les données Polar sans interprétation', () => {
    const b = bilan(faits(), seance({ fc: { moy: 128, max: 171, zones: [0, 12, 10, 5, 0] } }));
    expect(b.polar.join(' ')).toMatch(/128/);
    expect(b.polar.join(' ')).toMatch(/171/);
    expect(b.polar.join(' ')).toMatch(/zone 2/i);
  });

  it('ne dit jamais « tu dois » et propose toujours un seul conseil', () => {
    for (const f of [1, 3, 5]) {
      const b = bilan(faits(), seance({ feel: f }));
      expect(tout(b)).not.toMatch(/tu dois|il faut/i);
      expect(b.conseil.length).toBeGreaterThan(10);
    }
  });
});

describe('« où tu en es cette semaine » : des repères, pas un effet promis', () => {
  const reperes = (extra: Partial<ReperesSemaine> = {}): ReperesSemaine => ({
    muscles: [
      { muscle: 'Jambes', series: 6, seances: 2, etat: 'dans' },
      { muscle: 'Épaules', series: 3, seances: 1, etat: 'sous' },
    ],
    minutes: 95, minutesRepere: 150, ...extra,
  });
  const avec = (r: ReperesSemaine | null) =>
    redigerBilan({ seance: seance(), typeSeance: 'Force', faits: faits(), noms: NOMS, suite: [], prochaineAllegee: false, reperes: r });

  it('dit honnêtement qu\'une séance seule ne change pas le cardio ni la force', () => {
    const t = avec(reperes()).semaine.join(' ');
    expect(t).toMatch(/une seule séance/i);
    expect(t).toMatch(/semaines/);
  });

  it('place chaque muscle par rapport au repère, sans jugement', () => {
    const t = avec(reperes()).semaine.join(' ');
    expect(t).toMatch(/Jambes : 6 séries/);
    expect(t).toMatch(/2 fois/);
    expect(t).toMatch(/Épaules : 3 séries/);
    expect(t).not.toMatch(/tu dois|il faut|raté/i);
  });

  it('cite le repère de temps d\'activité et précise que l\'intensité n\'est pas mesurée', () => {
    const t = avec(reperes()).semaine.join(' ');
    expect(t).toMatch(/95 min sur 150/);
    expect(t).toMatch(/intensité/);
  });

  it('rien du tout sans repères', () => {
    expect(avec(null).semaine).toEqual([]);
  });
});
