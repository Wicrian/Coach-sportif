/**
 * Donne un fichier à l'utilisateur : la feuille de partage de l'iPhone quand elle existe (elle propose Calendrier,
 * Fichiers, AirDrop…), sinon un téléchargement classique.
 */
export async function partagerFichier(nom: string, contenu: string, type: string): Promise<'partage' | 'telecharge' | 'annule'> {
  const fichier = new File([contenu], nom, { type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [fichier] })) {
    try {
      await nav.share({ files: [fichier], title: nom });
      return 'partage';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'annule';
      // autre erreur : on retombe sur le téléchargement
    }
  }
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(fichier);
  lien.download = nom;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  return 'telecharge';
}
