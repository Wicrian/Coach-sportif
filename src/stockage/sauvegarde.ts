import type { Donnees, MesureRecuperation, Profil, Seance } from '../donnees/types';

/**
 * Format de sauvegarde (export / import JSON).
 * v1 = prototype (haltères en texte). v2 = version actuelle (haltères en nombres, inventaire
 * barre + disques possible). Les noms de champs de l'enveloppe ne changent jamais :
 * { app, v, exportedAt, profile, sessions, recovery }.
 */
export const VERSION_ACTUELLE = 2;
const NOM_APP = 'bouge-de-la';

export class SauvegardeInvalide extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SauvegardeInvalide';
  }
}

export interface FormatSauvegarde {
  app: string;
  v: number;
  exportedAt: string;
  profile: Profil;
  sessions: Seance[];
  recovery: MesureRecuperation[];
}

export interface RapportFusion {
  seancesAjoutees: number;
  seancesDejaPresentes: number;
  mesuresAjoutees: number;
  mesuresDejaPresentes: number;
  /** Champs du profil renseignés grâce au fichier. */
  profilCompleteChamps: string[];
}

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const triees = (nombres: number[]) => [...new Set(nombres)].sort((a, b) => a - b);

/** Le prototype stockait les haltères en texte (« 2,5 / 5 / 10 ») : on les convertit en liste de nombres. */
export function lireCharges(valeur: unknown): number[] {
  if (Array.isArray(valeur)) return triees(valeur.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0));
  if (typeof valeur !== 'string') return [];
  const trouves = valeur.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return triees(trouves.map((t) => parseFloat(t.replace(',', '.'))).filter((n) => n > 0));
}

function lireProfil(brut: unknown): Profil {
  const p = estObjet(brut) ? brut : {};
  return {
    ...p,
    gear: Array.isArray(p.gear) ? p.gear.filter((g): g is string => typeof g === 'string') : [],
    dumbbells: lireCharges(p.dumbbells),
  };
}

const dateValide = (d: unknown): d is string => typeof d === 'string' && !Number.isNaN(Date.parse(d));
const jourValide = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/** Lit un texte de sauvegarde (v1 ou v2) et le convertit au format actuel. Ne perd aucune donnée valide. */
export function lireSauvegarde(texte: string): { donnees: Donnees; versionSource: number; avertissements: string[] } {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new SauvegardeInvalide("Ce texte n'est pas une sauvegarde : il n'est pas au format JSON.");
  }
  if (!estObjet(brut) || brut.app !== NOM_APP) {
    throw new SauvegardeInvalide("Ce fichier n'est pas une sauvegarde de Bouge de là !.");
  }
  const versionSource = typeof brut.v === 'number' ? brut.v : 1;
  if (versionSource > VERSION_ACTUELLE) {
    throw new SauvegardeInvalide("Cette sauvegarde vient d'une version plus récente de l'application : mets l'application à jour avant de l'importer.");
  }

  const avertissements: string[] = [];

  const seances: Seance[] = [];
  (Array.isArray(brut.sessions) ? brut.sessions : []).forEach((s: unknown, i: number) => {
    if (!estObjet(s) || !dateValide(s.date)) {
      avertissements.push(`Séance n°${i + 1} ignorée : elle n'a pas de date valide.`);
      return;
    }
    let id = typeof s.id === 'string' ? s.id : '';
    if (id === '') {
      id = `import-${i + 1}-${s.date}`;
      avertissements.push(`Séance n°${i + 1} : identifiant manquant, un nouveau lui a été donné.`);
    }
    seances.push({ ...(s as unknown as Seance), id, exercises: Array.isArray(s.exercises) ? (s.exercises as Seance['exercises']) : [] });
  });

  const recuperation: MesureRecuperation[] = [];
  (Array.isArray(brut.recovery) ? brut.recovery : []).forEach((r: unknown, i: number) => {
    if (!estObjet(r) || !jourValide(r.date)) {
      avertissements.push(`Mesure n°${i + 1} ignorée : elle n'a pas de date valide.`);
      return;
    }
    recuperation.push(r as unknown as MesureRecuperation);
  });

  return { donnees: { profil: lireProfil(brut.profile), seances, recuperation }, versionSource, avertissements };
}

export function exporterSauvegarde(donnees: Donnees, maintenant: Date): FormatSauvegarde {
  return {
    app: NOM_APP,
    v: VERSION_ACTUELLE,
    exportedAt: maintenant.toISOString(),
    profile: donnees.profil,
    sessions: donnees.seances,
    recovery: donnees.recuperation,
  };
}

const estVide = (v: unknown) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Ajoute les données importées à celles de l'appareil, sans jamais rien écraser ni dupliquer :
 * séances reconnues par leur id, mesures par leur date, profil de l'appareil prioritaire.
 */
export function fusionner(existant: Donnees, importees: Donnees): { donnees: Donnees; rapport: RapportFusion } {
  const ids = new Set(existant.seances.map((s) => s.id));
  const nouvellesSeances = importees.seances.filter((s) => !ids.has(s.id));
  const jours = new Set(existant.recuperation.map((r) => r.date));
  const nouvellesMesures = importees.recuperation.filter((r) => !jours.has(r.date));

  const profil: Profil = { ...existant.profil };
  const profilCompleteChamps: string[] = [];
  for (const [cle, valeur] of Object.entries(importees.profil)) {
    if (cle === 'gear') continue;
    if (estVide(profil[cle]) && !estVide(valeur)) {
      profil[cle] = valeur;
      profilCompleteChamps.push(cle);
    }
  }
  profil.gear = [...new Set([...existant.profil.gear, ...importees.profil.gear])];

  return {
    donnees: {
      profil,
      seances: [...existant.seances, ...nouvellesSeances].sort((a, b) => b.date.localeCompare(a.date)),
      recuperation: [...existant.recuperation, ...nouvellesMesures].sort((a, b) => a.date.localeCompare(b.date)),
    },
    rapport: {
      seancesAjoutees: nouvellesSeances.length,
      seancesDejaPresentes: importees.seances.length - nouvellesSeances.length,
      mesuresAjoutees: nouvellesMesures.length,
      mesuresDejaPresentes: importees.recuperation.length - nouvellesMesures.length,
      profilCompleteChamps,
    },
  };
}
