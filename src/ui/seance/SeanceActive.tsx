import { useEffect, useRef, useState } from 'preact/hooks';
import { EXERCICES } from '../../donnees/exercices';
import type { Playlist, Seance, TypeSerie } from '../../donnees/types';
import type { InventaireHalteres } from '../../donnees/types';
import { decrireMontage } from '../../moteur/materiel';
import type { BonusPoussee } from '../../moteur/audace';
import { volumeSeance } from '../../moteur/volume';
import { nf, texteMontage } from '../format';
import { ajouterSerieBonus, arreter, finDeRepos, saisieInitiale, terminer, valider, type Brouillon } from './deroulement';

interface Props {
  b: Brouillon;
  inventaire?: InventaireHalteres;
  playlist?: Playlist;
  /** Séance précédente du même modèle, pour une comparaison sobre. */
  precedente?: Seance;
  bonus: BonusPoussee | null;
  onChange: (b: Brouillon) => void;
  onTerminer: (feel: number | undefined) => void;
  onAbandon: () => void;
}

const deuxHalteres = (cle: string) => EXERCICES[cle]?.deuxHalteres ?? false;
const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Chrono({ debut }: { debut: string }) {
  const [, setTic] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span class="chrono" aria-label="Temps de séance">{mmss(Date.now() - new Date(debut).getTime())}</span>;
}

function Musique({ playlist }: { playlist?: Playlist }) {
  if (!playlist) return null;
  return (
    <div class="musique">
      <span aria-hidden="true">♪</span>
      <span class="titre">{playlist.nom}<small>Apple Music · volume avec les boutons de l'iPhone</small></span>
      <a href={playlist.url} target="_blank" rel="noopener">Ouvrir</a>
    </div>
  );
}

/** Garde l'écran allumé pendant la séance (si l'appareil le permet). */
function useEcranAllume() {
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
}

/** Charge réellement montée sur un exercice (dernière série de travail), sinon la charge prévue. */
function chargeDe(b: Brouillon, i: number): number {
  const faites = b.realisees[i]!.filter((s) => s.type !== 'warmup');
  return faites.length ? faites[faites.length - 1]!.w : b.plan[i]!.series[0]!.w;
}

function voisine(liste: number[], w: number, sens: -1 | 1): number {
  if (sens === -1) return [...liste].reverse().find((c) => c < w - 0.05) ?? w;
  return liste.find((c) => c > w + 0.05) ?? w;
}

const TYPES: { type: TypeSerie; nom: string }[] = [
  { type: 'warmup', nom: 'Échauffement' },
  { type: 'normal', nom: 'Normale' },
  { type: 'failure', nom: "Jusqu'à l'échec" },
];

export function SeanceActive(p: Props) {
  useEcranAllume();
  const { b } = p;
  if (b.phase === 'serie') return <EcranSerie key={`${b.ei}:${b.si}:${b.realisees[b.ei]!.length}`} {...p} />;
  if (b.phase === 'repos') return <EcranRepos key={`${b.ei}:${b.si}:${b.realisees.flat().length}`} {...p} />;
  return <EcranFin {...p} />;
}

