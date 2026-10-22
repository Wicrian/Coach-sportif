/**
 * Textes du point de la semaine et des conseils en cas d'arrêt (coach scripté).
 * Le moteur (`moteur/point-semaine.ts`) calcule les faits ; ici on les raconte : sobre, honnête, jamais
 * culpabilisant ni alarmiste. Les effets décrits sont des ESTIMATIONS tirées d'études (voir
 * docs/recherche/arret-et-dose-minimale.md), pas des mesures sur l'utilisateur.
 */
import { MIN_ZONES_4_5_CIBLE, minutesEnZones45 } from '../moteur/boxe';
import { palierArret, type OptionSecours, type Objectif, type PalierArret, type PointSemaine, type Projection } from '../moteur/point-semaine';

export interface PhraseArret {
  titre: string;
  lignes: string[];
  /** À afficher en petit : d'où viennent ces estimations. */
  source: string;
}

const SOURCE = "Ce sont des estimations tirées d'études, souvent faites sur des personnes plus entraînées : pas des mesures sur toi.";

const PAR_PALIER: Record<PalierArret, { titre: string; lignes: string[] }> = {
  normal: {
    titre: 'Rien à signaler',
    lignes: [
      "Un repos de quelques jours fait partie de l'entraînement. D'après les études, il n'a pas d'effet mesurable sur ta force ni sur ton muscle.",
    ],
  },
  debut: {
    titre: 'Une pause qui commence à durer',
    lignes: [
      "D'après les études, la force et le muscle ne baissent pas de façon importante en deux semaines, surtout quand on s'entraînait déjà régulièrement. Les pertes grandissent avec la durée de la pause, plus vite chez les personnes peu actives.",
      "Côté cardio, les premières baisses sont petites. Ce qui s'effrite le plus vite à ce stade, c'est l'habitude.",
    ],
  },
  leger: {
    titre: 'Un arrêt de moins de quatre semaines',
    lignes: [
      "Des baisses légères de force et de cardio deviennent possibles. Elles ne te font pas repartir de zéro : dans une étude, des sportifs qui alternaient entraînement et arrêts de trois semaines ont obtenu des gains comparables à ceux qui s'entraînaient sans arrêt.",
      "Pour reprendre, la première séance peut être plus légère. Il n'y a rien à compenser.",
    ],
  },
  net: {
    titre: 'Une vraie pause',
    lignes: [
      "Après plus de quatre semaines, les baisses deviennent nettes (force, muscle, cardio), d'autant plus qu'on avait peu d'acquis.",
      "Rien d'irréversible : on reprend progressivement, avec des charges plus légères que la dernière fois, et ce qui avait été construit revient en général plus vite que la première fois.",
    ],
  },
};

const SUITE_OBJECTIF: Record<'muscle' | 'perte' | 'mixte', string[]> = {
  muscle: [
    "Pour ton objectif de prise de muscle : garder ce que tu as demande une séance de force par semaine ; en gagner demande deux séances et 4 à 10 séries par muscle.",
  ],
  perte: [
    "Pour ton objectif de perte de poids : le poids dépend surtout de l'alimentation. Bouger y contribue, et la force aide à protéger le muscle pendant un déficit. Les minutes d'activité s'additionnent, même en courtes séquences.",
  ],
  mixte: [
    "Pour ton objectif : garder ta force demande une séance de force par semaine, et la progresser deux. Côté poids, l'alimentation compte le plus ; bouger y contribue et les minutes s'additionnent.",
  ],
};

export function phraseArret(palier: PalierArret, objectif: Objectif): PhraseArret {
  const base = PAR_PALIER[palier];
  const lignes = [...base.lignes];
  if (palier !== 'normal' && objectif) lignes.push(...SUITE_OBJECTIF[objectif]);
  return { titre: base.titre, lignes, source: SOURCE };
}

const LIBELLE_PALIER: Record<PalierArret, string> = {
  normal: 'toujours un repos ordinaire',
  debut: 'une pause qui commence à durer : des effets très discrets sur le cardio, et l\'habitude qui s\'effrite',
  leger: 'un arrêt de moins de quatre semaines : des baisses légères possibles, qui se rattrapent vite',
  net: 'une vraie pause : des baisses nettes, avec une reprise progressive',
};

