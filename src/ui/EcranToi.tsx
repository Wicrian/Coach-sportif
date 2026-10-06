import { useState } from 'preact/hooks';
import type { Donnees, GenreSeance, Playlist, Profil } from '../donnees/types';
import { chargesDisponibles } from '../moteur/materiel';
import { jourDe } from '../moteur/utilitaires';
import { libelleGenre } from './activite';
import { Avatar } from './BulleProfil';
import { reduirePhoto } from './avatar';
import type { SaisieCheckin } from './checkin';
import { lireNombre } from './checkin';
import { nf } from './format';
import { jourLocal } from './jour';
import { derniereMesure, dernierPoids, joursDepuis, validerInventaire, validerPlaylist, type LigneDisque } from './profil';

interface Props {
  donnees: Donnees;
  onProfil: (profil: Profil) => Promise<void>;
  onMesure: (saisie: SaisieCheckin) => Promise<void>;
  onAllerCreneaux: () => void;
}

const MATERIEL = ['Haltères', 'Élastiques', 'Swiss ball', 'Reflex bag mural', 'Sac de frappe sur socle', 'Tapis'];
const OBJECTIFS: { id: NonNullable<Profil['objectif']>; nom: string }[] = [
  { id: 'perte', nom: 'Perdre de la graisse' },
  { id: 'muscle', nom: 'Prendre du muscle' },
  { id: 'mixte', nom: 'Les deux' },
];
const GENRES_PLAYLIST: GenreSeance[] = ['strength', 'box', 'walk', 'mob', 'cardio'];
const ENERGIE = ['à plat', 'bof', 'correct', 'bien', 'en forme'];
const COURBATURES = ['aucune', 'légères', 'moyennes', 'fortes', 'très fortes'];
const MORAL = ['bas', 'moyen', 'correct', 'bon', 'au top'];
const RESSENTIS = ['pénible', 'bof', 'correct', 'bien', 'super'];

const date = (j: string) => new Date(`${j}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const texte = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));

function Message({ m }: { m: { texte: string; erreur: boolean } | null }) {
  return m ? <div class={`message ${m.erreur ? 'erreur' : ''}`} role="status">{m.texte}</div> : null;
}

function Halteres({ profil, onProfil }: { profil: Profil; onProfil: Props['onProfil'] }) {
  const inv = profil.halteres;
  const [barre, setBarre] = useState(texte(inv?.barre));
  const [lignes, setLignes] = useState<LigneDisque[]>(inv ? inv.disques.map((d) => ({ poids: texte(d.poids), quantite: String(d.quantite) })) : [{ poids: '', quantite: '' }]);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const essai = validerInventaire(barre, lignes);
  const paire = essai.inventaire ? chargesDisponibles(essai.inventaire, 'paire') : [];
  const unique = essai.inventaire ? chargesDisponibles(essai.inventaire, 'unique') : [];
  const modifier = (i: number, changement: Partial<LigneDisque>) => { setMessage(null); setLignes((avant) => avant.map((l, k) => (k === i ? { ...l, ...changement } : l))); };

  return (
    <div class="groupe">
      <span class="etiquette">Haltères ajustables</span>
      <label class="etiquette" for="barre" style="font-weight:600">Une barre seule pèse (kg)</label>
      <input id="barre" class="champ" inputMode="decimal" placeholder="1,6" value={barre} onInput={(e) => { setMessage(null); setBarre((e.currentTarget as HTMLInputElement).value); }} />

      <p class="etiquette" style="margin:14px 0 6px;font-weight:600">Tes disques</p>
      {lignes.map((l, i) => (
        <div key={i} class="ligne-disque">
          <input class="champ" inputMode="decimal" placeholder="Poids (kg)" aria-label="Poids d'un disque en kg" value={l.poids} onInput={(e) => modifier(i, { poids: (e.currentTarget as HTMLInputElement).value })} />
          <input class="champ" inputMode="numeric" placeholder="Combien" aria-label="Nombre de disques de ce poids" value={l.quantite} onInput={(e) => modifier(i, { quantite: (e.currentTarget as HTMLInputElement).value })} />
          <button class="mini neutre" aria-label="Retirer cette ligne de disques" onClick={() => setLignes((avant) => avant.filter((_, k) => k !== i))}>Retirer</button>
        </div>
      ))}
      <button class="mini neutre" style="margin-top:8px" onClick={() => setLignes((avant) => [...avant, { poids: '', quantite: '' }])}>Ajouter un type de disque</button>

      {essai.inventaire && (
        <p style="margin-top:12px">
          Avec ce matériel : {paire.map((c) => nf(c)).join(' · ')} kg par haltère (paire)
          {unique.length > paire.length ? `, jusqu'à ${nf(unique[unique.length - 1]!)} kg avec un seul haltère` : ''}.
        </p>
      )}
      <button class="btn btn-principal" style="margin-top:14px" onClick={async () => {
        const r = validerInventaire(barre, lignes);
        if (!r.inventaire) return setMessage({ texte: r.erreur!, erreur: true });
        await onProfil({ ...profil, halteres: r.inventaire });
        setMessage({ texte: 'Matériel enregistré. Tes prochaines séances utiliseront ces charges.', erreur: false });
      }}>Enregistrer mon matériel</button>
      <Message m={message} />
    </div>
  );
}

