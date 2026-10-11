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
}

export const COUPS: CoupBoxe[] = [
  { id: 'jab', libelle: 'Jab', cote: 'avant', famille: 'poings' },
  { id: 'direct', libelle: 'Direct', cote: 'arriere', famille: 'poings' },
  { id: 'crochet-avant', libelle: 'Crochet avant', cote: 'avant', famille: 'poings' },
  { id: 'crochet-arriere', libelle: 'Crochet arrière', cote: 'arriere', famille: 'poings' },
  { id: 'uppercut-avant', libelle: 'Uppercut avant', cote: 'avant', famille: 'poings' },
  { id: 'uppercut-arriere', libelle: 'Uppercut arrière', cote: 'arriere', famille: 'poings' },
  { id: 'crochet-corps-avant', libelle: 'Crochet au corps avant', cote: 'avant', famille: 'corps' },
  { id: 'crochet-corps-arriere', libelle: 'Crochet au corps arrière', cote: 'arriere', famille: 'corps' },
  { id: 'low-kick-avant', libelle: 'Low kick avant', cote: 'avant', famille: 'pieds' },
  { id: 'low-kick-arriere', libelle: 'Low kick arrière', cote: 'arriere', famille: 'pieds' },
  { id: 'middle-kick-avant', libelle: 'Middle kick avant', cote: 'avant', famille: 'pieds' },
  { id: 'middle-kick-arriere', libelle: 'Middle kick arrière', cote: 'arriere', famille: 'pieds' },
  { id: 'front-kick-avant', libelle: 'Front kick avant', cote: 'avant', famille: 'pieds' },
  { id: 'front-kick-arriere', libelle: 'Front kick arrière', cote: 'arriere', famille: 'pieds' },
  { id: 'genou-avant', libelle: 'Genou avant', cote: 'avant', famille: 'pieds' },
  { id: 'genou-arriere', libelle: 'Genou arrière', cote: 'arriere', famille: 'pieds' },
  { id: 'esquive', libelle: 'Esquive', cote: 'neutre', famille: 'defense' },
  { id: 'parade', libelle: 'Parade', cote: 'neutre', famille: 'defense' },
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
