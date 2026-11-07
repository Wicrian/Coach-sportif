/** Côté de la photo de profil enregistrée, en pixels (suffisant pour une bulle, léger à stocker). */
export const COTE_AVATAR = 256;

/** Carré centré dans une image, pour recadrer sans déformer. */
export function rectangleCarre(largeur: number, hauteur: number): { x: number; y: number; cote: number } {
  const cote = Math.min(largeur, hauteur);
  return { x: Math.floor((largeur - cote) / 2), y: Math.floor((hauteur - cote) / 2), cote };
}

/** Lit une photo choisie par l'utilisateur, la recadre en carré et la réduit. Tout se passe sur l'appareil. */
export async function reduirePhoto(fichier: File): Promise<string> {
  const adresse = URL.createObjectURL(fichier);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Cette photo n'a pas pu être lue. Essaie une autre image."));
      img.src = adresse;
    });
    const { x, y, cote } = rectangleCarre(image.naturalWidth, image.naturalHeight);
    const toile = document.createElement('canvas');
    toile.width = toile.height = COTE_AVATAR;
    toile.getContext('2d')!.drawImage(image, x, y, cote, cote, 0, 0, COTE_AVATAR, COTE_AVATAR);
    return toile.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(adresse);
  }
}

/** Côté le plus long d'une image de coup enregistrée, en pixels. */
export const COTE_IMAGE_COUP = 720;

/** Dimensions après réduction : le plus long côté ne dépasse pas `max`, sans agrandir ni déformer. */
export function dimensionsReduites(largeur: number, hauteur: number, max: number): { largeur: number; hauteur: number } {
  const echelle = Math.min(1, max / Math.max(largeur, hauteur));
  return { largeur: Math.max(1, Math.round(largeur * echelle)), hauteur: Math.max(1, Math.round(hauteur * echelle)) };
}

/** Lit une image choisie par l'utilisateur et la réduit (proportions gardées). Tout se passe sur l'appareil. */
export async function reduireImage(fichier: File, max = COTE_IMAGE_COUP): Promise<string> {
  const adresse = URL.createObjectURL(fichier);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Cette image n'a pas pu être lue. Essaie une autre image."));
      img.src = adresse;
    });
    const { largeur, hauteur } = dimensionsReduites(image.naturalWidth, image.naturalHeight, max);
    const toile = document.createElement('canvas');
    toile.width = largeur;
    toile.height = hauteur;
    toile.getContext('2d')!.drawImage(image, 0, 0, largeur, hauteur);
    return toile.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(adresse);
  }
}
