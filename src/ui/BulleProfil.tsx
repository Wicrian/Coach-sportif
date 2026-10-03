interface Props {
  src?: string;
  taille?: number;
  onClick?: () => void;
  etiquette?: string;
}

/** Bulle de profil : la photo de l'utilisateur, ou un rond rose avec une silhouette. */
export function Avatar({ src, taille = 44, onClick, etiquette = 'Ma photo' }: Props) {
  const contenu = src
    ? <img src={src} alt="" width={taille} height={taille} />
    : (
      <svg viewBox="0 0 24 24" width={taille * 0.55} height={taille * 0.55} fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    );
  const style = `width:${taille}px;height:${taille}px`;
  return onClick
    ? <button class="avatar" style={style} aria-label={etiquette} onClick={onClick}>{contenu}</button>
    : <span class="avatar" style={style} role="img" aria-label={etiquette}>{contenu}</span>;
}
