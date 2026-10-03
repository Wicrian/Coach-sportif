import type { Seance } from '../donnees/types';
import { lireNombre } from './checkin';

/** Saisie brute (texte) du bloc « Détails » de fin de séance. */
export interface SaisieDetails {
  effort?: number;
  reserve?: 'aucune' | '1-2' | '3-plus';
  gene?: 'legere' | 'a-surveiller';
  zoneGene: string;
  fcMoy: string;
  fcMax: string;
  /** Minutes passées dans les zones 1 à 5 de Polar. */
  zones: string[];
  note: string;
}

export type Details = Pick<Seance, 'effort' | 'reserve' | 'gene' | 'fc' | 'note'>;

/** Convertit la saisie en détails enregistrables ; tout ce qui est vide ou invalide est ignoré. */
export function lireDetails(s: SaisieDetails): Details {
  const d: Details = {};
  if (s.effort !== undefined) d.effort = s.effort;
  if (s.reserve) d.reserve = s.reserve;
  if (s.gene) {
    const zone = s.zoneGene.trim();
    d.gene = zone ? { niveau: s.gene, zone } : { niveau: s.gene };
  }

  const fc: NonNullable<Seance['fc']> = {};
  const moy = lireNombre(s.fcMoy);
  const max = lireNombre(s.fcMax);
  if (moy !== undefined) fc.moy = moy;
  if (max !== undefined) fc.max = max;
  const minutes = s.zones.map((z) => (z.trim() === '' ? undefined : lireNombre(z) ?? (z.trim() === '0' ? 0 : undefined)));
  if (minutes.some((m) => m !== undefined)) fc.zones = minutes.map((m) => m ?? 0);
  if (Object.keys(fc).length) d.fc = fc;

  const note = s.note.trim();
  if (note) d.note = note;
  return d;
}

export function appliquerDetails(seance: Seance, details: Details): Seance {
  return { ...seance, ...details };
}
