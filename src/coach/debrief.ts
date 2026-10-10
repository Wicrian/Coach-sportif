/**
 * Textes du bilan de séance (coach scripté). Le moteur calcule les faits, ce module les raconte :
 * sobre, honnête, jamais culpabilisant (« tu peux », jamais « tu dois »).
 */
import type { Seance } from '../donnees/types';
import type { FaitsSeance } from '../moteur/debrief';
import type { ReperesSemaine } from '../moteur/reperes';

export interface EntreeBilan {
  seance: Seance;
  /** Nom du type de séance (« Force », « Boxe »…), utilisé quand il n'y a pas d'exercices. */
  typeSeance: string;
  faits: FaitsSeance;
  /** Nom français de chaque exercice (clé → nom). */
  noms: Record<string, string>;
  /** Ce que le moteur propose la prochaine fois, exercice par exercice (déjà expliqué par le moteur). */
  suite: { nom: string; raison: string }[];
  /** R-51 : la prochaine séance du même type sera allégée. */
  prochaineAllegee: boolean;
  /** La semaine comparée aux repères du projet ; null si on ne la connaît pas. */
  reperes: ReperesSemaine | null;
}

export interface Bilan {
  accompli: string[];
  modifications: string[];
  suite: string[];
  ressenti: string[];
  polar: string[];
  /** Où en est la semaine par rapport aux repères : le cumul, pas « l'effet » d'une séance. */
  semaine: string[];
  conseil: string;
}

const kg = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const RESSENTIS = ['pénible', 'bof', 'correct', 'bien', 'super'];