function Musique({ profil, onProfil }: { profil: Profil; onProfil: Props['onProfil'] }) {
  const playlists = profil.playlists ?? [];
  const [nom, setNom] = useState('');
  const [url, setUrl] = useState('');
  const [pour, setPour] = useState<GenreSeance[]>([]);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  return (
    <div class="carte">
      <h3>Ta musique</h3>
      <p>Tes playlists Apple Music. L'app propose celle qui correspond au type de séance.</p>
      {playlists.length === 0 && <p>Aucune playlist pour l'instant.</p>}
      {playlists.map((p, i) => (
        <div key={`${p.nom}-${i}`} class="seance">
          <div class="corps"><b>{p.nom}</b><span class="sous">{p.pour?.length ? p.pour.map(libelleGenre).join(', ') : 'Toutes les séances'}</span></div>
          <button class="supprimer" aria-label={`Retirer la playlist ${p.nom}`} onClick={() => onProfil({ ...profil, playlists: playlists.filter((_, k) => k !== i) })}>Retirer</button>
        </div>
      ))}

      <div class="groupe">
        <label class="etiquette" for="pl-nom">Ajouter une playlist</label>
        <input id="pl-nom" class="champ" placeholder="Nom (ex. Kickboxing)" value={nom} onInput={(e) => { setMessage(null); setNom((e.currentTarget as HTMLInputElement).value); }} />
        <input class="champ" style="margin-top:8px" aria-label="Lien de partage Apple Music" placeholder="Lien Apple Music (https://music.apple.com/…)" value={url} onInput={(e) => { setMessage(null); setUrl((e.currentTarget as HTMLInputElement).value); }} />
        <span class="etiquette" style="margin-top:12px;display:block;font-weight:600">Pour quelles séances ? (rien = toutes)</span>
        <div class="ligne-puces">
          {GENRES_PLAYLIST.map((g) => (
            <button key={g} class={`puce ${pour.includes(g) ? 'active' : ''}`} aria-pressed={pour.includes(g)} onClick={() => setPour(pour.includes(g) ? pour.filter((x) => x !== g) : [...pour, g])}>{libelleGenre(g)}</button>
          ))}
        </div>
        <button class="btn btn-contour" style="margin-top:14px" onClick={async () => {
          const erreur = validerPlaylist({ nom, url });
          if (erreur) return setMessage({ texte: erreur, erreur: true });
          const nouvelle: Playlist = pour.length ? { nom: nom.trim(), url: url.trim(), pour } : { nom: nom.trim(), url: url.trim() };
          await onProfil({ ...profil, playlists: [...playlists, nouvelle] });
          setNom(''); setUrl(''); setPour([]);
          setMessage({ texte: 'Playlist ajoutée.', erreur: false });
        }}>Ajouter la playlist</button>
        <Message m={message} />
      </div>
    </div>
  );
}

export function EcranToi({ donnees, onProfil, onMesure, onAllerCreneaux }: Props) {
  const { profil } = donnees;
  const aujourdhui = jourLocal(new Date());
  const [why, setWhy] = useState(profil.why ?? '');
  const [regime, setRegime] = useState(profil.diet ?? '');
  const [poids, setPoids] = useState('');
  const [msgObjectifs, setMsgObjectifs] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [msgPoids, setMsgPoids] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [msgPhoto, setMsgPhoto] = useState<{ texte: string; erreur: boolean } | null>(null);

  const dp = dernierPoids(donnees.recuperation);
  const anciennete = dp ? joursDepuis(dp.date, aujourdhui) : null;
  const derniereSeance = donnees.seances.find((s) => s.feel);
  const energie = derniereMesure(donnees.recuperation, 'energy');
  const moral = derniereMesure(donnees.recuperation, 'mood');
  const courbatures = derniereMesure(donnees.recuperation, 'sore');
  const materiel = profil.gear ?? [];

  return (
    <div class="ecran fond-clair avec-nav">
      <div class="en-tete-toi">
        <Avatar src={profil.avatar} taille={84} etiquette="Ma photo de profil" />
        <div>
          <h1>Ton profil</h1>
        </div>
      </div>
      <p style="color:var(--plum);margin-top:10px">Ce que l'app retient de toi, avec sa date. Tu peux tout corriger : ce sont tes informations.</p>
      <div class="ligne-puces" style="margin-top:12px">
        <label class="mini plein" style="cursor:pointer">
          {profil.avatar ? 'Changer ma photo' : 'Ajouter ma photo'}
          <input type="file" accept="image/*" style="display:none" onChange={async (e) => {
            const input = e.currentTarget as HTMLInputElement;
            const fichier = input.files?.[0];
            if (!fichier) return;
            try {
              await onProfil({ ...profil, avatar: await reduirePhoto(fichier) });
              setMsgPhoto({ texte: 'Photo enregistrée sur ton téléphone.', erreur: false });
            } catch (err) {
              setMsgPhoto({ texte: err instanceof Error ? err.message : "La photo n'a pas pu être enregistrée.", erreur: true });
            }
            input.value = '';
          }} />
        </label>
        {profil.avatar && <button class="mini neutre" onClick={() => onProfil({ ...profil, avatar: undefined })}>Retirer la photo</button>}
      </div>
      <Message m={msgPhoto} />

      <div class="carte">
        <h3>Ton matériel</h3>
        <div class="ligne-puces" style="margin-top:12px">
          {MATERIEL.map((m) => {
            const actif = materiel.includes(m);
            return <button key={m} class={`puce ${actif ? 'active' : ''}`} aria-pressed={actif} onClick={() => onProfil({ ...profil, gear: actif ? materiel.filter((x) => x !== m) : [...materiel, m] })}>{m}</button>;
          })}
        </div>
        <Halteres profil={profil} onProfil={onProfil} />
      </div>

      <div class="carte">
        <h3>Ton corps</h3>
        {dp ? (
          <p>
            Dernier poids : <b>{nf(dp.kg)} kg</b>, le {date(dp.date)}.
            {anciennete !== null && anciennete >= 14 ? ` Ça fait ${anciennete} jours : tu peux le mettre à jour quand tu veux.` : ''}
          </p>
        ) : (
          <p>Je n'ai pas encore ton poids. Tu peux me le donner quand tu veux, ou jamais : c'est facultatif.</p>
        )}
        <div class="groupe">
          <label class="etiquette" for="poids-toi">Nouveau poids (kg)</label>
          <input id="poids-toi" class="champ" inputMode="decimal" placeholder="81,2" value={poids} onInput={(e) => { setMsgPoids(null); setPoids((e.currentTarget as HTMLInputElement).value); }} />
          <button class="btn btn-contour" style="margin-top:12px" onClick={async () => {
            const kg = lireNombre(poids);
            if (kg === undefined) return setMsgPoids({ texte: 'Indique ton poids en kg, par exemple 81,2.', erreur: true });
            await onMesure({ weight: kg });
            setPoids('');
            setMsgPoids({ texte: 'Poids enregistré pour aujourd\'hui.', erreur: false });
          }}>Enregistrer mon poids</button>
          <Message m={msgPoids} />
        </div>
      </div>

      <div class="carte">
        <h3>Ton état d'esprit</h3>
        <ul class="signaux">
          <li><span><b>Dernière séance</b> — {derniereSeance ? `ressenti « ${RESSENTIS[derniereSeance.feel! - 1]} », le ${date(jourDe(derniereSeance.date))}` : 'pas encore de ressenti noté'}</span></li>
          <li><span><b>Énergie</b> — {energie ? `${ENERGIE[energie.valeur - 1]}, le ${date(energie.date)}` : 'pas encore notée'}</span></li>
          <li><span><b>Moral</b> — {moral ? `${MORAL[moral.valeur - 1]}, le ${date(moral.date)}` : 'pas encore noté'}</span></li>
          <li><span><b>Courbatures</b> — {courbatures ? `${COURBATURES[courbatures.valeur - 1]}, le ${date(courbatures.date)}` : 'pas encore notées'}</span></li>
        </ul>
        <p style="margin-top:8px;font-size:13px">Ces informations viennent de ton check-in et de tes fins de séance.</p>
      </div>

      <div class="carte">
        <h3>Tes objectifs</h3>
        <div class="groupe">
          <span class="etiquette">Ce que tu cherches</span>
          <div class="ligne-puces">
            {OBJECTIFS.map((o) => (
              <button key={o.id} class={`puce ${profil.objectif === o.id ? 'active' : ''}`} aria-pressed={profil.objectif === o.id} onClick={() => onProfil({ ...profil, objectif: profil.objectif === o.id ? undefined : o.id })}>{o.nom}</button>
            ))}
          </div>
        </div>
        <div class="groupe">
          <label class="etiquette" for="pourquoi">Ton pourquoi</label>
          <textarea id="pourquoi" class="champ" rows={3} placeholder="Ce qui te donne envie de bouger" value={why} onInput={(e) => { setMsgObjectifs(null); setWhy((e.currentTarget as HTMLTextAreaElement).value); }} />
        </div>
        <div class="groupe">
          <label class="etiquette" for="regime">Ton régime</label>
          <input id="regime" class="champ" placeholder="Végétarien" value={regime} onInput={(e) => { setMsgObjectifs(null); setRegime((e.currentTarget as HTMLInputElement).value); }} />
        </div>
        <button class="btn btn-contour" style="margin-top:14px" onClick={async () => {
          await onProfil({ ...profil, why: why.trim() || undefined, diet: regime.trim() || undefined });
          setMsgObjectifs({ texte: 'Enregistré.', erreur: false });
        }}>Enregistrer</button>
        <Message m={msgObjectifs} />
      </div>

      <Musique profil={profil} onProfil={onProfil} />

      <div class="carte">
        <h3>Tes créneaux</h3>
        <p>Les jours et les moments où tu peux t'entraîner, pour que le plan colle à ta semaine.</p>
        <div class="pile"><button class="btn btn-contour" onClick={onAllerCreneaux}>Régler mes créneaux</button></div>
      </div>
    </div>
  );
}
