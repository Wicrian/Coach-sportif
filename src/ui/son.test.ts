import { describe, expect, it } from 'vitest';
import type { Profil } from '../donnees/types';
import { EVENEMENTS, SONS, TAILLE_MAX_SON, definirSon, fichierSonValide, notesDuSon, sonPour } from './son';

describe('sons de fin de repos', () => {
  it('propose des sons à choisir, dont « aucun »', () => {
    const ids = SONS.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['ding', 'cloche', 'double', 'aucun']));
  });

  it('chaque son synthétisé est une suite de notes courtes et douces', () => {
    for (const id of ['ding', 'cloche', 'double'] as const) {
      const notes = notesDuSon(id);
      expect(notes.length).toBeGreaterThan(0);
      for (const n of notes) {
        expect(n.frequence).toBeGreaterThan(200);
        expect(n.duree).toBeLessThanOrEqual(1.6);
        expect(n.volume).toBeGreaterThan(0);
        expect(n.volume).toBeLessThanOrEqual(0.35);
      }
    }
  });

  it('le double ding fait entendre deux sons distincts', () => {
    const debuts = new Set(notesDuSon('double').map((n) => n.debut));
    expect(debuts.size).toBeGreaterThanOrEqual(2);
  });

  it('« aucun » et le son personnel ne se synthétisent pas', () => {
    expect(notesDuSon('aucun')).toEqual([]);
    expect(notesDuSon('perso')).toEqual([]);
  });

  it('accepte un fichier audio léger', () => {
    expect(fichierSonValide({ size: 120_000, type: 'audio/mpeg' })).toBeNull();
  });
  it('refuse un fichier qui n\'est pas de l\'audio', () => {
    expect(fichierSonValide({ size: 1000, type: 'image/png' })).toMatch(/audio/i);
  });
  it('refuse un fichier trop lourd', () => {
    expect(fichierSonValide({ size: TAILLE_MAX_SON + 1, type: 'audio/mpeg' })).toMatch(/court|léger|lourd/i);
  });
});

describe('un son par moment de l\'application', () => {
  const profil = (extra: Partial<Profil> = {}): Profil => ({ gear: [], dumbbells: [], ...extra });

  it('cinq moments sont réglables', () => {
    expect(EVENEMENTS.map((e) => e.id)).toEqual(['ouverture', 'debutSeance', 'debutBoxe', 'finSeance', 'finRepos']);
  });

  it('par défaut : seule la fin de repos fait un ding, le reste est silencieux', () => {
    expect(sonPour(profil(), 'finRepos').choix).toBe('ding');
    for (const e of ['ouverture', 'debutSeance', 'debutBoxe', 'finSeance'] as const) expect(sonPour(profil(), e).choix).toBe('aucun');
  });

  it('reprend l\'ancien réglage de fin de repos', () => {
    const p = profil({ sonRepos: 'perso', sonPerso: 'data:audio/mpeg;base64,AAA', sonPersoNom: 'Mon son' });
    expect(sonPour(p, 'finRepos')).toEqual({ choix: 'perso', perso: 'data:audio/mpeg;base64,AAA', nom: 'Mon son' });
  });

  it('le réglage par moment prime sur l\'ancien', () => {
    const p = profil({ sonRepos: 'cloche', sons: { finRepos: { choix: 'double' } } });
    expect(sonPour(p, 'finRepos').choix).toBe('double');
  });

  it('définir un son ne touche pas aux autres moments', () => {
    const p = definirSon(profil({ sons: { finSeance: { choix: 'cloche' } } }), 'debutBoxe', { choix: 'perso', perso: 'data:audio/mpeg;base64,BBB', nom: 'Tiara' });
    expect(sonPour(p, 'debutBoxe').nom).toBe('Tiara');
    expect(sonPour(p, 'finSeance').choix).toBe('cloche');
  });

  it('définir un autre moment garde l\'ancien réglage de fin de repos', () => {
    const p = definirSon(profil({ sonRepos: 'cloche' }), 'ouverture', { choix: 'ding' });
    expect(sonPour(p, 'finRepos').choix).toBe('cloche');
    expect(p.sonRepos).toBeUndefined();
  });
});
