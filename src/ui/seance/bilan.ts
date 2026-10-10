import { redigerBilan, type Bilan } from '../../coach/debrief';
import { EXERCICES, MODELES } from '../../donnees/exercices';
import type { Donnees, Seance } from '../../donnees/types';
import { analyserSeance } from '../../moteur/debrief';
import { reperesDeLaSemaine } from '../../moteur/reperes';
import { libelleGenre } from '../activite';
import { preparerSeance } from './preparer';

const deuxHalteres = (cle: string) => EXERCICES[cle]?.deuxHalteres ?? false;

/**
 * Bilan d'une séance : les faits (moteur), la suite que proposerait le moteur, et les phrases du coach.
 * Ne regarde que l'histoire jusqu'à cette séance incluse, pour que le bilan soit le même en le rouvrant plus tard.
 */
export function preparerBilan(seance: Seance, donnees: Donnees): Bilan | null {
  const histoire = donnees.seances.filter((s) => s.date <= seance.date);
  const precedente = seance.kind === 'strength'
    ? histoire.filter((s) => s.id !== seance.id && s.kind === 'strength' && s.tplId === seance.tplId).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
    : null;

  const faits = seance.kind === 'strength'
    ? analyserSeance(seance, precedente, deuxHalteres)
    : { exercices: [], series: 0, volume: 0, volumePrecedent: null, tendanceVolume: null };

  let suite: { nom: string; raison: string }[] = [];
  let prochaineAllegee = false;
  const modele = MODELES.find((m) => m.id === seance.tplId);
  if (seance.kind === 'strength' && modele) {
    const plan = preparerSeance({ modele, seances: histoire, profil: donnees.profil });
    const faits_ = new Set(faits.exercices.map((e) => e.key));
    suite = plan.exercices.filter((e) => faits_.has(e.key)).map((e) => ({ nom: e.nom, raison: e.raison }));
    prochaineAllegee = plan.allegee;
  }

  const muscleDe = (cle: string) => (EXERCICES[cle]?.muscle ?? '').split(',').map((m) => m.trim()).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1));
  const reperes = reperesDeLaSemaine(histoire, seance, muscleDe);

  const noms = Object.fromEntries(Object.entries(EXERCICES).map(([cle, e]) => [cle, e.nom]));
  return redigerBilan({ seance, typeSeance: libelleGenre(seance.kind), faits, noms, suite, prochaineAllegee, reperes });
}
