import type { Seance } from '../donnees/types';
import { ajouterJours, jourDe, lundiDeLaSemaine } from './utilitaires';

export interface ReperesMuscle {
  muscle: string;
  /** Séries de travail de la semaine (échauffements exclus). */
  series: number;
  /** Nombre de séances de la semaine où ce muscle a travaillé (R-11 : au moins 2). */
  seances: number;
  /** Position par rapport au repère débutant de 4 à 10 séries par semaine (R-12). */
  etat: 'sous' | 'dans' | 'au-dessus';
}

export interface ReperesSemaine {
  muscles: ReperesMuscle[];
  /** Temps d'activité de la semaine, toutes séances confondues. */
  minutes: number;
  /** Repère : 150 minutes d'activité par semaine (OMS 2020, ACSM). */
  minutesRepere: number;
}

const MIN_DEBUTANT = 4; // R-12
const MAX_DEBUTANT = 10; // R-12
const MINUTES_REPERE = 150;

/**
 * Où en est la semaine par rapport aux repères du projet, au moment de `courante`.
 * Ce n'est pas « l'effet » d'une séance (une séance seule ne change rien de mesurable) : c'est le cumul.
 */
export function reperesDeLaSemaine(
  seances: Seance[],
  courante: Seance,
  muscleDe: (cleExercice: string) => string[],
): ReperesSemaine {
  const lundi = lundiDeLaSemaine(jourDe(courante.date));
  const dimanche = ajouterJours(lundi, 6);
  const semaine = seances.filter((s) => {
    const j = jourDe(s.date);
    return j >= lundi && j <= dimanche && s.date <= courante.date;
  });

  const parMuscle = new Map<string, { series: number; seances: Set<string> }>();
  for (const s of semaine) {
    if (s.kind !== 'strength') continue;
    for (const e of s.exercises) {
      const travail = e.sets.filter((x) => x.type !== 'warmup').length;
      if (travail === 0) continue;
      for (const m of muscleDe(e.key)) {
        const fiche = parMuscle.get(m) ?? { series: 0, seances: new Set<string>() };
        fiche.series += travail;
        fiche.seances.add(s.id);
        parMuscle.set(m, fiche);
      }
    }
  }

  const muscles: ReperesMuscle[] = [...parMuscle].map(([muscle, f]) => ({
    muscle,
    series: f.series,
    seances: f.seances.size,
    etat: f.series < MIN_DEBUTANT ? 'sous' : f.series > MAX_DEBUTANT ? 'au-dessus' : 'dans',
  }));
  muscles.sort((a, b) => b.series - a.series || a.muscle.localeCompare(b.muscle, 'fr'));

  return { muscles, minutes: semaine.reduce((n, s) => n + (s.durationMin ?? 0), 0), minutesRepere: MINUTES_REPERE };
}
