import { useState } from 'preact/hooks';
import { MODELES } from '../donnees/exercices';
import type { Donnees, GenreSeance, Profil, Seance } from '../donnees/types';
import type { JourPlanifie } from '../moteur/planification';
import { jourDe } from '../moteur/utilitaires';
import { FormulaireExterne } from './EcranActivite';
import { conseilBoxeDuJour, dureeTotale, phasesDeSeance, programmeChoisi, reglagesDe } from './boxe';
import { libelleCoup, libelleSupport, type SupportBoxe } from '../donnees/boxe';
import { DUREE_MURAL_MIN, resumeRonde, type ConseilBoxe } from '../moteur/boxe';
import { libelleGenre } from './activite';
import { basculerIndisponible, descriptionType, genrePourType, libelleJour, libelleType, lignesPrevues, modeleConseille } from './plan';
import type { GenreLibre, OptionsLibre } from './seance/libre';
import { preparerSeance } from './seance/preparer';

interface Props {
  jour: JourPlanifie;
  aujourdhui: string;
  donnees: Donnees;
  onRetour: () => void;
  onLancer: (modeleId: string, enchainerBoxe?: boolean) => void;
  onLancerLibre: (kind: GenreLibre, options?: OptionsLibre) => void;
  onAjouter: (s: Seance) => Promise<void>;
  onProfil: (profil: Profil) => Promise<void>;
}

const AUTRES: GenreSeance[] = ['box', 'walk', 'mob', 'cardio'];
const DUREES: Record<GenreSeance, number> = { box: 35, walk: 25, mob: 15, cardio: 20, strength: 40 };

/** Ce que la voix va dicter : la série choisie, ronde par ronde (visible tous les jours, pas seulement aujourd'hui). */
function ApercuBoxe({ profil }: { profil: Profil }) {
  const programme = programmeChoisi(profil);
  const reglages = reglagesDe(profil);
  const phases = phasesDeSeance(programme, reglages);
  if (phases.length === 0) return <p style="margin-top:8px">Ta série « {programme.nom} » n'a pas encore de combo : compose-la dans Profil › Ma boxe guidée.</p>;
  return (
    <div style="margin-top:12px">
      <p><b>{programme.nom}</b> · {phases.filter((p) => p.genre === 'ronde').length} rondes de {Math.round(reglages.dureeRondeSec / 60 * 10) / 10} min · environ {Math.round(dureeTotale(phases) / 60)} min, repos compris.</p>
      {programme.rondes.map((ronde, i) => {
        const resume = resumeRonde(ronde, reglages.dureeRondeSec, reglages.tempoSec);
        if (resume.length === 0) return null;
        return (
          <div key={i} style="margin-top:10px">
            <span class="etiquette">Ronde {i + 1}</span>
            {resume.map((c, j) => <p key={j} style="margin:2px 0;font-size:14px">{c.coups.map(libelleCoup).join(' · ')}</p>)}
          </div>
        );
      })}
      <p style="margin-top:10px;font-size:13px">Tu peux changer de série, de rythme et de voix au moment de lancer, ou composer tes séries dans Profil › Ma boxe guidée.</p>
    </div>
  );
}

