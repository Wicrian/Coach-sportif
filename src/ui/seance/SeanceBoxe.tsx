import { useEffect, useRef, useState } from 'preact/hooks';
import { SUPPORTS, libelleCoup, type ProgrammeBoxe, type ReglagesBoxe, type SupportBoxe } from '../../donnees/boxe';
import type { Playlist, Profil } from '../../donnees/types';
import { DUREE_MURAL_MIN, DUREE_RONDE, REPOS, TEMPO, avancer, combosJoues, etatDepart, resumeRonde, type ConseilBoxe, type EtatRonde } from '../../moteur/boxe';
import { avecProgrammes, avecReglages, dureeTotale, momentAnnonceCombo, phasesDeSeance, programmeChoisi, programmesDe, reglagesDe, vitesseVoix } from '../boxe';
import type { Details } from '../details';
import { EditeurBoxe } from '../EditeurBoxe';
import { Musique } from '../Musique';
import type { ChoixSon } from '../../donnees/types';
import { debloquerAudio, jouerSon } from '../son';
import { arreterVoix, debloquerVoix, direPhrase, surVoixChangees, voixDisponible, voixFrancaises } from '../voix';
import { phraseCombo, phraseCompte, phraseCoup, phraseDepart, phraseFin, phrasePresentation, phraseRepos, type Phrase } from '../phrases-boxe';
import { prechargerSons } from '../son';
import type { BrouillonLibre } from './libre';
import { SeanceLibre } from './SeanceLibre';
import { useVerrouEcran } from './verrou';

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const nombre = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const minutes = (sec: number) => `${Math.round(sec / 60)} min`;

interface Props {
  b: BrouillonLibre;
  profil: Profil;
  playlists: Playlist[];
  /** Son joué au début de chaque ronde (celui de fin de repos). */
  son: { choix: ChoixSon; perso?: string };
  onProfil: (profil: Profil) => Promise<void>;
  /** Conseil du jour (sac sur socle ou reflex bag), affiché en haut de la préparation. */
  conseil: ConseilBoxe;
  /** La séance démarre : l'horloge repart de zéro et on retient sur quoi on frappe. */
  onDebutGuide: (support: SupportBoxe) => void;
  onFinAffichee: () => void;
  onTerminer: (feel: number | undefined, details: Details) => void;
  onAbandon: () => void;
}

type Mode = 'prepa' | 'editeur' | 'guide' | 'fin' | 'libre';

function Reglage({ nom, valeur, onMoins, onPlus, moinsOff, plusOff }: { nom: string; valeur: string; onMoins: () => void; onPlus: () => void; moinsOff?: boolean; plusOff?: boolean }) {
  return (
    <div class="groupe">
      <span class="etiquette">{nom}</span>
      <div style="display:grid;grid-template-columns:56px 1fr 56px;gap:10px;align-items:center;margin-top:6px">
        <button class="mini neutre" style="padding:12px" disabled={moinsOff} aria-label={`Réduire : ${nom}`} onClick={onMoins}>−</button>
        <b style="text-align:center;font-size:18px">{valeur}</b>
        <button class="mini neutre" style="padding:12px" disabled={plusOff} aria-label={`Augmenter : ${nom}`} onClick={onPlus}>+</button>
      </div>
    </div>
  );
}

