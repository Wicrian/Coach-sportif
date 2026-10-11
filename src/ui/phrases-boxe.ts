import { libelleCoup } from '../donnees/boxe';

/** Un morceau de phrase : le clip enregistré (si on en a un) et le texte qu'on lirait à la voix de l'iPhone. */
export interface Morceau { clip: string; texte: string }

/** Une annonce : son texte complet (voix de l'iPhone) et ses morceaux (voix enregistrée, clips mis bout à bout). */
export interface Phrase { texte: string; morceaux: Morceau[] }

const nombre = (n: number): Morceau => ({ clip: `nombre:${n}`, texte: String(n) });
const mot = (clip: string, texte: string): Morceau => ({ clip: `mot:${clip}`, texte });

export const phraseCoup = (id: string): Phrase => ({ texte: libelleCoup(id), morceaux: [{ clip: `coup:${id}`, texte: libelleCoup(id) }] });
export const phraseCompte = (n: number): Phrase => ({ texte: String(n), morceaux: [nombre(n)] });
export const phraseCombo = (numero: number): Phrase => ({ texte: `Combo ${numero}`, morceaux: [mot('combo', 'Combo'), nombre(numero)] });
export const phraseFin = (): Phrase => ({ texte: 'Séance terminée. Bravo.', morceaux: [mot('termine', 'Séance terminée. Bravo.')] });

/** « Prépare-toi. Ronde 1 sur 3. » (avant la première ronde). */
export const phraseDepart = (numero: number, total: number): Phrase => ({
  texte: `Prépare-toi. Ronde ${numero} sur ${total}.`,
  morceaux: [mot('preparetoi', 'Prépare-toi.'), mot('ronde', 'Ronde'), nombre(numero), mot('sur', 'sur'), nombre(total)],
});

/** « Repos. Ronde 2 sur 3. » */
export const phraseRepos = (numero: number, total: number): Phrase => ({
  texte: `Repos. Ronde ${numero} sur ${total}.`,
  morceaux: [mot('repos', 'Repos.'), mot('ronde', 'Ronde'), nombre(numero), mot('sur', 'sur'), nombre(total)],
});

/** « Combo 1 : Jab, Low kick arrière » : le combo présenté en entier, avant la ronde. */
export const phrasePresentation = (numero: number, coups: string[]): Phrase => ({
  texte: `Combo ${numero} : ${coups.map(libelleCoup).join(', ')}`,
  morceaux: [mot('combo', 'Combo'), nombre(numero), ...coups.map((c) => ({ clip: `coup:${c}`, texte: libelleCoup(c) }))],
});

/** Identifiants des clips d'une phrase qui ne sont pas dans la voix enregistrée (ex. une ronde numéro 13). */
export const clipsManquants = (p: Phrase, disponibles: Record<string, string> | undefined): string[] =>
  p.morceaux.map((m) => m.clip).filter((c) => !disponibles?.[c]);
