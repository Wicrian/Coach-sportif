import { describe, expect, it } from 'vitest';
import type { Donnees } from '../donnees/types';
import prototypeV1 from './__fixtures__/prototype-v1.json';
import { SauvegardeInvalide, VERSION_ACTUELLE, exporterSauvegarde, fusionner, lireSauvegarde, lireCharges } from './sauvegarde';

const TEXTE_V1 = JSON.stringify(prototypeV1);
const VIDE: Donnees = { profil: { gear: [], dumbbells: [] }, seances: [], recuperation: [] };

describe('lire une sauvegarde du prototype (v1)', () => {
  const { donnees, versionSource } = lireSauvegarde(TEXTE_V1);

  it('reconnaît la version du fichier', () => {
    expect(versionSource).toBe(1);
  });

  it('convertit les haltères du texte « 2,5 / 5 / 10 » en liste de nombres', () => {
    expect(donnees.profil.dumbbells).toEqual([2.5, 5, 10]);
  });

  it('conserve le profil, y compris les champs inconnus', () => {
    expect(donnees.profil.gear).toEqual(['Haltères', 'Swiss ball', 'Sac de frappe sur socle']);
    expect(donnees.profil.diet).toBe('Végétarien');
    expect(donnees.profil.why).toBe("Avoir de l'énergie toute la journée");
    expect(donnees.profil.audOverride).toBe('push');
    expect(donnees.profil.champInconnuDuFutur).toEqual({ a: 1 });
  });

  it('conserve toutes les séances à l\'identique (aucune perte)', () => {
    expect(donnees.seances).toEqual(prototypeV1.sessions);
  });

  it('conserve toutes les mesures de récupération à l\'identique', () => {
    expect(donnees.recuperation).toEqual(prototypeV1.recovery);
  });
});

describe('lireCharges : texte de haltères du prototype → nombres', () => {
  it.each([
    ['2,5 / 5 / 10', [2.5, 5, 10]],
    ['2.5, 5 et 10', [2.5, 5, 10]],
    ['10 / 5 / 5 / 2,5', [2.5, 5, 10]],
    ['', []],
    ['abc', []],
    [[2, 5], [2, 5]],
    [undefined, []],
  ])('%j → %j', (entree, attendu) => {
    expect(lireCharges(entree)).toEqual(attendu);
  });
});

describe('sauvegardes invalides ou incomplètes', () => {
  it('refuse un texte qui n\'est pas du JSON', () => {
    expect(() => lireSauvegarde('bonjour')).toThrow(SauvegardeInvalide);
  });

  it('refuse un fichier d\'une autre application', () => {
    expect(() => lireSauvegarde(JSON.stringify({ app: 'autre', v: 1 }))).toThrow(/Bouge de là/);
  });

  it('refuse un fichier plus récent que cette version de l\'app', () => {
    expect(() => lireSauvegarde(JSON.stringify({ app: 'bouge-de-la', v: VERSION_ACTUELLE + 1 }))).toThrow(/plus récente/);
  });

  it('accepte une sauvegarde sans séances ni mesures (comme un tout premier export)', () => {
    const { donnees } = lireSauvegarde(JSON.stringify({ app: 'bouge-de-la', v: 1, profile: { gear: ['Haltères'], dumbbells: '2,5 / 5 / 10' }, sessions: [], recovery: [] }));
    expect(donnees.seances).toEqual([]);
    expect(donnees.recuperation).toEqual([]);
    expect(donnees.profil.gear).toEqual(['Haltères']);
  });

  it('accepte l\'absence de profil, de séances ou de mesures', () => {
    const { donnees } = lireSauvegarde(JSON.stringify({ app: 'bouge-de-la', v: 1 }));
    expect(donnees).toEqual(VIDE);
  });

  it('écarte une séance sans date valide, avec un avertissement', () => {
    const texte = JSON.stringify({ app: 'bouge-de-la', v: 1, sessions: [{ id: 'x', kind: 'strength', exercises: [] }, prototypeV1.sessions[0]] });
    const { donnees, avertissements } = lireSauvegarde(texte);
    expect(donnees.seances).toHaveLength(1);
    expect(avertissements.join(' ')).toMatch(/date/);
  });

  it('donne un identifiant à une séance qui n\'en a pas, avec un avertissement', () => {
    const { id: _retire, ...sansId } = prototypeV1.sessions[0]!;
    const { donnees, avertissements } = lireSauvegarde(JSON.stringify({ app: 'bouge-de-la', v: 1, sessions: [sansId] }));
    expect(donnees.seances[0]!.id).toBeTruthy();
    expect(avertissements.length).toBeGreaterThan(0);
  });
});

describe('exporter une sauvegarde', () => {
  const donnees = lireSauvegarde(TEXTE_V1).donnees;

  it('garde les noms de champs du prototype et ajoute la version', () => {
    const sortie = exporterSauvegarde(donnees, new Date('2026-10-03T12:00:00Z'));
    expect(sortie.app).toBe('bouge-de-la');
    expect(sortie.v).toBe(VERSION_ACTUELLE);
    expect(sortie.exportedAt).toBe('2026-10-03T12:00:00.000Z');
    expect(sortie.sessions).toEqual(donnees.seances);
    expect(sortie.recovery).toEqual(donnees.recuperation);
    expect(sortie.profile).toEqual(donnees.profil);
  });

  it('export puis import redonne exactement les mêmes données', () => {
    const texte = JSON.stringify(exporterSauvegarde(donnees, new Date()));
    expect(lireSauvegarde(texte).donnees).toEqual(donnees);
  });
});

