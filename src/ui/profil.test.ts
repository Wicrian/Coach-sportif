import { describe, expect, it } from 'vitest';
import type { MesureRecuperation } from '../donnees/types';
import { derniereMesure, dernierPoids, joursDepuis, validerInventaire, validerPlaylist } from './profil';

describe('validerInventaire : barre + disques', () => {
  it('accepte le matériel réel de l\'utilisateur', () => {
    const r = validerInventaire('1,5978', [{ poids: '1,1', quantite: '4' }, { poids: '2,3', quantite: '4' }]);
    expect(r.erreur).toBeUndefined();
    expect(r.inventaire).toEqual({ barre: 1.5978, disques: [{ poids: 1.1, quantite: 4 }, { poids: 2.3, quantite: 4 }] });
  });

  it('ignore les lignes de disques vides', () => {
    expect(validerInventaire('2', [{ poids: '', quantite: '' }, { poids: '1', quantite: '2' }]).inventaire?.disques).toEqual([{ poids: 1, quantite: 2 }]);
  });

  it('additionne deux lignes du même poids', () => {
    expect(validerInventaire('2', [{ poids: '1', quantite: '2' }, { poids: '1', quantite: '2' }]).inventaire?.disques).toEqual([{ poids: 1, quantite: 4 }]);
  });

  it('refuse une barre absente ou invalide', () => {
    expect(validerInventaire('', []).erreur).toMatch(/barre/i);
    expect(validerInventaire('0', []).erreur).toMatch(/barre/i);
  });

  it('refuse un disque à moitié rempli', () => {
    expect(validerInventaire('2', [{ poids: '1,1', quantite: '' }]).erreur).toMatch(/disque/i);
    expect(validerInventaire('2', [{ poids: '', quantite: '4' }]).erreur).toMatch(/disque/i);
  });

  it('refuse un nombre de disques qui n\'est pas un entier positif', () => {
    expect(validerInventaire('2', [{ poids: '1', quantite: '2,5' }]).erreur).toMatch(/entier/i);
    expect(validerInventaire('2', [{ poids: '1', quantite: '0' }]).erreur).toMatch(/entier/i);
  });

  it('accepte une barre seule, sans disques', () => {
    expect(validerInventaire('3', []).inventaire).toEqual({ barre: 3, disques: [] });
  });
});

describe('validerPlaylist', () => {
  it('accepte un lien Apple Music', () => {
    expect(validerPlaylist({ nom: 'Boxe', url: 'https://music.apple.com/ca/playlist/boxe/pl.u-abc' })).toBeNull();
  });
  it('refuse un nom vide', () => expect(validerPlaylist({ nom: ' ', url: 'https://music.apple.com/x' })).toMatch(/nom/i));
  it('refuse un lien qui n\'est pas Apple Music', () => {
    expect(validerPlaylist({ nom: 'A', url: 'https://exemple.com/x' })).toMatch(/Apple Music/);
    expect(validerPlaylist({ nom: 'A', url: 'pas un lien' })).toMatch(/Apple Music/);
  });
});

describe('ce que l\'app sait de toi : dernières valeurs', () => {
  const rec: MesureRecuperation[] = [
    { date: '2026-09-20', weight: 82, energy: 3 },
    { date: '2026-09-28', mood: 4 },
    { date: '2026-10-02', weight: 81.2 },
  ];
  it('dernier poids connu et sa date', () => expect(dernierPoids(rec)).toEqual({ kg: 81.2, date: '2026-10-02' }));
  it('pas de poids : null', () => expect(dernierPoids([{ date: '2026-10-01', energy: 3 }])).toBeNull());
  it('dernière valeur d\'un champ, même si ce n\'est pas la mesure la plus récente', () => {
    expect(derniereMesure(rec, 'energy')).toEqual({ valeur: 3, date: '2026-09-20' });
    expect(derniereMesure(rec, 'mood')).toEqual({ valeur: 4, date: '2026-09-28' });
    expect(derniereMesure(rec, 'sore')).toBeNull();
  });
  it('nombre de jours depuis une date', () => expect(joursDepuis('2026-10-02', '2026-10-17')).toBe(15));
});
