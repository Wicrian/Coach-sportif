import type { InventaireHalteres, Jour, MesureRecuperation } from '../donnees/types';
import { joursEntre } from '../moteur/utilitaires';
import { lireNombre } from './checkin';

export interface LigneDisque {
  poids: string;
  quantite: string;
}

/** Transforme la saisie (texte) en inventaire de haltères, ou explique ce qui ne va pas. */
export function validerInventaire(barre: string, lignes: LigneDisque[]): { inventaire?: InventaireHalteres; erreur?: string } {
  const poidsBarre = lireNombre(barre);
  if (poidsBarre === undefined) return { erreur: 'Indique le poids de la barre seule, en kg (par exemple 1,6).' };

  const lots = new Map<number, number>();
  for (const l of lignes) {
    const poidsTexte = l.poids.trim();
    const quantiteTexte = l.quantite.trim();
    if (poidsTexte === '' && quantiteTexte === '') continue;
    const poids = lireNombre(poidsTexte);
    if (poids === undefined || quantiteTexte === '') return { erreur: 'Chaque disque a besoin d\'un poids et d\'un nombre : complète ou supprime la ligne.' };
    const quantite = Number(quantiteTexte.replace(',', '.'));
    if (!Number.isInteger(quantite) || quantite < 1) return { erreur: 'Le nombre de disques doit être un entier, au moins 1.' };
    lots.set(poids, (lots.get(poids) ?? 0) + quantite);
  }
  return { inventaire: { barre: poidsBarre, disques: [...lots].map(([poids, quantite]) => ({ poids, quantite })) } };
}

export function validerPlaylist(p: { nom: string; url: string }): string | null {
  if (p.nom.trim() === '') return 'Donne un nom à ta playlist.';
  if (!/^https:\/\/music\.apple\.com\//.test(p.url.trim())) return 'Colle le lien de partage Apple Music (il commence par https://music.apple.com/).';
  return null;
}

export function dernierPoids(rec: MesureRecuperation[]): { kg: number; date: Jour } | null {
  const m = [...rec].sort((a, b) => b.date.localeCompare(a.date)).find((r) => typeof r.weight === 'number');
  return m ? { kg: m.weight!, date: m.date } : null;
}

/** Dernière valeur connue d'un champ du check-in, avec sa date. */
export function derniereMesure(rec: MesureRecuperation[], champ: 'energy' | 'mood' | 'sore'): { valeur: number; date: Jour } | null {
  const m = [...rec].sort((a, b) => b.date.localeCompare(a.date)).find((r) => typeof r[champ] === 'number');
  return m ? { valeur: m[champ]!, date: m.date } : null;
}

export const joursDepuis = (date: Jour, aujourdhui: Jour): number => joursEntre(date, aujourdhui);