describe('fusionner des données importées avec celles de l\'appareil', () => {
  const importees = lireSauvegarde(TEXTE_V1).donnees;

  it('sur un appareil vide, tout est ajouté', () => {
    const { donnees, rapport } = fusionner(VIDE, importees);
    expect(donnees.seances).toHaveLength(2);
    expect(donnees.recuperation).toHaveLength(2);
    expect(rapport).toMatchObject({ seancesAjoutees: 2, seancesDejaPresentes: 0, mesuresAjoutees: 2, mesuresDejaPresentes: 0 });
  });

  it('importer deux fois le même fichier ne crée aucun doublon', () => {
    const une = fusionner(VIDE, importees).donnees;
    const { donnees, rapport } = fusionner(une, importees);
    expect(donnees.seances).toHaveLength(2);
    expect(donnees.recuperation).toHaveLength(2);
    expect(rapport).toMatchObject({ seancesAjoutees: 0, seancesDejaPresentes: 2, mesuresAjoutees: 0, mesuresDejaPresentes: 2 });
  });

  it('une séance déjà présente (même id) n\'est jamais écrasée', () => {
    const modifiee = { ...importees.seances[0]!, feel: 1 };
    const existant: Donnees = { ...VIDE, seances: [modifiee] };
    const { donnees } = fusionner(existant, importees);
    expect(donnees.seances.find((s) => s.id === modifiee.id)!.feel).toBe(1);
  });

  it('les séances sont triées de la plus récente à la plus ancienne', () => {
    const { donnees } = fusionner(VIDE, importees);
    const dates = donnees.seances.map((s) => s.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('le profil de l\'appareil gagne, le fichier ne comble que les trous ; le matériel est réuni', () => {
    const existant: Donnees = { ...VIDE, profil: { gear: ['Tapis', 'Swiss ball'], dumbbells: [], diet: 'Flexitarien' } };
    const { donnees } = fusionner(existant, importees);
    expect(donnees.profil.diet).toBe('Flexitarien');
    expect(donnees.profil.why).toBe("Avoir de l'énergie toute la journée");
    expect(donnees.profil.gear.sort()).toEqual(['Haltères', 'Sac de frappe sur socle', 'Swiss ball', 'Tapis'].sort());
    expect(donnees.profil.dumbbells).toEqual([2.5, 5, 10]);
  });

  it('l\'inventaire barre + disques de l\'appareil n\'est jamais remplacé par un ancien fichier', () => {
    const halteres = { barre: 1.5978, disques: [{ poids: 1.1, quantite: 4 }] };
    const existant: Donnees = { ...VIDE, profil: { gear: [], dumbbells: [], halteres } };
    expect(fusionner(existant, importees).donnees.profil.halteres).toEqual(halteres);
  });
});

describe('fusion des sons personnels (un par moment de l\'application)', () => {
  const perso = (nom: string) => ({ choix: 'perso' as const, nom, perso: `data:audio/mpeg;base64,${nom}` });
  const fichier = (sons: Record<string, unknown>): Donnees => ({ profil: { gear: [], dumbbells: [], sons } as Donnees['profil'], seances: [], recuperation: [] });
  const appareil = (sons: Record<string, unknown>): Donnees => ({ profil: { gear: [], dumbbells: [], sons } as Donnees['profil'], seances: [], recuperation: [] });
  const sonsDe = (d: Donnees) => (d.profil.sons ?? {}) as Record<string, { choix: string; nom?: string }>;

  const importes = fichier({ ouverture: perso('Ouverture'), debutSeance: perso('Lancement'), debutBoxe: perso('Boxe'), finSeance: perso('Fin'), finRepos: perso('Repos') });

  it('sur un appareil sans réglage, tous les sons du fichier sont repris', () => {
    const { donnees } = fusionner(VIDE, importes);
    expect(Object.keys(sonsDe(donnees)).sort()).toEqual(['debutBoxe', 'debutSeance', 'finRepos', 'finSeance', 'ouverture']);
  });

  it('un réglage déjà présent sur l\'appareil (même un simple « ding ») n\'empêche pas d\'importer les autres sons', () => {
    const { donnees } = fusionner(appareil({ finRepos: { choix: 'ding' } }), importes);
    const sons = sonsDe(donnees);
    expect(sons.ouverture!.choix).toBe('perso');
    expect(sons.debutBoxe!.nom).toBe('Boxe');
    expect(sons.finSeance!.choix).toBe('perso');
  });

  it('un son personnel du fichier remplace un son maison ou « aucun » de l\'appareil', () => {
    const { donnees } = fusionner(appareil({ ouverture: { choix: 'aucun' }, finRepos: { choix: 'cloche' } }), importes);
    expect(sonsDe(donnees).ouverture!.choix).toBe('perso');
    expect(sonsDe(donnees).finRepos!.nom).toBe('Repos');
  });

  it('mais un son personnel déjà présent sur l\'appareil n\'est jamais écrasé', () => {
    const { donnees } = fusionner(appareil({ finRepos: perso('Mon choix') }), importes);
    expect(sonsDe(donnees).finRepos!.nom).toBe('Mon choix');
    expect(sonsDe(donnees).ouverture!.nom).toBe('Ouverture');
  });

  it('un fichier sans sons ne change rien aux sons de l\'appareil', () => {
    const existant = appareil({ finRepos: { choix: 'cloche' } });
    expect(sonsDe(fusionner(existant, VIDE).donnees)).toEqual({ finRepos: { choix: 'cloche' } });
  });

  it('le rapport signale que les sons ont été ajoutés', () => {
    expect(fusionner(appareil({ finRepos: { choix: 'ding' } }), importes).rapport.profilCompleteChamps).toContain('sons');
  });
});
