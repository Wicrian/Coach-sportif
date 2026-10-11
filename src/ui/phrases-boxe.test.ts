import { describe, expect, it } from 'vitest';
import clips from '../donnees/clips-voix.json';
import { COUPS } from '../donnees/boxe';
import { clipsManquants, phraseCombo, phraseCompte, phraseCoup, phraseDepart, phraseFin, phrasePresentation, phraseRepos } from './phrases-boxe';

const ids = clips.map((c) => c.id);
const ids_de = (p: { morceaux: { clip: string }[] }) => p.morceaux.map((m) => m.clip);

describe('boxe — phrases dites par la voix', () => {
  it('un coup : son texte et son clip', () => {
    expect(phraseCoup('jab')).toEqual({ texte: 'Jab', morceaux: [{ clip: 'coup:jab', texte: 'Jab' }] });
  });

  it('le départ et le repos nomment la ronde', () => {
    expect(phraseDepart(1, 3).texte).toBe('Prépare-toi. Ronde 1 sur 3.');
    expect(ids_de(phraseDepart(1, 3))).toEqual(['mot:preparetoi', 'mot:ronde', 'nombre:1', 'mot:sur', 'nombre:3']);
    expect(phraseRepos(2, 3).texte).toBe('Repos. Ronde 2 sur 3.');
    expect(ids_de(phraseRepos(2, 3))).toEqual(['mot:repos', 'mot:ronde', 'nombre:2', 'mot:sur', 'nombre:3']);
  });

  it('le combo est présenté en entier : numéro, puis chaque coup', () => {
    const p = phrasePresentation(1, ['jab', 'low-kick-arriere']);
    expect(p.texte).toBe('Combo 1 : Jab, Low kick arrière');
    expect(ids_de(p)).toEqual(['mot:combo', 'nombre:1', 'coup:jab', 'coup:low-kick-arriere']);
  });

  it('le numéro de combo, le compte à rebours et la fin', () => {
    expect(phraseCombo(3).texte).toBe('Combo 3');
    expect(ids_de(phraseCombo(3))).toEqual(['mot:combo', 'nombre:3']);
    expect(ids_de(phraseCompte(2))).toEqual(['nombre:2']);
    expect(phraseFin().texte).toBe('Séance terminée. Bravo.');
  });

  it('chaque coup de la bibliothèque a son clip dans la liste à enregistrer', () => {
    for (const c of COUPS) expect(ids).toContain(`coup:${c.id}`);
  });

  it('tous les clips que les phrases demandent existent dans la liste (rondes et combos jusqu\'à 12)', () => {
    for (let n = 1; n <= 12; n++) {
      for (const p of [phraseDepart(n, 12), phraseRepos(n, 12), phraseCombo(n), phraseCompte(n)]) {
        for (const c of ids_de(p)) expect(ids).toContain(c);
      }
    }
    for (const c of ids_de(phraseFin())) expect(ids).toContain(c);
  });

  it('chaque clip a un identifiant unique et un texte à dire', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of clips) expect(c.dire.length).toBeGreaterThan(0);
  });

  it('repère les clips qui manquent à la voix enregistrée', () => {
    const p = phraseDepart(13, 13);
    expect(clipsManquants(p, { 'mot:preparetoi': 'x', 'mot:ronde': 'x', 'mot:sur': 'x' })).toEqual(['nombre:13', 'nombre:13']);
    expect(clipsManquants(phraseCoup('jab'), undefined)).toEqual(['coup:jab']);
  });
});
