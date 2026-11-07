import { useState } from 'preact/hooks';
import { COUPS, FAMILLES, membreDuCoup, type Garde } from '../donnees/boxe';
import type { Profil } from '../donnees/types';
import { reduireImage } from './avatar';
import { reglagesDe } from './boxe';

interface Props {
  profil: Profil;
  onProfil: (profil: Profil) => Promise<void>;
}

/**
 * « Revoir les coups » : un rappel du geste pour chaque coup, et ta propre image si tu en as ajouté une
 * (une photo de toi, une capture, un dessin). Les images restent sur ton téléphone.
 */
export function GuideCoups({ profil, onProfil }: Props) {
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const garde: Garde = reglagesDe(profil).garde;
  const images = profil.boxe?.imagesCoups ?? {};

  const enregistrer = (imagesCoups: Record<string, string>) => onProfil({ ...profil, boxe: { ...profil.boxe, imagesCoups } });

  return (
    <div>
      <p style="margin-top:6px;font-size:13px">Ce sont des repères pour te rappeler le geste, pas un cours : un entraîneur reste la meilleure façon d'apprendre la technique. Tu peux ajouter ta propre image à chaque coup.</p>
      {FAMILLES.map((f) => (
        <div key={f.id} style="margin-top:12px">
          <span class="etiquette">{f.nom}</span>
          {COUPS.filter((c) => c.famille === f.id).map((c) => {
            const membre = membreDuCoup(c, garde);
            const image = images[c.id];
            return (
              <div key={c.id} style="border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px;margin-top:8px">
                <b>{c.libelle}</b>{membre ? <span class="discret"> · {membre}</span> : null}
                <p style="margin-top:4px;font-size:14px">{c.rappel}</p>
                {image && <img src={image} alt={`Image du coup : ${c.libelle}`} style="display:block;max-width:100%;max-height:260px;margin-top:8px;border-radius:var(--r-md)" />}
                <div class="grille2" style="margin-top:8px">
                  <label class="mini neutre" style="padding:12px;text-align:center;cursor:pointer">
                    {image ? "Changer l'image" : 'Ajouter une image'}
                    <input type="file" accept="image/*" style="display:none" onChange={async (e) => {
                      const input = e.currentTarget as HTMLInputElement;
                      const fichier = input.files?.[0];
                      if (!fichier) return;
                      try {
                        await enregistrer({ ...images, [c.id]: await reduireImage(fichier) });
                        setMessage({ texte: `Image enregistrée pour « ${c.libelle} ».`, erreur: false });
                      } catch (err) {
                        setMessage({ texte: err instanceof Error ? err.message : "Cette image n'a pas pu être enregistrée.", erreur: true });
                      }
                      input.value = '';
                    }} />
                  </label>
                  {image && (
                    <button class="mini neutre" style="padding:12px" onClick={() => { const { [c.id]: _retiree, ...reste } = images; void enregistrer(reste); }}>Retirer</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {message && <div class={`message ${message.erreur ? 'erreur' : ''}`} role="status">{message.texte}</div>}
    </div>
  );
}