export function redigerBilan(e: EntreeBilan): Bilan {
  const { seance, faits, noms } = e;
  const nom = (cle: string) => noms[cle] ?? cle;

  // --- Ce qui a été fait
  const accompli: string[] = [];
  const duree = seance.durationMin ? `, en ${seance.durationMin} min` : '';
  if (faits.exercices.length === 0) {
    accompli.push(`${e.typeSeance}${seance.durationMin ? `, ${seance.durationMin} min` : ''}${seance.source ? ` (${seance.source})` : ''}. Elle compte dans ta semaine.`);
  } else accompli.push(`${faits.series} série${faits.series > 1 ? 's' : ''} sur ${faits.exercices.length} exercice${faits.exercices.length > 1 ? 's' : ''}${duree}.`);
  if (faits.exercices.length > 0 && faits.volume > 0) {
    const v = Math.round(faits.volume).toLocaleString('fr-FR');
    const p = faits.volumePrecedent !== null ? Math.round(faits.volumePrecedent).toLocaleString('fr-FR') : null;
    if (faits.tendanceVolume === 'plus') accompli.push(`Ton volume : ${v} kg, un peu plus que la fois précédente (${p} kg).`);
    else if (faits.tendanceVolume === 'moins') accompli.push(`Ton volume : ${v} kg, un peu moins que la fois précédente (${p} kg). Ça arrive, et ça fait partie du rythme.`);
    else if (faits.tendanceVolume === 'pareil') accompli.push(`Ton volume : ${v} kg, à peu près pareil que la fois précédente (${p} kg).`);
    else accompli.push(`Ton volume : ${v} kg. C'est ton point de départ pour cette séance.`);
  }

  // --- Ce que tu as modifié
  const modifications: string[] = [];
  for (const x of faits.exercices) {
    if (x.sens === 'plus') {
      modifications.push(`Tu as monté la charge sur ${nom(x.key)} : ${kg(x.chargeFaite)} kg au lieu de ${kg(x.chargePrevue!)} kg. La prochaine fois, je pars de là.`);
    } else if (x.sens === 'moins') {
      modifications.push(`Tu as baissé la charge sur ${nom(x.key)} : ${kg(x.chargeFaite)} kg au lieu de ${kg(x.chargePrevue!)} kg. C'est une bonne décision d'ajuster : on repart de ce que tu as fait.`);
    }
    if (x.comparable && x.ecartReps > 0) modifications.push(`${nom(x.key)} : ${x.ecartReps} rep${x.ecartReps > 1 ? 's' : ''} de plus que prévu au total.`);
    if (x.comparable && x.ecartReps < 0) modifications.push(`${nom(x.key)} : ${-x.ecartReps} rep${-x.ecartReps > 1 ? 's' : ''} de moins que prévu au total. Le plan s'en sert pour la prochaine fois.`);
  }
  if (modifications.length === 0 && faits.exercices.some((x) => x.comparable)) modifications.push('Tu as suivi le plan tel quel.');

  // --- La suite
  const suite = e.suite.map((s) => `${s.nom} — ${s.raison}`);

  // --- Ressenti
  const ressenti: string[] = [];
  const feel = seance.feel;
  if (feel !== undefined) {
    if (feel <= 2) {
      ressenti.push(`Tu as trouvé la séance ${RESSENTIS[feel - 1]}.${e.prochaineAllegee ? " La prochaine du même type sera allégée d'un cran (une série de moins par exercice) : ce n'est pas un recul, c'est de l'écoute." : ''}`);
    } else if (feel === 3) {
      ressenti.push('Une séance correcte : ça compte autant que les autres.');
    } else {
      ressenti.push(`Une séance ${RESSENTIS[feel - 1]} : c'est ce qui donne envie de revenir.`);
    }
  }
  if (seance.effort !== undefined) ressenti.push(`Effort ressenti : ${seance.effort} sur 10.`);
  if (seance.reserve === 'aucune') ressenti.push("Tu es allé jusqu'au bout de tes séries. Viser plutôt 1 à 3 répétitions en réserve limite la fatigue sans freiner tes progrès.");
  else if (seance.reserve === '3-plus') ressenti.push("Il te restait 3 répétitions ou plus : tu avais de la marge, tu peux pousser un peu la prochaine fois si l'envie est là.");
  else if (seance.reserve === '1-2') ressenti.push('Il te restait 1 ou 2 répétitions : c\'est exactement la zone visée.');
  if (seance.gene) {
    const ou = seance.gene.zone ? ` (${seance.gene.zone})` : '';
    ressenti.push(`Tu as signalé une gêne${seance.gene.niveau === 'a-surveiller' ? ' à surveiller' : ' légère'}${ou}. Je la garde en note pour toi. Si elle revient ou dure, parles-en à un professionnel de santé : je ne peux pas poser de diagnostic.`);
  }

  // --- Polar
  const polar: string[] = [];
  const fc = seance.fc;
  if (fc && (fc.moy !== undefined || fc.max !== undefined)) {
    const parties = [fc.moy !== undefined ? `FC moyenne ${fc.moy} bpm` : null, fc.max !== undefined ? `FC max ${fc.max} bpm` : null].filter(Boolean);
    polar.push(`${parties.join(', ')}.`);
  }
  if (fc?.zones && fc.zones.some((z) => z > 0)) {
    polar.push(`Temps par zone : ${fc.zones.map((z, i) => `zone ${i + 1} ${z} min`).filter((_, i) => fc.zones![i]! > 0).join(', ')}.`);
  }

  // --- La semaine, comparée aux repères (jamais « l'effet » d'une séance seule)
  const semaine: string[] = [];
  const r = e.reperes;
  if (r && (r.muscles.length > 0 || r.minutes > 0)) {
    semaine.push("Une seule séance ne change pas ton cardio ni ta force : ça se construit sur des semaines. Voici donc où tu en es cette semaine.");
    for (const m of r.muscles) {
      const fois = m.seances === 1 ? '1 fois' : `${m.seances} fois`;
      const serie = m.series > 1 ? 'séries' : 'série';
      const fin = m.etat === 'dans'
        ? 'dans le repère pour débuter (4 à 10 séries par semaine).'
        : m.etat === 'sous'
          ? 'un peu en dessous du repère de 4 à 10 séries : la prochaine séance les complètera.'
          : 'au-dessus du repère de 4 à 10 séries pour débuter : tu peux lui laisser un peu de récupération.';
      semaine.push(`${m.muscle} : ${m.series} ${serie}, ${fois} dans la semaine — ${fin}`);
    }
    if (r.muscles.some((m) => m.seances === 1)) semaine.push("Repère : chaque muscle au moins 2 fois par semaine, avec 48 h entre deux séances.");
    if (r.minutes > 0) {
      semaine.push(`Temps d'activité : ${r.minutes} min sur ${r.minutesRepere} min par semaine (repère de l'OMS et de l'ACSM pour une activité modérée). Je ne mesure pas ton intensité, c'est donc un repère, pas un verdict.`);
    }
  }

  // --- Un seul conseil
  let conseil: string;
  if ((feel !== undefined && feel <= 2) || (seance.effort !== undefined && seance.effort >= 9)) {
    conseil = "Pour la suite : une marche facile ou un peu de mobilité demain, sans pression. Ton corps a travaillé.";
  } else if (modifications.some((m) => m.startsWith('Tu as monté'))) {
    conseil = "Pour la suite : tu as senti que c'était trop léger, et tu as eu raison de le dire. Continue à ajuster, c'est comme ça que le plan te ressemble.";
  } else {
    conseil = "Pour la suite : un petit check-in demain matin m'aidera à ajuster ta prochaine séance.";
  }

  return { accompli, modifications, suite, ressenti, polar, semaine, conseil };
}
