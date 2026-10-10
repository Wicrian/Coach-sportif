import { useEffect, useState } from 'preact/hooks';
import type { Playlist } from '../../donnees/types';
import { libelleGenre } from '../activite';
import { DetailsSeance } from '../DetailsSeance';
import type { Details } from '../details';
import { Musique } from '../Musique';
import type { BrouillonLibre } from './libre';

const CONSEILS: Record<BrouillonLibre['kind'], string> = {
  box: "Lance ta séance dans Boxa ou Heavybox, ou travaille au sac ou au reflex bag. Échauffe-toi, reste à une intensité où tu peux parler, puis reviens ici pour terminer.",
  walk: "Marche à ton rythme. Tu dois pouvoir parler sans être essoufflé.",
  mob: "Prends ton temps : de la mobilité et des étirements doux, sans forcer.",
  cardio: "Du cardio léger : reste à une intensité confortable, où tu peux parler.",
};
const RESSENTIS = ['Pénible', 'Bof', 'Correct', 'Bien', 'Super'];
const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600) > 0 ? `${Math.floor(s / 3600)}:` : ''}${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

interface Props {
  b: BrouillonLibre;
  playlists: Playlist[];
  /** Appelé quand l'écran de fin s'affiche (pour jouer le son de fin de séance). */
  onFinAffichee: () => void;
  onTerminer: (feel: number | undefined, details: Details) => void;
  onAbandon: () => void;
}

/** Séance sans exercices à saisir : un chronomètre, ta musique, et le bilan à la fin. */
export function SeanceLibre({ b, playlists, onFinAffichee, onTerminer, onAbandon }: Props) {
  const [fin, setFin] = useState(false);
  const [feel, setFeel] = useState<number | undefined>(undefined);
  const [details, setDetails] = useState<Details>({});
  const [, setTic] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Garde l'écran allumé pendant la séance.
  useEffect(() => {
    let verrou: { release: () => Promise<void> } | null = null;
    const demander = async () => {
      try {
        verrou = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
      } catch { /* non disponible : sans importance */ }
    };
    void demander();
    const revenir = () => { if (document.visibilityState === 'visible') void demander(); };
    document.addEventListener('visibilitychange', revenir);
    return () => { document.removeEventListener('visibilitychange', revenir); void verrou?.release(); };
  }, []);

  const terminer = () => {
    setFin(true);
    onFinAffichee();
    window.scrollTo(0, 0);
  };

  if (fin) {
    return (
      <div class="pleine-largeur fond-clair">
        <div class="ecran fond-clair">
          <span class="legende" style="color:var(--plum)">{libelleGenre(b.kind)} · {mmss(Date.now() - new Date(b.debut).getTime())}</span>
          <h1 style="margin-top:12px">Bien joué.</h1>
          <p style="color:var(--plum);margin-top:8px">Dis-moi comment c'était : ça aidera à ajuster la suite.</p>
          <h3 style="margin-top:24px">Pendant la séance, tu t'es senti comment ?</h3>
          <div class="retour" role="group" aria-label="Ressenti de séance">
            {RESSENTIS.map((nom, i) => (
              <button key={nom} class={feel === i + 1 ? 'active' : ''} aria-pressed={feel === i + 1} onClick={() => setFeel(feel === i + 1 ? undefined : i + 1)}>{nom}</button>
            ))}
          </div>
          <DetailsSeance onChange={setDetails} force={false} />
          <div class="espace" />
          <button class="btn btn-principal" style="margin-top:18px" onClick={() => onTerminer(feel, details)}>Enregistrer et voir mon bilan</button>
        </div>
      </div>
    );
  }

  return (
    <div class="pleine-largeur fond-sombre">
      <div class="ecran fond-sombre">
        <div class="haut">
          <span>SÉANCE LIBRE</span>
          <span style="width:44px" />
        </div>
        <h2>{libelleGenre(b.kind)}</h2>
        <div class="anneau" style="width:min(260px,70vw)" role="timer" aria-label="Durée de la séance">
          <div class="centre" style="position:relative;height:100%;justify-content:center">
            <b style="font-size:58px">{mmss(Date.now() - new Date(b.debut).getTime())}</b>
            <span style="color:#e6c9ee">depuis le départ</span>
          </div>
        </div>
        <p class="discret" style="margin-top:18px;text-align:center">{CONSEILS[b.kind]}</p>
        <div class="espace" />
        <Musique playlists={playlists} />
        <div class="pile">
          <button class="btn btn-principal" onClick={terminer}>Terminer la séance</button>
          <button class="btn btn-voile" onClick={() => { if (confirm('Abandonner cette séance sans l\'enregistrer ?')) onAbandon(); }}>Abandonner</button>
        </div>
      </div>
    </div>
  );
}
