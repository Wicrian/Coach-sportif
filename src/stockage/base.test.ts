import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MesureRecuperation, Seance } from '../donnees/types';
import prototypeV1 from './__fixtures__/prototype-v1.json';
import { BaseBouge, chargerDonnees, exporterTexte, importerSauvegarde, sauverMesure, sauverProfil, sauverSeance } from './base';
import { SauvegardeInvalide } from './sauvegarde';

const TEXTE_V1 = JSON.stringify(prototypeV1);
let compteur = 0;
let base: BaseBouge;

beforeEach(() => {
  base = new BaseBouge(`test-${compteur++}`);
});

const seance = (id: string, date: string): Seance => ({ id, date, kind: 'strength', exercises: [] });

describe('base locale (IndexedDB)', () => {
  it('démarre vide, avec un profil par défaut', async () => {
    expect(await chargerDonnees(base)).toEqual({ profil: { gear: [], dumbbells: [] }, seances: [], recuperation: [] });
  });

  it('enregistre et relit une séance, la plus récente d\'abord', async () => {
    await sauverSeance(base, seance('a', '2026-10-01T10:00:00Z'));
    await sauverSeance(base, seance('b', '2026-10-02T10:00:00Z'));
    expect((await chargerDonnees(base)).seances.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('enregistrer deux fois la même séance la met à jour, sans doublon', async () => {
    await sauverSeance(base, seance('a', '2026-10-01T10:00:00Z'));
    await sauverSeance(base, { ...seance('a', '2026-10-01T10:00:00Z'), feel: 5 });
    const { seances } = await chargerDonnees(base);
    expect(seances).toHaveLength(1);
    expect(seances[0]!.feel).toBe(5);
  });

  it('une seule mesure par jour : la saisie du jour est mise à jour', async () => {
    const jour: MesureRecuperation = { date: '2026-10-03', energy: 3 };
    await sauverMesure(base, jour);
    await sauverMesure(base, { ...jour, energy: 4, hrv: 60 });
    const { recuperation } = await chargerDonnees(base);
    expect(recuperation).toEqual([{ date: '2026-10-03', energy: 4, hrv: 60 }]);
  });

  it('garde le profil, y compris l\'inventaire barre + disques', async () => {
    const halteres = { barre: 1.5978, disques: [{ poids: 1.1, quantite: 4 }, { poids: 2.3, quantite: 4 }] };
    await sauverProfil(base, { gear: ['Haltères'], dumbbells: [], halteres });
    expect((await chargerDonnees(base)).profil.halteres).toEqual(halteres);
  });

  it('les données survivent à la fermeture et à la réouverture de la base', async () => {
    await sauverSeance(base, seance('a', '2026-10-01T10:00:00Z'));
    const nom = base.name;
    base.close();
    expect((await chargerDonnees(new BaseBouge(nom))).seances).toHaveLength(1);
  });
});

describe('importer une sauvegarde du prototype', () => {
  it('importe séances, mesures et profil', async () => {
    const { rapport, versionSource } = await importerSauvegarde(base, TEXTE_V1);
    expect(versionSource).toBe(1);
    expect(rapport).toMatchObject({ seancesAjoutees: 2, mesuresAjoutees: 2 });
    const donnees = await chargerDonnees(base);
    expect(donnees.seances).toHaveLength(2);
    expect(donnees.recuperation).toHaveLength(2);
    expect(donnees.profil.dumbbells).toEqual([2.5, 5, 10]);
    expect(donnees.profil.diet).toBe('Végétarien');
  });

  it('importer deux fois le même fichier ne duplique rien', async () => {
    await importerSauvegarde(base, TEXTE_V1);
    const { rapport } = await importerSauvegarde(base, TEXTE_V1);
    expect(rapport).toMatchObject({ seancesAjoutees: 0, mesuresAjoutees: 0 });
    expect((await chargerDonnees(base)).seances).toHaveLength(2);
  });

  it('un fichier invalide est refusé et ne touche à rien', async () => {
    await sauverSeance(base, seance('a', '2026-10-01T10:00:00Z'));
    await expect(importerSauvegarde(base, 'pas du json')).rejects.toThrow(SauvegardeInvalide);
    expect((await chargerDonnees(base)).seances).toHaveLength(1);
  });

  it('n\'écrase pas ce qui a été saisi depuis l\'export', async () => {
    await sauverSeance(base, { ...seance('m1abc', '2026-09-28T18:30:00.000Z'), feel: 1 });
    await importerSauvegarde(base, TEXTE_V1);
    const { seances } = await chargerDonnees(base);
    expect(seances.find((s) => s.id === 'm1abc')!.feel).toBe(1);
  });
});

describe('exporter', () => {
  it('export puis import sur un autre appareil redonne les mêmes données', async () => {
    await importerSauvegarde(base, TEXTE_V1);
    const texte = await exporterTexte(base, new Date('2026-10-03T12:00:00Z'));
    expect(JSON.parse(texte)).toMatchObject({ app: 'bouge-de-la', v: 2, exportedAt: '2026-10-03T12:00:00.000Z' });

    const autre = new BaseBouge(`test-${compteur++}`);
    await importerSauvegarde(autre, texte);
    expect(await chargerDonnees(autre)).toEqual(await chargerDonnees(base));
  });
});

import { chargerBrouillon, effacerBrouillon, sauverBrouillon } from './base';

describe('séance en cours (brouillon)', () => {
  it('se sauvegarde, se relit, puis s\'efface', async () => {
    expect(await chargerBrouillon(base)).toBeNull();
    await sauverBrouillon(base, { exemple: 1 });
    expect(await chargerBrouillon(base)).toEqual({ exemple: 1 });
    await effacerBrouillon(base);
    expect(await chargerBrouillon(base)).toBeNull();
  });

  it('n\'apparaît pas dans l\'export', async () => {
    await sauverBrouillon(base, { exemple: 1 });
    expect(await exporterTexte(base, new Date())).not.toContain('exemple');
  });
});

import { supprimerSeance } from './base';

describe('supprimer une séance', () => {
  it('retire la séance choisie et garde les autres', async () => {
    await sauverSeance(base, seance('a', '2026-10-01T10:00:00Z'));
    await sauverSeance(base, seance('b', '2026-10-02T10:00:00Z'));
    await supprimerSeance(base, 'a');
    expect((await chargerDonnees(base)).seances.map((s) => s.id)).toEqual(['b']);
  });

  it('ne fait rien si la séance n\'existe pas', async () => {
    await supprimerSeance(base, 'inconnue');
    expect((await chargerDonnees(base)).seances).toEqual([]);
  });
});