/** « Si tu continues encore quelques jours » : seulement ce qui change, sans dramatiser. */
export function phraseProjection(joursActuels: number, projections: Projection[]): string[] {
  const lignes: string[] = [];
  let palierAvant: PalierArret = palierArret(joursActuels);
  for (const p of projections) {
    if (p.palier !== palierAvant) lignes.push(`Dans ${p.dansJours} jours (${p.jours} jours sans séance) : ${LIBELLE_PALIER[p.palier]}.`);
    palierAvant = p.palier;
  }
  if (lignes.length === 0) lignes.push("Continuer encore quelques jours ne changerait rien de notable : rien d'urgent.");
  return lignes;
}

export interface PhrasesSemaine {
  titre: string;
  /** Les faits et l'état de la semaine. */
  lignes: string[];
  /** Ce que ça donne, honnêtement. */
  effets: string[];
}

export function phrasesSemaine(p: PointSemaine, objectif: Objectif, semainesReussies: number): PhrasesSemaine {
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
  const titre = p.enCours ? 'Cette semaine, pour l\'instant' : 'La semaine dernière';
  const lignes: string[] = [];

  if (p.nbSeances === 0) {
    lignes.push(p.enCours ? 'Aucune séance pour l\'instant. Il reste de la place cette semaine, même pour une courte.' : "Aucune séance cette semaine. Ça arrive : ça n'efface pas ce que tu as construit.");
  } else {
    lignes.push(`${pluriel(p.nbSeances, 'séance')} sur ${pluriel(p.joursActifs, 'jour')}, ${p.minutes} min d'activité (le repère : 150 min par semaine).`);
  }

  if (p.statut === 'mouvement') lignes.push("Du mouvement, mais pas de force cette semaine : ça compte pour le cardio et le bien-être. Pour garder ta force, une séance de force par semaine suffit.");
  if (p.statut === 'maintien') lignes.push("Une séance de force : c'est la dose de maintien. D'après les études, une séance par semaine suffit à garder sa force. Pour progresser, vise deux séances.");
  if (p.statut === 'progression') lignes.push("Deux séances de force ou plus : tu es au niveau où l'on progresse.");

  if (p.semaineReussie) lignes.push('Semaine réussie (trois séances ou plus).');
  else if (!p.enCours && p.nbSeances > 0) lignes.push('Pas encore une semaine réussie, et ce n\'est pas grave : la série repart avec la suivante.');

  if (semainesReussies > 0) lignes.push(`Tu as ${pluriel(semainesReussies, 'semaine')} réussie${semainesReussies > 1 ? 's' : ''} au total : elles restent acquises.`);

  const effets: string[] = ["Une seule semaine ne change rien de mesurable à ton corps : ce qui compte, c'est le cumul sur plusieurs semaines."];
  if (p.statut === 'aucune') effets.push("Cette semaine sans séance n'a, d'après les études, pas d'effet mesurable sur ta force ni sur ton muscle.");
  if (p.statut === 'maintien') effets.push("Effet estimé : ta force et ton muscle sont gardés, pas augmentés.");
  if (p.statut === 'progression') effets.push("Effet estimé : un stimulus suffisant pour progresser en force et en muscle, si ça se répète semaine après semaine.");
  if (p.statut === 'mouvement') effets.push("Effet estimé : un entretien du cardio, mais rien de particulier pour la force.");
  if (objectif === 'muscle') effets.push("Pour ton objectif de prise de muscle, les semaines à deux séances de force sont celles qui comptent le plus.");
  if (objectif === 'perte') effets.push("Pour ton objectif de perte de poids, le poids se joue surtout dans l'assiette ; ces séances y contribuent et protègent ton muscle.");
  return { titre, lignes, effets };
}

export interface PhraseSecours {
  titre: string;
  /** Ce qu'on fait, concrètement. */
  faire: string;
  /** Ce que ça fait vraiment. */
  effetReel: string;
  /** Ce que ça ne fait pas : dit clairement, pour ne pas survendre. */
  limite: string;
}