function EcranSerie({ b, inventaire, playlist, onChange, onAbandon }: Props) {
  const ex = b.plan[b.ei]!;
  const prevue = ex.series[b.si]!;
  const depart = saisieInitiale(b);
  const [reps, setReps] = useState(depart.reps);
  const [w, setW] = useState(depart.w);
  const [type, setType] = useState<TypeSerie>('normal');
  const [posture, setPosture] = useState(false);
  const [menu, setMenu] = useState(false);

  const montage = !ex.poidsDuCorps && inventaire ? texteMontage(decrireMontage(inventaire, w, ex.mode), ex.mode) : '';
  const precedent = b.ei > 0 ? b.plan[b.ei - 1]! : null;
  const memeCharge = b.si === 0 && precedent && !precedent.poidsDuCorps && !ex.poidsDuCorps && Math.abs(chargeDe(b, b.ei - 1) - w) < 0.05;

  const ecarts: string[] = [];
  const dr = reps - prevue.reps;
  if (type !== 'warmup') {
    if (dr) ecarts.push(`${Math.abs(dr)} rep${Math.abs(dr) > 1 ? 's' : ''} de ${dr > 0 ? 'plus' : 'moins'}`);
    if (!ex.poidsDuCorps && Math.abs(w - prevue.w) > 0.05) ecarts.push(w > prevue.w ? 'charge plus haute' : 'charge plus basse');
  }

  const faites = b.realisees[b.ei]!.filter((s) => s.type !== 'warmup').length;
  const ref = EXERCICES[ex.key]!;

  return (
    <div class="pleine-largeur fond-sombre">
      <div class="ecran fond-sombre">
        <div class="haut">
          <span>EXERCICE {b.ei + 1} SUR {b.plan.length}</span>
          <Chrono debut={b.debut} />
          <button class="bouton-rond" aria-label="Plus d'options" aria-expanded={menu} onClick={() => setMenu(!menu)}>⋯</button>
          {menu && (
            <div class="menu" role="menu">
              <button role="menuitem" onClick={() => onChange(arreter(b))}>Arrêter ici et terminer</button>
              <button role="menuitem" onClick={() => { if (confirm('Abandonner cette séance sans l\'enregistrer ?')) onAbandon(); }}>Abandonner sans enregistrer</button>
            </div>
          )}
        </div>

        <h2>{ex.nom}</h2>
        <div style="margin-top:10px">
          <span class="badge sur-sombre">{ex.muscle}</span>{' '}
          <span class="badge sur-sombre">{ex.series.length} séries · {prevue.reps} reps</span>
        </div>

        <div>
          <button class="bouton-texte" aria-expanded={posture} onClick={() => setPosture(!posture)}>{posture ? 'Masquer la posture' : 'Voir la posture'}</button>
        </div>
        {posture && (
          <div class="posture">
            <figure><img src={`${import.meta.env.BASE_URL}${ref.photos[0]}`} alt={`${ex.nom} : position de départ`} /><figcaption>Départ</figcaption></figure>
            <figure><img src={`${import.meta.env.BASE_URL}${ref.photos[1]}`} alt={`${ex.nom} : position finale`} /><figcaption>Fin</figcaption></figure>
            <p>{ref.consigne}</p>
          </div>
        )}

        <div class="carte-sombre">
          <span class="discret">À prendre</span>
          <b>{ex.poidsDuCorps ? 'Au poids du corps' : ex.mode === 'paire' ? `2 haltères · ${nf(w)} kg chacun` : `1 haltère · ${nf(w)} kg`}</b>
          {montage && <span class="discret">{montage}</span>}
          {memeCharge && <div class="indice">Même charge que l'exercice précédent : rien à changer.</div>}
        </div>
        <p class="discret" style="margin-top:10px">{ex.raison}</p>

        <div class="series" aria-label="Avancement des séries">
          {ex.series.map((_, i) => (
            <div key={i} class={`serie-puce ${i < faites ? 'faite' : i === b.si ? 'courante' : ''}`}>
              {i < faites ? '✓ ' : ''}Série {i + 1}<br />{i < faites ? 'faite' : i === b.si ? 'en cours' : 'à venir'}
            </div>
          ))}
        </div>

        <div class="saisie">
          <div class="ligne">
            <span class="etiquette">Répétitions</span>
            <div class="pas">
              <button aria-label="Une répétition de moins" onClick={() => setReps(Math.max(1, reps - 1))}>−</button>
              <div class="valeur">{reps}<small>prévu : {prevue.reps}</small></div>
              <button aria-label="Une répétition de plus" onClick={() => setReps(Math.min(60, reps + 1))}>+</button>
            </div>
          </div>
          {!ex.poidsDuCorps && (
            <div class="ligne">
              <span class="etiquette">Charge</span>
              <div class="pas">
                <button aria-label="Charge inférieure" onClick={() => setW(voisine(ex.chargesDispo, w, -1))}>−</button>
                <div class="valeur">{nf(w)}<small>kg · prévu : {nf(prevue.w)}</small></div>
                <button aria-label="Charge supérieure" onClick={() => setW(voisine(ex.chargesDispo, w, 1))}>+</button>
              </div>
            </div>
          )}
          <div class={`ecart ${ecarts.length ? '' : 'pareil'}`}>{ecarts.length ? `${ecarts.join(', ')} que prévu` : 'Comme prévu'}</div>
          <div class="ligne" style="margin-top:14px">
            <span class="etiquette">Type</span>
            <div class="puces">
              {TYPES.map((t) => <button key={t.type} class={`puce ${type === t.type ? 'active' : ''}`} onClick={() => setType(t.type)}>{t.nom}</button>)}
            </div>
          </div>
        </div>

        <div class="espace" />
        <Musique playlist={playlist} />
        <button class="btn btn-principal" style="margin-top:12px" onClick={() => onChange(valider(b, { reps, w: ex.poidsDuCorps ? 0 : w, type }))}>
          {type === 'warmup' ? "Valider l'échauffement" : 'Valider la série'}
        </button>
      </div>
    </div>
  );
}

function EcranRepos({ b, inventaire, playlist, onChange }: Props) {
  const ex = b.plan[b.ei]!;
  const suivante = { reps: ex.series[b.si]!.reps, w: saisieInitiale(b).w };
  const precedent = b.si === 0 && b.ei > 0 ? b.plan[b.ei - 1]! : null;
  const total = (precedent ?? ex).reposSec;

  const fin = useRef(Date.now() + total * 1000);
  const pause = useRef<number | null>(null);
  const [reste, setReste] = useState(total);
  const [duree, setDuree] = useState(total);
  const [enPause, setEnPause] = useState(false);
  const termine = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (pause.current !== null) return;
      const r = Math.max(0, Math.ceil((fin.current - Date.now()) / 1000));
      setReste(r);
      if (r === 0 && !termine.current) {
        termine.current = true;
        navigator.vibrate?.(250);
      }
    }, 250);
    return () => clearInterval(t);
  }, []);

  const ajuster = (delta: number) => {
    if (pause.current !== null) pause.current = Math.max(0, pause.current + delta * 1000);
    else fin.current += delta * 1000;
    const r = pause.current !== null ? Math.ceil(pause.current / 1000) : Math.max(0, Math.ceil((fin.current - Date.now()) / 1000));
    setReste(r);
    setDuree((d) => Math.max(d, r));
    termine.current = r === 0;
  };
  const basculerPause = () => {
    if (pause.current === null) { pause.current = Math.max(0, fin.current - Date.now()); setEnPause(true); }
    else { fin.current = Date.now() + pause.current; pause.current = null; setEnPause(false); }
  };

  const C = 653.5;
  const fraction = duree > 0 ? reste / duree : 0;
  const changeDeCharge = precedent && !precedent.poidsDuCorps && !ex.poidsDuCorps && Math.abs(chargeDe(b, b.ei - 1) - suivante.w) > 0.05;
  const montage = changeDeCharge && inventaire ? texteMontage(decrireMontage(inventaire, suivante.w, ex.mode), ex.mode) : '';

  return (
    <div class="pleine-largeur fond-repos">
      <div class="ecran fond-repos">
        <div class="haut" style="color:#e8fff7">
          <span>REPOS</span>
          <Chrono debut={b.debut} />
          <span style="width:44px" />
        </div>
        <div class="anneau" role="timer" aria-label={`Repos : ${reste} secondes restantes`}>
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="14" />
            <circle cx="120" cy="120" r="104" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-dasharray={C} stroke-dashoffset={C * (1 - fraction)} />
          </svg>
          <div class="centre"><b>{reste}</b><span>{reste === 0 ? "c'est reparti" : 'secondes'}</span></div>
        </div>

        <div class="ensuite">
          <span style="font-size:13px;opacity:.9">Ensuite</span>
          <b>{ex.nom} · série {b.si + 1}</b>
          {ex.poidsDuCorps ? `${suivante.reps} reps · au poids du corps` : `${suivante.reps} reps · ${nf(suivante.w)} kg`}
          {changeDeCharge && <div style="margin-top:8px;font-weight:700">Change les disques : {montage || `${nf(suivante.w)} kg`}</div>}
        </div>

        <div class="grille2" style="margin-top:18px">
          <button class="btn btn-voile" onClick={() => ajuster(-15)}>− 15 s</button>
          <button class="btn btn-voile" onClick={() => ajuster(15)}>+ 15 s</button>
        </div>
        <div class="espace" />
        <Musique playlist={playlist} />
        <div class="pile">
          {reste > 0 && <button class="btn btn-sombre" onClick={basculerPause}>{enPause ? 'Reprendre' : 'Pause'}</button>}
          <button class={`btn ${reste === 0 ? 'btn-sombre' : 'btn-voile'}`} onClick={() => onChange(finDeRepos(b))}>
            {reste === 0 ? 'Série suivante' : 'Passer le repos'}
          </button>
        </div>
      </div>
    </div>
  );
}

