import type { Verdict } from './readiness';
import { moyenne } from './utilitaires';

export interface EntreeAudace {
  semainesReussiesConsecutives: number;
  semainesActives: number;
  /** Ressentis de séance (1 à 5), du plus ancien au plus récent. */
  ressentisRecents: number[];
  preparation: Verdict;
  /** L'utilisateur contredit le curseur (R-34). */
  contestation: 'pousser' | 'prudent' | null;
}

export interface BonusPoussee {
  forme: 'serie-en-plus';
  raison: string;
}

export interface CurseurAudace {
  /** 0 = prudent, 1 = audacieux. */
  valeur: number;
  raison: string;
  /** R-36 : petite poussée proposée sans lever le plafond de prudence. */
  bonus: BonusPoussee | null;
  regles: string[];
}

const PLAFOND_HABITUDE_NON_INSTALLEE = 0.75; // R-31
const SEMAINES_HABITUDE = 6; // R-31
const MIN = 0.05;
const SEUIL_RESSENTI = 2.3; // R-32
const BAISSE_RESSENTI = 0.2; // R-32
const BAISSE_ALLEGEE = 0.25; // R-33
const BAISSE_VIGILANCE = 0.1; // R-33
const CONTESTATION = 0.25; // R-34

const borne = (v: number, bas: number, haut: number) => Math.max(bas, Math.min(haut, v));

export function curseurAudace(e: EntreeAudace): CurseurAudace {
  const regles = ['R-30', 'R-35'];
  const habitudeInstallee = e.semainesActives >= SEMAINES_HABITUDE;
  const plafond = habitudeInstallee ? 1 : PLAFOND_HABITUDE_NON_INSTALLEE;

  // R-30 : régularité + ancienneté. R-31 : plafond appliqué AVANT les ajustements, pour
  // que « allégée » ou un mauvais ressenti baissent toujours réellement le curseur.
  const brut = (e.semainesReussiesConsecutives + Math.min(e.semainesActives, SEMAINES_HABITUDE) / 2) / 8;
  let valeur = Math.min(brut, plafond);
  if (brut > plafond) regles.push('R-31');

  const derniers = e.ressentisRecents.slice(-4);
  const ressentiBas = derniers.length >= 2 && moyenne(derniers)! <= SEUIL_RESSENTI;
  if (ressentiBas) {
    valeur -= BAISSE_RESSENTI;
    regles.push('R-32');
  }

  if (e.preparation === 'allegee') valeur -= BAISSE_ALLEGEE;
  else if (e.preparation === 'vigilance') valeur -= BAISSE_VIGILANCE;
  if (e.preparation !== 'normale') regles.push('R-33');

  if (e.contestation === 'pousser') valeur += CONTESTATION;
  else if (e.contestation === 'prudent') valeur -= CONTESTATION;
  if (e.contestation) regles.push('R-34');

  valeur = borne(valeur, MIN, plafond);

  // R-36 (hypothèse) : l'envie de pousser ne lève pas le plafond ; elle ouvre un petit bonus,
  // seulement si le corps et le moral suivent.
  const bonus: BonusPoussee | null =
    e.contestation === 'pousser' && e.preparation === 'normale' && !ressentiBas
      ? { forme: 'serie-en-plus', raison: "Tu as envie de pousser et ta forme le permet : tu peux ajouter une série sur ton dernier exercice. Tu t'arrêtes quand tu veux." }
      : null;
  if (bonus) regles.push('R-36');

  let raison: string;
  if (e.contestation === 'pousser') {
    raison = bonus
      ? "Tu te sens prêt à pousser : je monte d'un cran et je te propose un petit bonus."
      : "Tu as envie de pousser, mais ta forme du jour ou tes derniers ressentis demandent de la douceur : on garde un rythme confortable aujourd'hui.";
  } else if (e.contestation === 'prudent') raison = 'Tu préfères rester prudent : on consolide.';
  else if (!habitudeInstallee) raison = "L'habitude est encore en train de s'installer : je reste prudent, on consolide avant d'accélérer.";
  else if (valeur > 0.5) raison = 'Vu ta régularité sur les dernières semaines, on peut pousser un peu.';
  else raison = 'Ça avance, mais je garde une marge : on reste sur un rythme confortable.';

  return { valeur, raison, bonus, regles };
}