const SECOURS: Record<OptionSecours['id'], PhraseSecours> = {
  'force-minimale': {
    titre: 'Ta séance de force, version minimale',
    faire: 'Une seule série par exercice, avec tes charges habituelles. Sans chercher à en faire plus.',
    effetReel: "Garde ta force et ton muscle : d'après des études, une séance de force par semaine avec une série par exercice suffit à les maintenir, jusqu'à 32 semaines chez de jeunes adultes.",
    limite: "Maintenir n'est pas progresser : pour gagner du muscle, il faut plus de séries et deux séances par semaine. Les études portent sur des personnes qui s'entraînaient déjà, et les plus de 60 ans ont besoin d'un peu plus.",
  },
  'intensif-court': {
    titre: 'Un bloc court et intense : sac sur socle',
    faire: "5 minutes d'échauffement, puis 8 efforts de 30 secondes à fond, avec 15 secondes de repos. Environ 12 minutes en tout.",
    effetReel: "C'est la façon la plus efficace de garder ton cardio quand tu as peu de temps : d'après des études, on peut réduire la durée tant qu'on garde l'intensité. Avec ta ceinture, tu peux vérifier que tu as bien atteint les zones 4 et 5.",
    limite: "À fond veut dire à fond en gardant la technique, et seulement quand tu te sens en forme : si ta forme du jour est basse, ou après une longue pause, commence à « dur » plutôt qu'à « très dur ». Ça ne remplace pas la force pour garder le muscle.",
  },
  'cardio-court': {
    titre: 'Un cardio court : boxe, marche rapide ou corde',
    faire: "Une dizaine de minutes à un effort « assez dur » au plus.",
    effetReel: "Compte dans tes 150 minutes de la semaine, entretient le cardio et le bien-être. Des séquences courtes cumulées donnent des effets comparables à une séance d'une traite.",
    limite: "Garder son cardio demande surtout de garder l'intensité et de s'y mettre deux fois par semaine : une seule séance courte ralentit la baisse, sans forcément l'arrêter.",
  },
  'mini-dose': {
    titre: 'Une mini-dose : 5 minutes',
    faire: 'Marche rapide, escaliers, mobilité ou quelques minutes de shadow-boxing.',
    effetReel: "Elle compte dans ta semaine et garde le geste : elle évite le « tout ou rien » et empêche l'habitude de s'éteindre.",
    limite: "Soyons clairs : cinq minutes ne maintiennent ni ta force ni ton cardio à elles seules, et n'ont pas d'effet mesurable sur le muscle ou sur le poids. Leur valeur, c'est l'habitude, pas la forme.",
  },
};

export const phraseSecours = (id: OptionSecours['id']): PhraseSecours => SECOURS[id];

/** L'intensité visée pendant l'intensif court, dite simplement. */
export const CIBLE_INTENSITE = {
  effort: "Pendant les efforts, vise « dur à très dur » : 15 à 17 sur 20. Tu ne dois pas pouvoir parler.",
  polar: "Avec ta ceinture Polar : les zones 4 et 5 (80 à 100 % de ta fréquence cardiaque max).",
  prudence: "Garde la technique : si elle se dégrade, ralentis. Et si tu sens une douleur, arrête.",
} as const;

/** Après un intensif court : a-t-on atteint la zone visée ? Sans jugement ; si les zones ne sont pas saisies, on invite à le faire. */
export function retourIntensif(fc: { moy?: number; max?: number; zones?: number[] } | undefined): string[] {
  const minutes = minutesEnZones45(fc);
  if (minutes === null) return ["Tu peux saisir tes zones Polar (étape « données de la ceinture ») : l'application te dira si tu as atteint les zones 4 et 5."];
  if (minutes >= MIN_ZONES_4_5_CIBLE) return [`Tu as passé ${minutes} min dans les zones 4 et 5 : la zone visée est atteinte. C'est exactement ce qui garde le cardio avec peu de temps.`];
  return [
    `Tu as passé ${minutes} min dans les zones 4 et 5 (le repère : ${MIN_ZONES_4_5_CIBLE} min ou plus).`,
    "À la prochaine, tu peux frapper plus fort ou plus vite pendant les efforts, en gardant la technique. La fréquence cardiaque met aussi du temps à monter : ce n'est pas un échec.",
  ];
}
