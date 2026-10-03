/**
 * Formes de données de l'application.
 * Les noms des champs (hrv, rhr, sleep, weight, energy, sore, feel, kind, tplId…)
 * sont ceux de l'export du prototype : ne pas les renommer sans migration.
 */

/** Jour au format 'AAAA-MM-JJ'. */
export type Jour = string;

export interface MesureRecuperation {
  date: Jour;
  hrv?: number | null;
  rhr?: number | null;
  sleep?: number | null;
  weight?: number | null;
  /** Énergie ressentie, 1 à 5. */
  energy?: number | null;
  /** Courbatures, 1 à 5. */
  sore?: number | null;
  /** Moral / motivation du jour, 1 à 5. Enregistré pour « Ce que je sais de toi » ; pas encore utilisé par le moteur. */
  mood?: number | null;
}

export type TypeSerie = 'warmup' | 'normal' | 'drop' | 'failure';

export interface Serie {
  type: TypeSerie;
  /** Charge en kg (0 pour le poids du corps). */
  w: number;
  reps: number;
  /** Ce que l'app avait prévu pour cette série (pour comparer au réalisé). Facultatif. */
  wPrevu?: number;
  repsPrevus?: number;
}

export interface ExerciceRealise {
  key: string;
  sets: Serie[];
}

export type GenreSeance = 'strength' | 'walk' | 'mob' | 'box' | 'cardio';

export interface Seance {
  id: string;
  /** Date et heure ISO. */
  date: string;
  kind: GenreSeance;
  tplId?: string;
  /** Ressenti de séance, 1 (Pénible) à 5 (Super). */
  feel?: number;
  durationMin?: number;
  /** Application ou lieu d'une séance faite ailleurs (ex. « Boxa »). */
  source?: string;
  exercises: ExerciceRealise[];
}

/** Disques d'un même poids que l'utilisateur possède. */
export interface LotDisques {
  /** Poids d'un disque, en kg. */
  poids: number;
  /** Nombre total de disques de ce poids (tous haltères confondus). */
  quantite: number;
}

/**
 * Haltères ajustables : une barre + des disques. Les charges possibles sont
 * calculées par le moteur (jamais saisies à la main, jamais en dur).
 */
export interface InventaireHalteres {
  /** Poids d'une barre seule, en kg. */
  barre: number;
  disques: LotDisques[];
}

/**
 * Profil de l'utilisateur. Les noms viennent de l'export du prototype (gear, diet, why,
 * audOverride, dumbbells). Les champs inconnus sont conservés tels quels (aucune perte).
 */
export interface Profil {
  /** Matériel possédé (noms libres, ex. « Swiss ball »). */
  gear: string[];
  diet?: string;
  why?: string;
  /** Contestation du curseur d'audace : 'push' (prêt à pousser) ou 'safe' (rester prudent). */
  audOverride?: 'push' | 'safe' | null;
  /**
   * Anciennes charges fixes déclarées avant l'inventaire barre + disques. Le prototype les
   * stockait en texte (« 2,5 / 5 / 10 ») ; elles sont converties en nombres à l'import.
   */
  dumbbells: number[];
  /** Haltères ajustables : c'est ce qui sert au moteur (voir materiel.ts). */
  halteres?: InventaireHalteres;
  /** Playlists Apple Music, par type de séance. */
  playlists?: Playlist[];
  [autre: string]: unknown;
}

/** Tout ce que l'application garde sur l'appareil. */
export interface Donnees {
  profil: Profil;
  seances: Seance[];
  recuperation: MesureRecuperation[];
}

/** Une playlist (lien de partage Apple Music). `pour` vide = proposée pour toutes les séances. */
export interface Playlist {
  nom: string;
  url: string;
  pour?: GenreSeance[];
}
