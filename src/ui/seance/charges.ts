/**
 * Charge suivante (sens 1) ou précédente (sens -1) parmi celles que l'utilisateur peut réellement monter.
 * Si le matériel n'est pas renseigné (liste vide), on avance par pas de 1 kg.
 */
export function voisine(liste: number[], w: number, sens: -1 | 1): number {
  if (liste.length === 0) return Math.max(0, w + sens);
  if (sens === -1) return [...liste].reverse().find((c) => c < w - 0.05) ?? w;
  return liste.find((c) => c > w + 0.05) ?? w;
}
