import Dexie, { type Table } from 'dexie';
import type { Donnees, MesureRecuperation, Profil, Seance } from '../donnees/types';
import { exporterSauvegarde, fusionner, lireSauvegarde, type RapportFusion } from './sauvegarde';

const PROFIL_VIDE = (): Profil => ({ gear: [], dumbbells: [] });

interface LigneProfil {
  cle: 'profil';
  valeur: Profil;
}

/** Base locale : tout reste sur l'appareil, rien n'est envoyé à un serveur. */
export class BaseBouge extends Dexie {
  seances!: Table<Seance, string>;
  recuperation!: Table<MesureRecuperation, string>;
  profil!: Table<LigneProfil, string>;
  brouillon!: Table<{ cle: string; valeur: unknown }, string>;

  constructor(nom = 'bouge-de-la') {
    super(nom);
    this.version(1).stores({
      seances: 'id, date',
      recuperation: 'date',
      profil: 'cle',
    });
    this.version(2).stores({ brouillon: 'cle' });
  }
}

export async function chargerDonnees(base: BaseBouge): Promise<Donnees> {
  const [seances, recuperation, ligne] = await Promise.all([
    base.seances.orderBy('date').reverse().toArray(),
    base.recuperation.orderBy('date').toArray(),
    base.profil.get('profil'),
  ]);
  return { profil: ligne?.valeur ?? PROFIL_VIDE(), seances, recuperation };
}

export async function sauverSeance(base: BaseBouge, seance: Seance): Promise<void> {
  await base.seances.put(seance);
}

/** Une seule mesure par jour : une nouvelle saisie du même jour remplace la précédente. */
export async function sauverMesure(base: BaseBouge, mesure: MesureRecuperation): Promise<void> {
  await base.recuperation.put(mesure);
}

export async function sauverProfil(base: BaseBouge, profil: Profil): Promise<void> {
  await base.profil.put({ cle: 'profil', valeur: profil });
}

/**
 * Importe un texte de sauvegarde (prototype v1 ou export actuel) en l'ajoutant aux données
 * de l'appareil. Tout ou rien : un fichier invalide ne modifie rien.
 */
export async function importerSauvegarde(
  base: BaseBouge,
  texte: string,
): Promise<{ rapport: RapportFusion; avertissements: string[]; versionSource: number }> {
  const { donnees: importees, avertissements, versionSource } = lireSauvegarde(texte); // lève si invalide
  const rapport = await base.transaction('rw', base.seances, base.recuperation, base.profil, async () => {
    const existant = await chargerDonnees(base);
    const { donnees, rapport } = fusionner(existant, importees);
    const ids = new Set(existant.seances.map((s) => s.id));
    const jours = new Set(existant.recuperation.map((r) => r.date));
    await base.seances.bulkPut(donnees.seances.filter((s) => !ids.has(s.id)));
    await base.recuperation.bulkPut(donnees.recuperation.filter((r) => !jours.has(r.date)));
    await base.profil.put({ cle: 'profil', valeur: donnees.profil });
    return rapport;
  });
  return { rapport, avertissements, versionSource };
}

/** Texte JSON de la sauvegarde complète, prêt à être téléchargé. */
export async function exporterTexte(base: BaseBouge, maintenant: Date): Promise<string> {
  return JSON.stringify(exporterSauvegarde(await chargerDonnees(base), maintenant), null, 2);
}

/**
 * Séance en cours : gardée sur l'appareil pour survivre à un rechargement. Jamais exportée.
 * `cle` distingue la séance de force guidée ('seance') de la séance libre : boxe, marche… ('libre').
 */
export async function sauverBrouillon(base: BaseBouge, valeur: unknown, cle = 'seance'): Promise<void> {
  await base.brouillon.put({ cle, valeur });
}

export async function chargerBrouillon<T = unknown>(base: BaseBouge, cle = 'seance'): Promise<T | null> {
  return ((await base.brouillon.get(cle))?.valeur as T | undefined) ?? null;
}

export async function effacerBrouillon(base: BaseBouge, cle = 'seance'): Promise<void> {
  await base.brouillon.delete(cle);
}

export async function supprimerSeance(base: BaseBouge, id: string): Promise<void> {
  await base.seances.delete(id);
}
