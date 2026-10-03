import type { ModeCharge } from '../moteur/materiel';

/** Un exercice de la bibliothèque. */
export interface ExerciceRef {
  nom: string;
  muscle: string;
  /** 'paire' : deux haltères chargés pareil. 'unique' : un seul haltère. Ignoré au poids du corps. */
  mode: ModeCharge;
  /** Vrai si l'exercice se fait deux côtés à la fois avec deux haltères (le volume compte double). */
  deuxHalteres: boolean;
  poidsDuCorps: boolean;
  cibleReps: number;
  reposSec: number;
  /** Charge conseillée pour une première fois, en kg (hypothèse : à revoir avec l'usage). */
  chargeInitiale: number;
  /** Consigne courte, en français. */
  consigne: string;
  /** Photos de départ et de fin (dossier public/exercices). */
  photos: [string, string];
}

const photos = (cle: string): [string, string] => [`exercices/${cle}-0.jpg`, `exercices/${cle}-1.jpg`];

/** Les 9 exercices du prototype. Photos et consignes de départ : Free Exercise DB (domaine public). */
export const EXERCICES: Record<string, ExerciceRef> = {
  ohp: {
    nom: 'Développé militaire haltères', muscle: 'Épaules', mode: 'paire', deuxHalteres: true, poidsDuCorps: false,
    cibleReps: 10, reposSec: 60, chargeInitiale: 2.5, photos: photos('ohp'),
    consigne: "Haltères à hauteur d'épaules, paumes vers l'avant. Pousse vers le haut jusqu'à ce qu'ils se touchent presque, puis redescends lentement.",
  },
  bench: {
    nom: 'Développé couché haltères', muscle: 'Pectoraux', mode: 'paire', deuxHalteres: true, poidsDuCorps: false,
    cibleReps: 10, reposSec: 60, chargeInitiale: 2.5, photos: photos('bench'),
    consigne: "Allongé, haltères de chaque côté de la poitrine, coudes à environ 90 degrés. Pousse vers le haut en expirant, puis redescends deux fois plus lentement que tu montes.",
  },
  row: {
    nom: 'Rowing unilatéral', muscle: 'Dos', mode: 'unique', deuxHalteres: false, poidsDuCorps: false,
    cibleReps: 10, reposSec: 60, chargeInitiale: 5, photos: photos('row'),
    consigne: "Une main et un genou en appui, dos droit, buste parallèle au sol. Tire l'haltère vers le côté de la poitrine, coude près du corps, en serrant le dos. Puis change de côté.",
  },
  goblet: {
    nom: 'Squat gobelet', muscle: 'Jambes', mode: 'unique', deuxHalteres: false, poidsDuCorps: false,
    cibleReps: 12, reposSec: 60, chargeInitiale: 5, photos: photos('goblet'),
    consigne: "Tiens l'haltère contre la poitrine, coudes serrés. Descends en gardant la poitrine haute et le dos droit, pousse les genoux vers l'extérieur, puis remonte.",
  },
  rdl: {
    nom: 'Soulevé de terre roumain', muscle: 'Ischios, fessiers', mode: 'paire', deuxHalteres: true, poidsDuCorps: false,
    cibleReps: 10, reposSec: 60, chargeInitiale: 5, photos: photos('rdl'),
    consigne: "Genoux à peine fléchis, dos droit, haltères devant les cuisses. Recule les hanches pour descendre les haltères le long des jambes, puis remonte en poussant les hanches vers l'avant.",
  },
  bug: {
    nom: 'Dead bug', muscle: 'Abdominaux', mode: 'paire', deuxHalteres: false, poidsDuCorps: true,
    cibleReps: 10, reposSec: 45, chargeInitiale: 0, photos: photos('bug'),
    consigne: "Sur le dos, bras tendus vers le plafond, hanches et genoux à 90 degrés. Plaque le bas du dos au sol, tends une jambe sans le décoller, reviens, puis alterne.",
  },
  pushup: {
    nom: 'Pompes', muscle: 'Pectoraux, triceps', mode: 'paire', deuxHalteres: false, poidsDuCorps: true,
    cibleReps: 8, reposSec: 60, chargeInitiale: 0, photos: photos('pushup'),
    consigne: "Mains un peu plus larges que les épaules, corps bien aligné. Descends la poitrine près du sol, puis repousse en expirant. Tu peux commencer sur les genoux.",
  },
  squat: {
    nom: 'Squat au poids du corps', muscle: 'Jambes', mode: 'paire', deuxHalteres: false, poidsDuCorps: true,
    cibleReps: 15, reposSec: 45, chargeInitiale: 0, photos: photos('squat'),
    consigne: "Pieds écartés à la largeur des épaules. Assieds-toi vers l'arrière, poitrine haute, genoux dans l'axe des pieds, puis remonte.",
  },
  bridge: {
    nom: 'Pont fessier sur swiss ball', muscle: 'Fessiers', mode: 'paire', deuxHalteres: false, poidsDuCorps: true,
    cibleReps: 12, reposSec: 45, chargeInitiale: 0, photos: photos('bridge'),
    consigne: "Haut du dos sur le ballon, pieds à plat. Monte les hanches en serrant les fessiers, marque une pause en haut, puis redescends en contrôlant.",
  },
};

export interface ModeleSeance {
  id: string;
  nom: string;
  exercices: string[];
  series: number;
}

export const MODELES: ModeleSeance[] = [
  { id: 'fb', nom: 'Full-body haltères', exercices: ['ohp', 'bench', 'row', 'goblet', 'rdl', 'bug'], series: 3 },
  { id: 'bw', nom: 'Poids du corps et swiss ball', exercices: ['pushup', 'squat', 'bridge', 'bug'], series: 3 },
];

/** Reps ciblées par exercice, au format attendu par la préparation du jour (R-04). */
export function ciblesReps(): Record<string, number> {
  return Object.fromEntries(Object.entries(EXERCICES).map(([cle, e]) => [cle, e.cibleReps]));
}
