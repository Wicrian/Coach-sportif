/**
 * Boxe guidée par la voix : les coups, les combos, les rondes et les séries de départ.
 * Les combos sont écrits en « avant / arrière » (indépendant de la garde) : c'est la voix qui dit le coup,
 * et l'utilisateur sait quelle main est la main avant (voir `membreDuCoup`).
 */

export type CoteCoup = 'avant' | 'arriere' | 'neutre';
export type FamilleCoup = 'poings' | 'corps' | 'pieds' | 'defense';

export interface CoupBoxe {
  id: string;
  /** Ce que dit la voix, et ce qui s'affiche. */
  libelle: string;
  cote: CoteCoup;
  famille: FamilleCoup;
  /** Rappel du geste, pour se souvenir de comment le faire (un repère, pas un cours). */
  rappel: string;
}

export const COUPS: CoupBoxe[] = [
  { id: 'jab', libelle: 'Jab', cote: 'avant', famille: 'poings', rappel: "Direct de la main avant : le bras part droit vers la cible, sans reculer l'épaule. Le poing se tourne paume vers le bas à l'arrivée, puis tu reviens en garde aussitôt." },
  { id: 'direct', libelle: 'Direct', cote: 'arriere', famille: 'poings', rappel: "Direct de la main arrière : pousse sur le pied arrière, pivote la hanche et l'épaule vers l'avant, le bras part droit. Poing paume vers le bas à l'arrivée ; l'autre main protège le menton." },
  { id: 'crochet-avant', libelle: 'Crochet avant', cote: 'avant', famille: 'poings', rappel: "Crochet de la main avant : bras plié à environ 90°, coude à hauteur de l'épaule. Le poing décrit un arc horizontal, entraîné par le pied avant, les hanches et le tronc qui tournent ensemble. L'autre main reste au menton." },
  { id: 'crochet-arriere', libelle: 'Crochet arrière', cote: 'arriere', famille: 'poings', rappel: "Crochet de la main arrière : bras plié à environ 90°, coude à hauteur de l'épaule. Le poing décrit un arc horizontal, entraîné par le pied arrière, les hanches et le tronc qui tournent ensemble. L'autre main reste au menton." },
  { id: 'uppercut-avant', libelle: 'Uppercut avant', cote: 'avant', famille: 'poings', rappel: 'Coup montant de la main avant : fléchis un peu les jambes, puis le poing monte de bas en haut, paume vers toi, en se relevant avec les jambes et le tronc. Reste proche du corps. L\'autre main reste au menton.' },
  { id: 'uppercut-arriere', libelle: 'Uppercut arrière', cote: 'arriere', famille: 'poings', rappel: 'Coup montant de la main arrière : fléchis un peu les jambes, puis le poing monte de bas en haut, paume vers toi, en se relevant avec les jambes et le tronc. Reste proche du corps. L\'autre main reste au menton.' },
  { id: 'crochet-corps-avant', libelle: 'Crochet au corps avant', cote: 'avant', famille: 'corps', rappel: 'Crochet au corps, main avant : comme le crochet, mais plus bas. Fléchis les genoux et penche un peu le tronc pour viser le flanc, coude près du corps, poing qui arrive par en dessous. L\'autre main reste au menton.' },
  { id: 'crochet-corps-arriere', libelle: 'Crochet au corps arrière', cote: 'arriere', famille: 'corps', rappel: 'Crochet au corps, main arrière : comme le crochet, mais plus bas. Fléchis les genoux et penche un peu le tronc pour viser le flanc, coude près du corps, poing qui arrive par en dessous. L\'autre main reste au menton.' },
  { id: 'low-kick-avant', libelle: 'Low kick avant', cote: 'avant', famille: 'pieds', rappel: "Coup de pied bas, jambe avant : vise la cuisse (ou le bas du sac) avec le tibia. Pivote sur le pied d'appui, la hanche tourne et la jambe fouette de l'extérieur vers l'intérieur. Garde les mains hautes." },
  { id: 'low-kick-arriere', libelle: 'Low kick arrière', cote: 'arriere', famille: 'pieds', rappel: "Coup de pied bas, jambe arrière : vise la cuisse (ou le bas du sac) avec le tibia. Pivote sur le pied d'appui, la hanche tourne et la jambe fouette de l'extérieur vers l'intérieur. Garde les mains hautes." },
  { id: 'middle-kick-avant', libelle: 'Middle kick avant', cote: 'avant', famille: 'pieds', rappel: "Coup de pied à mi-hauteur, jambe avant : même geste que le low kick mais à hauteur des côtes. Pivote davantage sur le pied d'appui et ouvre la hanche. Mains hautes." },
  { id: 'middle-kick-arriere', libelle: 'Middle kick arrière', cote: 'arriere', famille: 'pieds', rappel: "Coup de pied à mi-hauteur, jambe arrière : même geste que le low kick mais à hauteur des côtes. Pivote davantage sur le pied d'appui et ouvre la hanche. Mains hautes." },
  { id: 'front-kick-avant', libelle: 'Front kick avant', cote: 'avant', famille: 'pieds', rappel: "Coup de pied frontal, jambe avant : monte le genou vers l'avant, puis tends la jambe en poussant la plante du pied vers la cible. Reprends l'équilibre et reviens en garde." },
  { id: 'front-kick-arriere', libelle: 'Front kick arrière', cote: 'arriere', famille: 'pieds', rappel: "Coup de pied frontal, jambe arrière : monte le genou vers l'avant, puis tends la jambe en poussant la plante du pied vers la cible. Reprends l'équilibre et reviens en garde." },
  { id: 'genou-avant', libelle: 'Genou avant', cote: 'avant', famille: 'pieds', rappel: "Genou, jambe avant : monte le genou vers l'avant et le haut, hanche poussée vers la cible. Garde les mains hautes et l'équilibre sur la jambe d'appui." },
  { id: 'genou-arriere', libelle: 'Genou arrière', cote: 'arriere', famille: 'pieds', rappel: "Genou, jambe arrière : monte le genou vers l'avant et le haut, hanche poussée vers la cible. Garde les mains hautes et l'équilibre sur la jambe d'appui." },
  { id: 'esquive', libelle: 'Esquive', cote: 'neutre', famille: 'defense', rappel: 'Esquive : déplace la tête hors de la trajectoire en fléchissant un peu les jambes, mains hautes, yeux sur la cible. Reviens en garde au centre.' },
  { id: 'parade', libelle: 'Parade', cote: 'neutre', famille: 'defense', rappel: "Parade : dévie le coup avec la main, d'un petit mouvement vers l'extérieur, sans reculer. Reviens aussitôt en garde." },
];