/** Séance de boxe guidée : préparation, rondes dictées par la voix, puis bilan comme les autres séances libres. */
export function SeanceBoxe({ b, profil, playlists, son, onProfil, conseil, onDebutGuide, onFinAffichee, onTerminer, onAbandon }: Props) {
  const [mode, setMode] = useState<Mode>('prepa');
  const [lance, setLance] = useState<{ programme: ProgrammeBoxe; reglages: ReglagesBoxe } | null>(null);
  const [voix, setVoix] = useState(() => voixFrancaises());
  const [support, setSupport] = useState<SupportBoxe>(b.support ?? conseil.support);
  const [dureeLibre, setDureeLibre] = useState<number | undefined>(undefined);

  useEffect(() => surVoixChangees(() => setVoix(voixFrancaises())), []);

  const programmes = programmesDe(profil);
  const programme = programmeChoisi(profil);
  const reglages = reglagesDe(profil);
  const phases = phasesDeSeance(programme, reglages);
  const modifier = (partiel: Partial<ReglagesBoxe>) => onProfil(avecReglages(profil, partiel));
  const clipsDuProfil = profil.boxe?.voixClips;
  const aVoixEnregistree = !!clipsDuProfil && Object.keys(clipsDuProfil).length > 0;
  const clipsEnUsage = aVoixEnregistree && reglages.sourceVoix === 'enregistree' ? clipsDuProfil : undefined;

  // Prépare les clips à l'avance : ils partent ensuite sans attendre.
  useEffect(() => {
    if (clipsDuProfil) void prechargerSons(Object.values(clipsDuProfil));
  }, [clipsDuProfil]);

  if (mode === 'libre') {
    return <SeanceLibre b={b} playlists={playlists} onFinAffichee={onFinAffichee} onTerminer={onTerminer} onAbandon={onAbandon} dureeConseilleeMin={dureeLibre} />;
  }
  if (mode === 'fin') {
    return <SeanceLibre b={b} playlists={playlists} onFinAffichee={onFinAffichee} onTerminer={onTerminer} onAbandon={onAbandon} debutParFin />;
  }
  if (mode === 'guide' && lance) {
    return (
      <Guide
        programme={lance.programme}
        reglages={lance.reglages}
        son={son}
        playlists={playlists}
        clips={clipsEnUsage}
        onTempo={(tempoSec) => void modifier({ tempoSec })}
        onFin={() => setMode('fin')}
        onAbandon={onAbandon}
      />
    );
  }

  if (mode === 'editeur') {
    return (
      <div class="pleine-largeur fond-clair">
        <div class="ecran fond-clair">
          <span class="legende" style="color:var(--plum)">BOXE GUIDÉE</span>
          <h1 style="margin-top:8px">Mes séries</h1>
          <EditeurBoxe
            programmes={programmes}
            garde={reglages.garde}
            onChanger={(liste) => void onProfil(avecProgrammes(profil, liste))}
            onFermer={() => setMode('prepa')}
          />
        </div>
      </div>
    );
  }

  const total = dureeTotale(phases);
  const lancer = () => {
    debloquerVoix();
    onDebutGuide('socle');
    setLance({ programme, reglages });
    setMode('guide');
  };
  const dureeMural = conseil.support === 'mural' && conseil.dureeMin ? conseil.dureeMin : DUREE_MURAL_MIN;
  const lancerMural = () => {
    onDebutGuide('mural');
    setDureeLibre(dureeMural);
    setMode('libre');
  };

  const choixSupport = (
    <div class="carte">
      <h3>Sur quoi tu frappes ?</h3>
      <div class="ligne-puces" style="margin-top:10px">
        {SUPPORTS.map((x) => (
          <button key={x.id} class={`puce ${support === x.id ? 'active' : ''}`} aria-pressed={support === x.id} onClick={() => setSupport(x.id)}>
            {x.nom}{conseil.support === x.id ? ' · conseillé' : ''}
          </button>
        ))}
      </div>
      <p style="margin-top:10px"><b>Conseil :</b> {conseil.raison}</p>
    </div>
  );

  if (support === 'mural') {
    return (
      <div class="pleine-largeur fond-clair">
        <div class="ecran fond-clair">
          <span class="legende" style="color:var(--plum)">BOXE</span>
          <h1 style="margin-top:8px">Reflex bag mural</h1>
          <p style="color:var(--plum);margin-top:8px">À ton propre rythme, avec ta musique : vitesse et synchronisation. Pas de voix ici.</p>
          {choixSupport}
          <div class="carte">
            <h3>Durée conseillée</h3>
            <p><b>{dureeMural} min</b>, à une intensité où tu peux parler. Tu peux arrêter avant ou continuer : le chrono est là pour t'aider.</p>
          </div>
          <div class="espace" />
          <div class="pile">
            <button class="btn btn-principal" onClick={lancerMural}>Lancer le chrono</button>
            <button class="btn btn-contour" onClick={() => { if (confirm("Abandonner cette séance sans l'enregistrer ?")) onAbandon(); }}>Abandonner</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="pleine-largeur fond-clair">
      <div class="ecran fond-clair">
        <span class="legende" style="color:var(--plum)">BOXE GUIDÉE</span>
        <h1 style="margin-top:8px">Prépare ta séance</h1>
        <p style="color:var(--plum);margin-top:8px">La voix te dicte chaque coup : tu frappes quand elle le dit.</p>
        {choixSupport}

        <div class="carte">
          <h3>Ta série</h3>
          <div class="ligne-puces" style="margin-top:10px">
            {programmes.map((p) => (
              <button key={p.id} class={`puce ${p.id === programme.id ? 'active' : ''}`} aria-pressed={p.id === programme.id} onClick={() => void modifier({ programmeId: p.id })}>{p.nom}</button>
            ))}
          </div>
          {phases.length === 0 ? (
            <p style="margin-top:10px">Cette série n'a encore aucun combo : compose-la avant de la lancer.</p>
          ) : (
            <p style="margin-top:10px">{phases.filter((p) => p.genre === 'ronde').length} ronde{phases.length > 2 ? 's' : ''} · environ {minutes(total)}, repos compris.</p>
          )}
          <div class="pile">
            <button class="btn btn-contour" onClick={() => setMode('editeur')}>Composer mes séries</button>
          </div>
        </div>

        <div class="carte">
          <h3>Rythme et durées</h3>
          <Reglage
            nom="Durée d'une ronde" valeur={mmss(reglages.dureeRondeSec)}
            moinsOff={reglages.dureeRondeSec <= DUREE_RONDE.min} plusOff={reglages.dureeRondeSec >= DUREE_RONDE.max}
            onMoins={() => void modifier({ dureeRondeSec: reglages.dureeRondeSec - DUREE_RONDE.pas })}
            onPlus={() => void modifier({ dureeRondeSec: reglages.dureeRondeSec + DUREE_RONDE.pas })}
          />
          <Reglage
            nom="Repos entre les rondes" valeur={`${reglages.reposSec} s`}
            moinsOff={reglages.reposSec <= REPOS.min} plusOff={reglages.reposSec >= REPOS.max}
            onMoins={() => void modifier({ reposSec: reglages.reposSec - REPOS.pas })}
            onPlus={() => void modifier({ reposSec: reglages.reposSec + REPOS.pas })}
          />
          <Reglage
            nom="Un coup toutes les" valeur={`${nombre(reglages.tempoSec)} s`}
            moinsOff={reglages.tempoSec <= TEMPO.min} plusOff={reglages.tempoSec >= TEMPO.max}
            onMoins={() => void modifier({ tempoSec: Math.round((reglages.tempoSec - TEMPO.pas) * 10) / 10 })}
            onPlus={() => void modifier({ tempoSec: Math.round((reglages.tempoSec + TEMPO.pas) * 10) / 10 })}
          />
          <p style="margin-top:8px;font-size:13px">Chaque combo se répète pendant sa part de la ronde. Tu pourras aussi changer le rythme en pleine ronde.</p>
        </div>

        {phases.length > 0 && (
          <div class="carte">
            <h3>Ce que tu vas faire</h3>
            {programme.rondes.map((ronde, i) => {
              const resume = resumeRonde(ronde, reglages.dureeRondeSec, reglages.tempoSec);
              if (resume.length === 0) return null;
              return (
                <div key={i} style="margin-top:10px">
                  <span class="etiquette">Ronde {i + 1}</span>
                  {resume.map((c, j) => (
                    <p key={j} style="margin:2px 0;font-size:14px">
                      {c.coups.map(libelleCoup).join(' · ')} <span class="discret">{c.repetitions > 0 ? `× ${c.repetitions}` : '— trop long pour le temps'}</span>
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div class="carte">
          <h3>La voix</h3>
          {aVoixEnregistree && (
            <div class="groupe">
              <span class="etiquette">Quelle voix ?</span>
              <div class="ligne-puces" style="margin-top:6px">
                <button class={`puce ${reglages.sourceVoix === 'enregistree' ? 'active' : ''}`} aria-pressed={reglages.sourceVoix === 'enregistree'} onClick={() => void modifier({ sourceVoix: 'enregistree' })}>{profil.boxe?.voixNom ?? 'Voix enregistrée'}</button>
                <button class={`puce ${reglages.sourceVoix === 'iphone' ? 'active' : ''}`} aria-pressed={reglages.sourceVoix === 'iphone'} onClick={() => void modifier({ sourceVoix: 'iphone' })}>Voix de l'iPhone</button>
              </div>
              <button class="mini neutre" style="margin-top:10px" onClick={() => { debloquerAudio(); debloquerVoix(); direPhrase(phrasePresentation(1, ['jab', 'low-kick-arriere', 'direct']), { clips: clipsEnUsage, voixId: reglages.voix }); }}>Écouter la voix</button>
            </div>
          )}
          {aVoixEnregistree && reglages.sourceVoix === 'enregistree' ? null : !voixDisponible() ? (
            <p>Ton navigateur ne propose pas de voix : la séance guidée fonctionnera sans son.</p>
          ) : (
            <>
              <div class="groupe">
                <label class="etiquette" for="voix">Voix</label>
                <select id="voix" class="champ" value={reglages.voix ?? ''} onChange={(e) => void modifier({ voix: (e.currentTarget as HTMLSelectElement).value || undefined })}>
                  <option value="">Voix par défaut</option>
                  {voix.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                </select>
              </div>
              <button class="mini neutre" style="margin-top:10px" onClick={() => { debloquerVoix(); direPhrase(phrasePresentation(1, ['jab', 'low-kick-arriere', 'direct', 'low-kick-avant']), { voixId: reglages.voix }); }}>Écouter la voix</button>
              <p style="margin-top:10px;font-size:13px">
                Sur iPhone, tu peux télécharger une voix plus naturelle : Réglages › Accessibilité › Contenu énoncé › Voix › Français, puis une voix « Améliorée » ou « Premium ». Elle apparaîtra ici après avoir rouvert l'application.
              </p>
            </>
          )}
        </div>

        <div class="espace" />
        <div class="pile">
          <button class="btn btn-principal" disabled={phases.length === 0} onClick={lancer}>Lancer la séance</button>
          <button class="btn btn-contour" onClick={() => setMode('libre')}>Sans guidage (chrono libre)</button>
          <button class="btn btn-contour" onClick={() => { if (confirm("Abandonner cette séance sans l'enregistrer ?")) onAbandon(); }}>Abandonner</button>
        </div>
      </div>
    </div>
  );
}

interface GuideProps {
  programme: ProgrammeBoxe;
  reglages: ReglagesBoxe;
  son: { choix: ChoixSon; perso?: string };
  playlists: Playlist[];
  /** Voix enregistrée à utiliser, ou rien pour la voix de l'iPhone. */
  clips?: Record<string, string>;
  onTempo: (tempoSec: number) => void;
  onFin: () => void;
  onAbandon: () => void;
}

/** La séance en cours : un repos, une ronde, un repos, une ronde… la voix annonce tout. */
function Guide({ programme, reglages, son, playlists, clips, onTempo, onFin, onAbandon }: GuideProps) {
  useVerrouEcran();
  const phases = useRef(phasesDeSeance(programme, reglages)).current;
  const nbRondes = phases.filter((p) => p.genre === 'ronde').length;

  const [index, setIndex] = useState(0);
  const [tempo, setTempo] = useState(reglages.tempoSec);
  const [muet, setMuet] = useState(false);
  const [enPause, setEnPause] = useState(false);
  const [parle, setParle] = useState<{ segment: number; position: number }>({ segment: -1, position: -1 });
  const [, setTic] = useState(0);

  const s = useRef({
    index: 0,
    debut: Date.now(),
    pause: null as number | null,
    etat: etatDepart as EtatRonde,
    dernierCompte: -1,
    comboAnnonce: false,
    tempo: reglages.tempoSec,
    muet: false,
    fini: false,
  });

  /** `coup` : seuls les coups suivent le rythme ; le reste est dit à vitesse normale. */
  const dire = (phrase: Phrase, coup = false) => {
    if (s.current.muet) return;
    direPhrase(phrase, { clips, voixId: reglages.voix, vitesse: vitesseVoix(s.current.tempo, coup) });
  };

  const entrer = (i: number) => {
    const c = s.current;
    c.index = i;
    c.debut = Date.now();
    c.etat = etatDepart;
    c.dernierCompte = -1;
    c.comboAnnonce = false;
    setIndex(i);
    setParle({ segment: -1, position: -1 });
    const ph = phases[i];
    if (!ph) return;
    if (ph.genre === 'repos') {
      const numero = phases.slice(0, i + 1).filter((p) => p.genre === 'repos').length;
      dire(i === 0 ? phraseDepart(numero, nbRondes) : phraseRepos(numero, nbRondes));
    } else {
      navigator.vibrate?.(200);
      void jouerSon(son.choix, son.perso).catch(() => undefined);
    }
  };

  const terminer = () => {
    const c = s.current;
    if (c.fini) return;
    c.fini = true;
    arreterVoix();
    if (!c.muet) direPhrase(phraseFin(), { clips, voixId: reglages.voix });
    onFin();
  };

  const suivant = () => {
    const i = s.current.index + 1;
    if (i >= phases.length) terminer();
    else entrer(i);
  };

  useEffect(() => {
    entrer(0);
    const horloge = setInterval(() => {
      const c = s.current;
      if (c.pause !== null || c.fini) return;
      const ph = phases[c.index];
      if (!ph) return;
      const t = (Date.now() - c.debut) / 1000;
      if (t >= ph.duree) { suivant(); return; }
      if (ph.genre === 'repos') {
        const premier = combosJoues(programme.rondes[ph.ronde]!)[0] ?? [];
        if (!c.comboAnnonce && premier.length > 0 && t >= momentAnnonceCombo(ph.duree, premier.length)) {
          c.comboAnnonce = true;
          dire(phrasePresentation(1, premier));
        }
        const reste = Math.ceil(ph.duree - t);
        if (reste <= 3 && reste >= 1 && c.dernierCompte !== reste) {
          c.dernierCompte = reste;
          dire(phraseCompte(reste));
        }
      } else {
        const ronde = programme.rondes[ph.ronde]!;
        const r = avancer(c.etat, t, ronde, ph.duree, c.tempo);
        c.etat = r.etat;
        if (r.annonce) {
          if (r.annonce.genre === 'combo') {
            dire(phraseCombo(r.annonce.numero));
            setParle({ segment: r.annonce.numero - 1, position: -1 });
          } else {
            dire(phraseCoup(r.annonce.coup), true);
            const n = combosJoues(ronde)[r.etat.segment]!.length;
            setParle({ segment: r.etat.segment, position: (r.etat.coup - 1 + n) % n });
          }
        }
      }
      setTic((n) => n + 1);
    }, 100);
    // Si la séance se termine normalement, on laisse finir « Séance terminée. Bravo. ».
    return () => { clearInterval(horloge); if (!s.current.fini) arreterVoix(); };
  }, []);

  const changerTempo = (delta: number) => {
    const v = Math.round(Math.min(TEMPO.max, Math.max(TEMPO.min, s.current.tempo + delta)) * 10) / 10;
    s.current.tempo = v;
    setTempo(v);
    onTempo(v);
  };
  const basculerPause = () => {
    const c = s.current;
    if (c.pause === null) {
      c.pause = Date.now();
      arreterVoix();
      setEnPause(true);
    } else {
      c.debut += Date.now() - c.pause;
      c.pause = null;
      setEnPause(false);
    }
  };
  const basculerVoix = () => {
    s.current.muet = !s.current.muet;
    if (s.current.muet) arreterVoix();
    setMuet(s.current.muet);
  };

  const phase = phases[index]!;
  const ecoule = s.current.pause !== null ? (s.current.pause - s.current.debut) / 1000 : (Date.now() - s.current.debut) / 1000;
  const reste = Math.max(0, phase.duree - ecoule);
  const fraction = phase.duree > 0 ? reste / phase.duree : 0;
  const C = 653.5;
  const ronde = programme.rondes[phase.ronde]!;
  const combos = combosJoues(ronde);
  const numeroRonde = phases.slice(0, index + 1).filter((p) => p.genre === 'repos').length;
  const estRepos = phase.genre === 'repos';
  const segmentCourant = !estRepos ? Math.max(0, parle.segment) : 0;
  const fond = estRepos ? 'fond-repos' : 'fond-sombre';

  const controles = (
    <>
      <div class="grille2" style="margin-top:14px">
        <button class="btn btn-voile" onClick={() => changerTempo(-TEMPO.pas)} disabled={tempo <= TEMPO.min} aria-label="Rythme plus rapide">Plus vite</button>
        <button class="btn btn-voile" onClick={() => changerTempo(TEMPO.pas)} disabled={tempo >= TEMPO.max} aria-label="Rythme plus lent">Plus lent</button>
      </div>
      <p class="discret" style="text-align:center;margin-top:6px">Un coup toutes les {nombre(tempo)} s</p>
      <div class="grille2" style="margin-top:10px">
        <button class="btn btn-voile" onClick={basculerPause}>{enPause ? 'Reprendre' : 'Pause'}</button>
        <button class="btn btn-voile" aria-pressed={muet} onClick={basculerVoix}>{muet ? 'Voix : coupée' : 'Voix : active'}</button>
      </div>
      <div class="grille2" style="margin-top:10px">
        <button class="btn btn-voile" onClick={suivant}>{estRepos ? 'Passer le repos' : 'Ronde suivante'}</button>
        <button class="btn btn-principal" onClick={terminer}>Terminer</button>
      </div>
      <div style="margin-top:10px"><Musique playlists={playlists} /></div>
      <button class="btn btn-voile" style="margin-top:10px" onClick={() => { if (confirm("Abandonner cette séance sans l'enregistrer ?")) { arreterVoix(); onAbandon(); } }}>Abandonner</button>
    </>
  );

  return (
    <div class={`pleine-largeur ${fond}`}>
      <div class={`ecran ${fond}`}>
        <div class="haut" style={estRepos ? 'color:#e8fff7' : undefined}>
          <span>{estRepos ? 'REPOS' : `RONDE ${numeroRonde}/${nbRondes}`}</span>
          <span>{estRepos ? `RONDE ${numeroRonde}/${nbRondes} ENSUITE` : `COMBO ${segmentCourant + 1}/${combos.length}`}</span>
        </div>

        <div class="anneau" role="timer" aria-label={`${estRepos ? 'Repos' : 'Ronde'} : ${Math.ceil(reste)} secondes restantes`}>
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="14" />
            <circle cx="120" cy="120" r="104" fill="none" stroke={estRepos ? '#fff' : '#ff4f8b'} stroke-width="14" stroke-linecap="round" stroke-dasharray={C} stroke-dashoffset={C * (1 - fraction)} />
          </svg>
          <div class="centre"><b style="font-size:58px">{mmss(reste)}</b><span>{enPause ? 'en pause' : estRepos ? 'repos' : 'ronde'}</span></div>
        </div>

        {estRepos ? (
          <div class="ensuite">
            <span style="font-size:13px;opacity:.9">Ensuite</span>
            {combos.map((c, j) => (
              <div key={j} style="margin-top:6px"><b style="font-size:16px">Combo {j + 1}</b> {c.map(libelleCoup).join(' · ')}</div>
            ))}
          </div>
        ) : (
          <div class="carte-sombre" aria-live="off">
            <span style="font-size:13px;opacity:.85">Combo {segmentCourant + 1}</span>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
              {combos[segmentCourant]!.map((id, k) => (
                <span key={k} style={`padding:8px 12px;border-radius:999px;font-weight:800;font-size:18px;${parle.segment === segmentCourant && parle.position === k ? 'background:#fff;color:#2a1330' : 'background:rgba(255,255,255,.12)'}`}>{libelleCoup(id)}</span>
              ))}
            </div>
          </div>
        )}
        {controles}
      </div>
    </div>
  );
}