/** Le conseil de boxe du jour (sur quoi, combien de temps) et de quoi la lancer, en gardant le choix. */
function BlocBoxe({ profil, conseil, estAujourdhui, onLancerLibre }: { profil: Profil; conseil: ConseilBoxe; estAujourdhui: boolean; onLancerLibre: Props['onLancerLibre'] }) {
  const autre: SupportBoxe = conseil.support === 'socle' ? 'mural' : 'socle';
  const lancer = (support: SupportBoxe) =>
    onLancerLibre('box', support === 'mural' ? { support, dureeConseilleeMin: conseil.dureeMin ?? DUREE_MURAL_MIN } : { support });
  const detail = (support: SupportBoxe) =>
    support === 'mural' ? `${libelleSupport('mural')} · ${conseil.support === 'mural' && conseil.dureeMin ? conseil.dureeMin : DUREE_MURAL_MIN} min à ton rythme` : `${libelleSupport('socle')} · série guidée`;
  return (
    <div style="margin-top:12px">
      <p><b>Conseil : {detail(conseil.support)}.</b> {conseil.raison}</p>
      {conseil.support === 'socle' && <ApercuBoxe profil={profil} />}
      {estAujourdhui && (
        <div class="pile">
          <button class="btn btn-principal" onClick={() => lancer(conseil.support)}>Démarrer : {detail(conseil.support)}</button>
          <button class="btn btn-contour" onClick={() => lancer(autre)}>Plutôt : {detail(autre)}</button>
        </div>
      )}
      {!estAujourdhui && <p style="margin-top:8px;font-size:13px">Tu pourras choisir l'autre au moment de lancer.</p>}
    </div>
  );
}

export function FicheJour({ jour, aujourdhui, donnees, onRetour, onLancer, onLancerLibre, onAjouter, onProfil }: Props) {
  const estAujourdhui = jour.jour === aujourdhui;
  const { profil, seances } = donnees;
  const indispo = (profil.joursIndisponibles ?? []).includes(jour.jour);
  const [formulaire, setFormulaire] = useState<{ kind: GenreSeance; dureeMin: number } | null>(null);

  const type = jour.type;
  const modeleId = modeleConseille(seances);
  const modele = MODELES.find((m) => m.id === modeleId)!;
  const prevu = type === 'force' || type === 'combine' ? lignesPrevues(preparerSeance({ modele, seances, profil })) : null;
  const preselection = genrePourType(type);
  const faitsAujourdhui = seances.filter((s) => jourDe(s.date) === jour.jour);
  const titre = libelleJour(jour.jour, aujourdhui);
  const conseilBoxe = conseilBoxeDuJour(donnees, estAujourdhui);

  const ouvrirForm = (kind: GenreSeance) => {
    setFormulaire({ kind, dureeMin: DUREES[kind] });
    setTimeout(() => document.getElementById('formulaire-fiche')?.scrollIntoView(), 60);
  };

  return (
    <div class="ecran fond-clair avec-nav">
      <button class="retour-lien" onClick={onRetour}>← Retour au plan</button>
      <h1 class="premiere-majuscule">{titre}</h1>
      <div style="margin-top:10px">
        <span class={`badge ${type === 'force' ? 'force' : type === 'combine' ? 'combine' : type === 'boxe' ? 'boxe' : type === 'repos' ? 'repos' : 'legere'}`}>{libelleType(type)}</span>
        {jour.dureeMin && <span class="discret" style="margin-left:10px">{jour.dureeMin} min</span>}
      </div>

      {type === 'combine' ? (
        <>
          <div class="carte">
            <h3>Partie 1 : la force</h3>
            <p>Une force courte avec tes haltères ou ton poids du corps, avec peu de changements de disques.</p>
            <p style="margin-top:8px"><b>Pourquoi :</b> {jour.raison}</p>
            {prevu && <ul class="signaux">{prevu.map((l) => <li key={l.nom}><span><b>{l.nom}</b> — {l.detail}</span></li>)}</ul>}
            {prevu && <p style="margin-top:8px;font-size:13px">{modele.nom}. Les charges sont recalculées au moment où tu démarres, selon ta forme.</p>}
            {estAujourdhui && (
              <div class="pile"><button class="btn btn-principal" onClick={() => onLancer(modeleId, true)}>Démarrer la force, puis la boxe</button></div>
            )}
          </div>
          <div class="carte">
            <h3>Partie 2 : la boxe</h3>
            <p>{descriptionType('boxe')} À la fin de ta force, je te propose de l'enchaîner d'un geste.</p>
            <BlocBoxe profil={profil} conseil={conseilBoxe} estAujourdhui={estAujourdhui} onLancerLibre={onLancerLibre} />
          </div>
        </>
      ) : (
        <div class="carte">
          <h3>{type === 'repos' ? 'Jour de repos' : type === 'deja-fait' ? "Déjà bougé aujourd'hui" : 'Ce qui est prévu'}</h3>
          <p>{descriptionType(type)}</p>
          <p style="margin-top:8px"><b>Pourquoi :</b> {jour.raison}</p>

          {prevu && (
            <ul class="signaux">
              {prevu.map((l) => <li key={l.nom}><span><b>{l.nom}</b> — {l.detail}</span></li>)}
            </ul>
          )}
          {prevu && <p style="margin-top:8px;font-size:13px">{modele.nom}. Les charges sont recalculées au moment où tu démarres, selon ta forme.</p>}

          {type === 'boxe' && <BlocBoxe profil={profil} conseil={conseilBoxe} estAujourdhui={estAujourdhui} onLancerLibre={onLancerLibre} />}

          {faitsAujourdhui.length > 0 && type === 'deja-fait' && (
            <ul class="signaux">
              {faitsAujourdhui.map((s) => <li key={s.id}><span><b>{libelleGenre(s.kind)}</b>{s.durationMin ? ` — ${s.durationMin} min` : ''}</span></li>)}
            </ul>
          )}

          {estAujourdhui && prevu && (
            <div class="pile"><button class="btn btn-principal" onClick={() => onLancer(modeleId)}>Démarrer la séance</button></div>
          )}
          {estAujourdhui && preselection && !formulaire && (
            <div class="pile">
              {preselection.kind !== 'box' && (
                <button class="btn btn-principal" onClick={() => onLancerLibre(preselection.kind as GenreLibre)}>Démarrer : {libelleGenre(preselection.kind).toLowerCase()}</button>
              )}
              <button class="btn btn-contour" onClick={() => ouvrirForm(preselection.kind)}>Je l'ai déjà faite</button>
            </div>
          )}
        </div>
      )}

      {formulaire && (
        <div id="formulaire-fiche">
          <FormulaireExterne
            key={formulaire.kind}
            preselection={formulaire}
            onAjouter={async (s) => { await onAjouter(s); setFormulaire(null); onRetour(); }}
            onFerme={() => setFormulaire(null)}
          />
        </div>
      )}

      {estAujourdhui && (
        <div class="carte">
          <h3>Choisir une autre séance</h3>
          <p>Tu peux changer d'avis : le plan s'adapte à ce que tu fais.</p>
          <div class="pile">
            {MODELES.map((m) => <button key={m.id} class="btn btn-contour" onClick={() => onLancer(m.id)}>Démarrer : {m.nom}</button>)}
          </div>
          <p style="margin-top:14px;font-size:13px;font-weight:700;color:var(--plum)">Ou une séance sans exercices à saisir :</p>
          <div class="ligne-puces" style="margin-top:8px">
            {AUTRES.map((k) => <button key={k} class="puce" onClick={() => onLancerLibre(k as GenreLibre)}>{libelleGenre(k)}</button>)}
          </div>
          <div class="pile"><button class="btn btn-contour" onClick={() => ouvrirForm('box')}>Noter une séance déjà faite</button></div>
        </div>
      )}

      {type !== 'deja-fait' && (
        <div class="carte">
          <h3>{estAujourdhui ? "Pas aujourd'hui ?" : 'Pas dispo ce jour-là ?'}</h3>
          <p>Aucun souci, sans pénalité : le plan se recalcule et ta semaine reste possible.</p>
          <div class="pile">
            <button class="btn btn-contour" onClick={async () => { await onProfil({ ...profil, joursIndisponibles: basculerIndisponible(profil.joursIndisponibles, jour.jour, aujourdhui) }); onRetour(); }}>
              {indispo ? 'Finalement, je suis dispo' : estAujourdhui ? 'Je reporte' : 'Je ne suis pas dispo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
