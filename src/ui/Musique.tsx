import { useState } from 'preact/hooks';
import type { Playlist } from '../donnees/types';

/** Bloc musique : la playlist qui convient, avec un choix quand plusieurs conviennent. */
export function Musique({ playlists }: { playlists: Playlist[] }) {
  const [choix, setChoix] = useState(0);
  if (playlists.length === 0) return null;
  const playlist = playlists[Math.min(choix, playlists.length - 1)]!;
  return (
    <>
      {playlists.length > 1 && (
        <div class="musique-choix" role="group" aria-label="Choisir une playlist">
          {playlists.map((p, i) => (
            <button key={`${p.nom}-${i}`} class={i === choix ? 'active' : ''} aria-pressed={i === choix} onClick={() => setChoix(i)}>{p.nom}</button>
          ))}
        </div>
      )}
      <div class="musique" style={playlists.length > 1 ? 'margin-top:8px' : undefined}>
        <span aria-hidden="true">♪</span>
        <span class="titre">{playlist.nom}<small>Apple Music · volume avec les boutons de l'iPhone</small></span>
        <a href={playlist.url} target="_blank" rel="noopener">Ouvrir</a>
      </div>
    </>
  );
}
