import type { DisquesParCote, ModeCharge } from '../moteur/materiel';

export const nf = (n: number, decimales = 1): string => n.toLocaleString('fr-FR', { maximumFractionDigits: decimales });

/** « Barre + 1 disque de 2,3 kg de chaque côté ». Vide si le montage est inconnu. */
export function texteMontage(montage: DisquesParCote[] | null, _mode: ModeCharge): string {
  if (montage === null) return '';
  if (montage.length === 0) return 'Barre seule';
  const morceaux = montage.map((d) => `${d.quantite} disque${d.quantite > 1 ? 's' : ''} de ${nf(d.poids)} kg`);
  const liste = morceaux.length > 1 ? `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}` : morceaux[0];
  return `Barre + ${liste} de chaque côté`;
}
