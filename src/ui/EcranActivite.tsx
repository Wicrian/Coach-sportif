import { useState } from 'preact/hooks';
import { EXERCICES } from '../donnees/exercices';
import type { GenreSeance, Seance } from '../donnees/types';
import { jourDe } from '../moteur/utilitaires';
import { volumeSeance } from '../moteur/volume';
import { GENRES, creerSeanceExterne, libelleGenre } from './activite';
import { DetailsSeance } from './DetailsSeance';
import { appliquerDetails, type Details } from './details';
import { jourLocal } from './jour';

const RESSENTIS = ['Pénible', 'Bof', 'Correct', 'Bien', 'Super'];

interface Props {
  seances: Seance[];
  onAjouter: (s: Seance) => Promise<void>;
  onSupprimer: (id: string) => Promise<void>;
}

function FormulaireExterne({ onAjouter, onFerme }: { onAjouter: Props['onAjouter']; onFerme: () => void }) {
  const [kind, setKind] = useState<GenreSeance>('box');
  const [jour, setJour] = useState(jourLocal(new Date()));
  const [duree, setDuree] = useState(30);
  const [source, setSource] = useState('');
  const [feel, setFeel] = useState<number | undefined>(undefined);
  const [details, setDetails] = useState<Details>({});

  return (
    <div class="carte">
      <h3>Séance faite ailleurs</h3>
      <p>Boxa, Heavybox, une marche… elle compte dans ta semaine comme les autres.</p>

      <div class="groupe">
        <span class="etiquette">Type</span>
        <div class="ligne-puces">
          {GENRES.map((g) => <button key={g} class={`puce ${kind === g ? 'active' : ''}`} aria-pressed={kind === g} onClick={() => setKind(g)}>{libelleGenre(g)}</button>)}
        </div>
      </div>

      <div class="groupe">
        <label class="etiquette" for="jour-ext">Jour</label>
        <input id="jour-ext" type="date" class="champ" value={jour} max={jourLocal(new Date())} onInput={(e) => setJour((e.currentTarget as HTMLInputElement).value)} />
      </div>

      <div class="groupe">
        <div class="ligne">
          <span class="etiquette">Durée</span>
          <div class="pas">
            <button aria-label="5 minutes de moins" onClick={() => setDuree(Math.max(5, duree - 5))}>−</button>
            <div class="valeur" style="min-width:80px;font-size:30px">{duree}<small>minutes</small></div>
            <button aria-label="5 minutes de plus" onClick={() => setDuree(Math.min(240, duree + 5))}>+</button>
          </div>
        </div>
      </div>

      <div class="groupe">
        <label class="etiquette" for="source-ext">Application (facultatif)</label>
        <input id="source-ext" class="champ" placeholder="Boxa, Heavybox…" value={source} onInput={(e) => setSource((e.currentTarget as HTMLInputElement).value)} />
      </div>

      <div class="groupe">
        <span class="etiquette">Comment c'était ?</span>
        <div class="choix" role="group" aria-label="Ressenti">
          {RESSENTIS.map((nom, i) => <button key={nom} class={feel === i + 1 ? 'active' : ''} aria-pressed={feel === i + 1} onClick={() => setFeel(feel === i + 1 ? undefined : i + 1)}>{nom}</button>)}
        </div>
      </div>

      <DetailsSeance onChange={setDetails} force={kind === 'strength'} />

      <div class="grille2" style="margin-top:18px">
        <button class="btn btn-contour" onClick={onFerme}>Annuler</button>
        <button class="btn btn-principal" onClick={async () => { await onAjouter(appliquerDetails(creerSeanceExterne({ jour, kind, durationMin: duree, feel, source: source.trim() || undefined }, new Date()), details)); onFerme(); }}>Enregistrer</button>
      </div>
    </div>
  );
}

export function Activite({ seances, onAjouter, onSupprimer }: Props) {
  const [ajout, setAjout] = useState(false);
  const deux = (cle: string) => EXERCICES[cle]?.deuxHalteres ?? false;

  const groupes: { jour: string; seances: Seance[] }[] = [];
  for (const s of seances) {
    const j = jourDe(s.date);
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.jour === j) dernier.seances.push(s);
    else groupes.push({ jour: j, seances: [s] });
  }
  const titre = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div class="ecran fond-clair avec-nav">
      <h1>Activité</h1>
      <p style="color:var(--plum);margin-top:6px">Toutes tes séances, de la plus récente à la plus ancienne.</p>

      {ajout
        ? <FormulaireExterne onAjouter={onAjouter} onFerme={() => setAjout(false)} />
        : <div class="pile"><button class="btn btn-contour" onClick={() => setAjout(true)}>Ajouter une séance faite ailleurs</button></div>}

      {groupes.length === 0 && <div class="carte"><h3>Ta première séance t'attend</h3><p>Elle apparaîtra ici dès que tu auras terminé une séance, ou ajouté une séance faite ailleurs.</p></div>}

      {groupes.map((g) => (
        <section key={g.jour}>
          <div class="jour-titre">{titre(g.jour)}</div>
          {g.seances.map((s) => {
            const volume = Math.round(volumeSeance(s, deux));
            const details = [
              s.durationMin ? `${s.durationMin} min` : null,
              s.kind === 'strength' && volume > 0 ? `${volume.toLocaleString('fr-FR')} kg de volume` : null,
              s.feel ? `ressenti : ${RESSENTIS[s.feel - 1]!.toLowerCase()}` : null,
            ].filter(Boolean).join(' · ');
            return (
              <div class="seance" key={s.id}>
                <div class="corps">
                  <b>{libelleGenre(s.kind)}{s.source ? ` · ${s.source}` : ''}</b>
                  <span class="sous">{details || 'Séance enregistrée'}</span>
                </div>
                <button class="supprimer" aria-label={`Supprimer la séance ${libelleGenre(s.kind)} du ${titre(g.jour)}`} onClick={() => { if (confirm('Supprimer cette séance ? Cette action est définitive.')) void onSupprimer(s.id); }}>Supprimer</button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
