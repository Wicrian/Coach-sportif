import { useState } from 'preact/hooks';
import { MODELES } from '../donnees/exercices';
import type { Donnees, GenreSeance, Profil, Seance } from '../donnees/types';
import type { JourPlanifie } from '../moteur/planification';
import { jourDe } from '../moteur/utilitaires';
import { FormulaireExterne } from './EcranActivite';
import { libelleGenre } from './activite';
import { basculerIndisponible, descriptionType, genrePourType, libelleJour, libelleType, lignesPrevues, modeleConseille } from './plan';
import type { GenreLibre } from './seance/libre';
import { preparerSeance } from './seance/preparer';

interface Props {
  jour: JourPlanifie;
  aujourdhui: string;
  donnees: Donnees;
  onRetour: () => void;
  onLancer: (modeleId: string, enchainerBoxe?: boolean) => void;
  onLancerLibre: (kind: GenreLibre) => void;
  onAjouter: (s: Seance) => Promise<void>;
  onProfil: (profil: Profil) => Promise<void>;
}

const AUTRES: GenreSeance[] = ['box', 'walk', 'mob', 'cardio'];
const DUREES: Record<GenreSeance, number> = { box: 35, walk: 25, mob: 15, cardio: 20, strength: 40 };

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
            {estAujourdhui && (
              <div class="pile"><button class="btn btn-contour" onClick={() => onLancerLibre('box')}>Démarrer la boxe seule</button></div>
            )}
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
              <button class="btn btn-principal" onClick={() => onLancerLibre(preselection.kind as GenreLibre)}>Démarrer : {libelleGenre(preselection.kind).toLowerCase()}</button>
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
