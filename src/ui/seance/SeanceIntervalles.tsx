import { useEffect, useRef, useState } from 'preact/hooks';
import type { Playlist } from '../../donnees/types';
import type { ChoixSon } from '../../donnees/types';
import type { ReglagesIntervalles } from '../../donnees/boxe';
import { phasesIntervalles } from '../../moteur/boxe';
import { Musique } from '../Musique';
import { jouerSon } from '../son';
import { useVerrouEcran } from './verrou';

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

interface Props {
  config: ReglagesIntervalles;
  /** Son joué au début de chaque effort (celui de fin de repos). */
  son: { choix: ChoixSon; perso?: string };
  playlists: Playlist[];
  onFin: () => void;
  onAbandon: () => void;
}

/**
 * Intervalles au reflex bag : un effort court, un repos court, répétés en blocs. Pas de voix : un son net
 * au début de chaque effort, un autre au début du repos, et ta musique.
 */
export function SeanceIntervalles({ config, son, playlists, onFin, onAbandon }: Props) {
  useVerrouEcran();
  const phases = useRef(phasesIntervalles(config)).current;
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const [, setTic] = useState(0);
  const s = useRef({ index: 0, debut: Date.now(), pause: null as number | null, fini: false });

  const signal = (i: number) => {
    const ph = phases[i];
    if (!ph) return;
    if (ph.genre === 'effort') {
      navigator.vibrate?.(200);
      void jouerSon(son.choix, son.perso).catch(() => undefined);
    } else {
      navigator.vibrate?.(80);
      void jouerSon('double').catch(() => undefined);
    }
  };

  const entrer = (i: number) => {
    s.current.index = i;
    s.current.debut = Date.now();
    setIndex(i);
    signal(i);
  };
  const terminer = () => {
    if (s.current.fini) return;
    s.current.fini = true;
    onFin();
  };
  const suivant = () => {
    const i = s.current.index + 1;
    if (i >= phases.length) terminer();
    else entrer(i);
  };

  useEffect(() => {
    signal(0);
    const horloge = setInterval(() => {
      const c = s.current;
      if (c.pause !== null || c.fini) return;
      const ph = phases[c.index];
      if (!ph) return;
      if ((Date.now() - c.debut) / 1000 >= ph.duree) suivant();
      else setTic((n) => n + 1);
    }, 100);
    return () => clearInterval(horloge);
  }, []);

  const basculerPause = () => {
    const c = s.current;
    if (c.pause === null) {
      c.pause = Date.now();
      setEnPause(true);
    } else {
      c.debut += Date.now() - c.pause;
      c.pause = null;
      setEnPause(false);
    }
  };

  const ph = phases[index]!;
  const ecoule = s.current.pause !== null ? (s.current.pause - s.current.debut) / 1000 : (Date.now() - s.current.debut) / 1000;
  const reste = Math.max(0, ph.duree - ecoule);
  const fraction = ph.duree > 0 ? reste / ph.duree : 0;
  const C = 653.5;
  const estEffort = ph.genre === 'effort';
  const fond = estEffort ? 'fond-sombre' : 'fond-repos';
  const suivante = phases[index + 1];
  const titre = ph.genre === 'effort' ? 'EFFORT' : ph.genre === 'repos' ? 'REPOS' : 'PAUSE ENTRE LES BLOCS';

  return (
    <div class={`pleine-largeur ${fond}`}>
      <div class={`ecran ${fond}`}>
        <div class="haut" style={estEffort ? undefined : 'color:#e8fff7'}>
          <span>{titre}</span>
          <span>BLOC {ph.bloc}/{config.blocs} · {ph.genre === 'pause' ? 'FIN DU BLOC' : `EFFORT ${ph.repetition}/${config.repetitions}`}</span>
        </div>

        <div class="anneau" role="timer" aria-label={`${titre.toLowerCase()} : ${Math.ceil(reste)} secondes restantes`}>
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="14" />
            <circle cx="120" cy="120" r="104" fill="none" stroke={estEffort ? '#ff4f8b' : '#fff'} stroke-width="14" stroke-linecap="round" stroke-dasharray={C} stroke-dashoffset={C * (1 - fraction)} />
          </svg>
          <div class="centre"><b style="font-size:58px">{mmss(reste)}</b><span>{enPause ? 'en pause' : estEffort ? 'à fond, en gardant la technique' : 'souffle'}</span></div>
        </div>

        <p class="discret" style="text-align:center;margin-top:14px">
          {suivante ? `Ensuite : ${suivante.genre === 'effort' ? 'effort' : suivante.genre === 'repos' ? 'repos' : 'pause'} de ${suivante.duree} s` : 'Dernier effort.'}
        </p>

        <div class="grille2" style="margin-top:14px">
          <button class="btn btn-voile" onClick={basculerPause}>{enPause ? 'Reprendre' : 'Pause'}</button>
          <button class="btn btn-voile" onClick={suivant}>Passer</button>
        </div>
        <div class="pile">
          <button class="btn btn-principal" onClick={terminer}>Terminer</button>
        </div>
        <div style="margin-top:10px"><Musique playlists={playlists} /></div>
        <button class="btn btn-voile" style="margin-top:10px" onClick={() => { if (confirm("Abandonner cette séance sans l'enregistrer ?")) onAbandon(); }}>Abandonner</button>
      </div>
    </div>
  );
}