export const FAMILLES: { id: FamilleCoup; nom: string }[] = [
  { id: 'poings', nom: 'Poings' },
  { id: 'corps', nom: 'Au corps' },
  { id: 'pieds', nom: 'Pieds et genoux' },
  { id: 'defense', nom: 'Défense' },
];

const PAR_ID = new Map(COUPS.map((c) => [c.id, c]));
export const coupDe = (id: string): CoupBoxe | undefined => PAR_ID.get(id);
export const libelleCoup = (id: string): string => PAR_ID.get(id)?.libelle ?? id;

export type Garde = 'orthodoxe' | 'gaucher';

/** Main (ou jambe) qui exécute le coup : en garde gaucher, l'avant est à droite. */
export function membreDuCoup(coup: CoupBoxe, garde: Garde): 'gauche' | 'droite' | undefined {
  if (coup.cote === 'neutre') return undefined;
  const avantEstGauche = garde === 'orthodoxe';
  return (coup.cote === 'avant') === avantEstGauche ? 'gauche' : 'droite';
}

/** Sur quoi on frappe : le sac sur socle (plus physique) ou le reflex bag mural musical (vitesse, synchronisation). */
export type SupportBoxe = 'socle' | 'mural';

export const SUPPORTS: { id: SupportBoxe; nom: string }[] = [
  { id: 'socle', nom: 'Sac sur socle' },
  { id: 'mural', nom: 'Reflex bag mural' },
];

export const libelleSupport = (id: SupportBoxe): string => SUPPORTS.find((x) => x.id === id)!.nom;

export type Combo = string[];

export interface RondeBoxe {
  combos: Combo[];
  /** Ajoute en dernier un combo qui reprend tous les précédents bout à bout (le « combo 3 »). */
  enchainer: boolean;
}

export interface ProgrammeBoxe {
  id: string;
  nom: string;
  rondes: RondeBoxe[];
}

export interface ReglagesBoxe {
  /** Durée d'une ronde, en secondes. */
  dureeRondeSec: number;
  /** Repos avant chaque ronde (et préparation avant la première), en secondes. */
  reposSec: number;
  /** Secondes entre deux coups annoncés. */
  tempoSec: number;
  garde: Garde;
  /** Identifiant de la voix choisie (voiceURI), ou absent pour la voix par défaut. */
  voix?: string;
  /** D'où vient la voix : les clips enregistrés (si on en a) ou la voix de l'iPhone. */
  sourceVoix: 'enregistree' | 'iphone';
  /** Volume de la voix par rapport à la musique (1 = normal). */
  volumeVoix: number;
  /** Montée en intensité : première ronde plus lente, puis le rythme choisi. Actif par défaut. */
  progressif: boolean;
  programmeId?: string;
}

/** Intervalles au reflex bag : de courts efforts séparés de repos, en blocs. */
export interface ReglagesIntervalles {
  /** Durée d'un effort, en secondes. */
  effortSec: number;
  /** Repos entre deux efforts, en secondes. */
  reposSec: number;
  /** Efforts par bloc. */
  repetitions: number;
  blocs: number;
}

export interface ProfilBoxe {
  programmes?: ProgrammeBoxe[];
  reglages?: Partial<ReglagesBoxe>;
  intervalles?: Partial<ReglagesIntervalles>;
  /** Voix enregistrée : un petit clip audio par mot ou par coup (adresses de données), gardés sur l'appareil. */
  voixClips?: Record<string, string>;
  /** Nom de la voix enregistrée, pour l'affichage. */
  voixNom?: string;
  /** Images des coups choisies par l'utilisateur (adresses de données), gardées sur l'appareil. */
  imagesCoups?: Record<string, string>;
}

/**
 * Séries de départ. La ronde 1 vient de la séance de référence de l'utilisateur ; les rondes 2 et 3
 * ont été dictées de vive voix : à vérifier dans l'éditeur. Les autres rondes restent à compléter.
 */
export const PROGRAMMES_DEPART: ProgrammeBoxe[] = [
  {
    id: 'depart',
    nom: 'Ma série de départ',
    rondes: [
      { combos: [['jab', 'low-kick-arriere'], ['direct', 'low-kick-avant']], enchainer: true },
      { combos: [['low-kick-arriere', 'crochet-avant'], ['low-kick-avant', 'direct']], enchainer: true },
      {
        combos: [
          ['jab', 'direct', 'crochet-avant', 'low-kick-arriere'],
          ['direct', 'crochet-avant', 'direct', 'low-kick-avant'],
        ],
        enchainer: true,
      },
    ],
  },
];
