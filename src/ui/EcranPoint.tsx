import { useState } from 'preact/hooks';
import { CIBLE_INTENSITE, phraseArret, phraseProjection, phraseSecours, phrasesSemaine } from '../coach/point-semaine';
import { EXERCICES } from '../donnees/exercices';
import type { Donnees } from '../donnees/types';
import { evaluerHabitude } from '../moteur/habitude';
import { joursSansSeance, lundiDuPoint, optionsDeSecours, palierArret, pointDeLaSemaine, projeter } from '../moteur/point-semaine';
import { reperesDuLundi } from '../moteur/reperes';
import { calculerPreparation } from './preparation';
import { jourLocal } from './jour';
import type { GenreLibre, OptionsLibre } from './seance/libre';

interface Props {
  donnees: Donnees;
  onRetour: () => void;
  /** Lance la séance de force conseillée en version minimale (une série par exercice). */
  onLancerMinimale: () => void;
  onLancerLibre: (kind: GenreLibre, options?: OptionsLibre) => void;
}

const muscleDe = (cle: string) =>
  (EXERCICES[cle]?.muscle ?? '').split(',').map((m) => m.trim()).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1));

const ETAT_MUSCLE = { sous: 'sous le repère', dans: 'dans le repère', 'au-dessus': 'au-dessus du repère' } as const;

/** Le point sur la semaine, ce que fait une pause, et que faire quand on n'a pas le temps. */
export function EcranPoint({ donnees, onRetour, onLancerMinimale, onLancerLibre }: Props) {
  const aujourdhui = jourLocal(new Date());
  const [quelle, setQuelle] = useState<'courante' | 'precedente'>('courante');
  const objectif = donnees.profil.objectif;

  const lundi = lundiDuPoint(aujourdhui, quelle);
  const point = pointDeLaSemaine(donnees.seances, lundi, aujourdhui);
  const habitude = evaluerHabitude(donnees.seances, aujourdhui);
  const texte = phrasesSemaine(point, objectif, habitude.totalSemainesReussies);
  const reperes = reperesDuLundi(donnees.seances, lundi, muscleDe);

  const jours = joursSansSeance(donnees.seances, aujourdhui);
  const palier = jours === null ? null : palierArret(jours);
  const arret = palier ? phraseArret(palier, objectif) : null;
  const suite = jours !== null && jours > 0 ? phraseProjection(jours, projeter(jours)) : [];

  const allegee = calculerPreparation(donnees).verdict === 'allegee';
  const options = optionsDeSecours(objectif, { allegee });
  const libelleLundi = new Date(`${lundi}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  return (
    <div class="ecran fond-clair avec-nav">
      <button class="retour-lien" onClick={onRetour}>← Retour</button>
      <h1>Le point sur ta semaine</h1>
      <p style="color:var(--plum);margin-top:6px">Sans jugement : ce qui s'est passé, ce que ça donne, et ce que tu peux faire.</p>

      <div class="ligne-puces" style="margin-top:14px">
        <button class={`puce ${quelle === 'courante' ? 'active' : ''}`} aria-pressed={quelle === 'courante'} onClick={() => setQuelle('courante')}>Cette semaine</button>
        <button class={`puce ${quelle === 'precedente' ? 'active' : ''}`} aria-pressed={quelle === 'precedente'} onClick={() => setQuelle('precedente')}>Semaine dernière</button>
      </div>

      <div class="carte">
        <h3>{texte.titre}</h3>
        <span class="discret" style="font-size:13px">Semaine du {libelleLundi}</span>
        <ul class="signaux" style="margin-top:8px">
          {texte.lignes.map((l, i) => <li key={i}><span style="color:var(--ink)">{l}</span></li>)}
        </ul>
        {reperes.muscles.length > 0 && (
          <div style="margin-top:10px">
            <span class="etiquette">Tes séries par muscle (repère : 4 à 10)</span>
            <ul class="signaux" style="margin-top:6px">
              {reperes.muscles.map((m) => <li key={m.muscle}><span style="color:var(--ink)"><b>{m.muscle}</b> : {m.series} série{m.series > 1 ? 's' : ''}, {ETAT_MUSCLE[m.etat]}</span></li>)}
            </ul>
          </div>
        )}
      </div>

      <div class="carte">
        <h3>Ce que ça donne</h3>
        <ul class="signaux" style="margin-top:6px">
          {texte.effets.map((l, i) => <li key={i}><span style="color:var(--ink)">{l}</span></li>)}
        </ul>
      </div>

      {jours !== null && arret && (
        <div class="carte">
          <h3>Depuis ta dernière séance</h3>
          <div style="display:flex;align-items:baseline;gap:8px;margin-top:6px">
            <span style="font-family:var(--serif);font-weight:900;font-size:40px;line-height:1">{jours}</span>
            <span>jour{jours > 1 ? 's' : ''} · <b>{arret.titre}</b></span>
          </div>
          <ul class="signaux" style="margin-top:8px">
            {arret.lignes.map((l, i) => <li key={i}><span style="color:var(--ink)">{l}</span></li>)}
          </ul>
          {suite.length > 0 && (
            <div style="margin-top:10px">
              <span class="etiquette">Si tu continues encore quelques jours</span>
              <ul class="signaux" style="margin-top:6px">
                {suite.map((l, i) => <li key={i}><span style="color:var(--ink)">{l}</span></li>)}
              </ul>
            </div>
          )}
          <p style="margin-top:10px;font-size:12px" class="discret">{arret.source}</p>
        </div>
      )}

      <div class="carte">
        <h3>Si tu n'as pas le temps de la séance prévue</h3>
        <p>Faire moins vaut mieux que rien, à condition de savoir ce que ça fait vraiment. Voici des façons de faire moins, de la plus utile à la plus courte.</p>
        {allegee && <p style="margin-top:6px">Ta forme du jour est basse : je ne te propose pas de bloc intensif aujourd'hui.</p>}
        {options.map((o) => {
          const t = phraseSecours(o.id);
          return (
            <div class="groupe" key={o.id} style="border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px">
              <b>{t.titre}</b> <span class="discret">· environ {o.dureeMin} min</span>
              <p style="margin-top:6px;font-size:14px">{t.faire}</p>
              <p style="margin-top:6px;font-size:14px"><b>Ce que ça fait :</b> {t.effetReel}</p>
              <p style="margin-top:6px;font-size:14px"><b>Ce que ça ne fait pas :</b> {t.limite}</p>
              <div class="pile">
                {o.id === 'intensif-court' && (
                  <>
                    <p style="font-size:13px;margin-top:6px">{CIBLE_INTENSITE.effort} {CIBLE_INTENSITE.polar}</p>
                    <button class="btn btn-principal" onClick={() => onLancerLibre('box', { support: 'socle', format: 'intensif' })}>Démarrer le bloc intensif</button>
                  </>
                )}
                {o.id === 'force-minimale' && <button class="btn btn-principal" onClick={onLancerMinimale}>Démarrer la version minimale</button>}
                {o.id === 'cardio-court' && (
                  <div class="grille2">
                    <button class="btn btn-contour" onClick={() => onLancerLibre('box')}>Boxe</button>
                    <button class="btn btn-contour" onClick={() => onLancerLibre('walk')}>Marche rapide</button>
                  </div>
                )}
                {o.id === 'mini-dose' && (
                  <div class="grille2">
                    <button class="btn btn-contour" onClick={() => onLancerLibre('walk')}>Marche</button>
                    <button class="btn btn-contour" onClick={() => onLancerLibre('mob')}>Mobilité</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