const RESSENTIS = ['Pénible', 'Bof', 'Correct', 'Bien', 'Super'];

function EcranFin({ b, precedente, bonus, onChange, onTerminer }: Props) {
  const [feel, setFeel] = useState<number | undefined>(undefined);
  const [bonusEcarte, setBonusEcarte] = useState(false);
  const apercu = terminer(b, undefined, new Date());
  const series = apercu.exercises.reduce((n, e) => n + e.sets.filter((s) => s.type !== 'warmup').length, 0);
  const volume = Math.round(volumeSeance(apercu, deuxHalteres));
  const avant = precedente ? Math.round(volumeSeance(precedente, deuxHalteres)) : null;
  const finiTout = b.plan.every((e, i) => b.realisees[i]!.filter((s) => s.type !== 'warmup').length >= e.series.length);

  return (
    <div class="pleine-largeur fond-clair">
      <div class="ecran fond-clair">
        <span class="legende" style="color:var(--plum)">{finiTout ? 'Dernière série faite' : 'Séance arrêtée'}</span>
        <h1 style="margin-top:12px">{finiTout ? 'Beau travail.' : 'C\'est déjà ça.'}</h1>
        <p style="color:var(--plum);margin-top:8px">
          {finiTout ? 'Tout ce qui était prévu est fait.' : 'Ce que tu as fait compte, et tout est enregistré.'}
          {avant ? ` La fois précédente, ton volume était de ${avant.toLocaleString('fr-FR')} kg.` : ''}
        </p>

        <div class="chiffres">
          <div class="chiffre"><b>{apercu.durationMin}</b><span>minutes</span></div>
          <div class="chiffre"><b>{series}</b><span>séries</span></div>
          <div class="chiffre"><b>{volume.toLocaleString('fr-FR')}</b><span>kg de volume</span></div>
        </div>

        {bonus && finiTout && !bonusEcarte && (
          <div class="carte">
            <h3>Une série de plus ?</h3>
            <p>{bonus.raison}</p>
            <div class="grille2" style="margin-top:14px">
              <button class="btn btn-principal" style="font-size:14px;padding:14px 8px" onClick={() => onChange(ajouterSerieBonus(b))}>Oui, une de plus</button>
              <button class="btn btn-contour" style="font-size:14px;padding:14px 8px" onClick={() => setBonusEcarte(true)}>Non, c'est bon</button>
            </div>
          </div>
        )}

        <h3 style="margin-top:24px">Comment c'était ?</h3>
        <div class="retour" role="group" aria-label="Ressenti de séance">
          {RESSENTIS.map((nom, i) => (
            <button key={nom} class={feel === i + 1 ? 'active' : ''} aria-pressed={feel === i + 1} onClick={() => setFeel(feel === i + 1 ? undefined : i + 1)}>{nom}</button>
          ))}
        </div>
        <div class="espace" />
        <button class="btn btn-principal" style="margin-top:18px" onClick={() => onTerminer(feel)}>Terminer</button>
      </div>
    </div>
  );
}
