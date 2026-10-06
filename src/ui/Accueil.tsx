import { useState } from 'preact/hooks';
import { MODELES } from '../donnees/exercices';
import type { Donnees } from '../donnees/types';
import { curseurAudace } from '../moteur/audace';
import { evaluerHabitude } from '../moteur/habitude';
import { nf } from './format';
import { jourLocal } from './jour';
import { chargesDuProfil } from './seance/preparer';
import { Avatar } from './BulleProfil';
import { CheckIn } from './FormulaireCheckIn';
import type { SaisieCheckin } from './checkin';
import { calculerPreparation } from './preparation';
import { PreparationDuJour } from './PreparationDuJour';

interface Props {
  donnees: Donnees;
  seanceEnCours: boolean;
  onLancer: (modeleId: string) => void;
  onReprendre: () => void;
  onAbandonnerEnCours: () => void;
  onCheckin: (saisie: SaisieCheckin) => Promise<void>;
  onEnergie: (choix: 'safe' | 'push' | null) => void;
  onImporter: (texte: string) => Promise<string>;
  onExporter: () => void;
  onAllerToi: () => void;
}

const ENERGIES: { choix: 'safe' | 'push' | null; nom: string }[] = [
  { choix: 'safe', nom: 'Rester prudent' },
  { choix: null, nom: "Comme d'habitude" },
  { choix: 'push', nom: 'Envie de pousser' },
];

export function Accueil(p: Props) {
  const { donnees } = p;
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const aujourdhui = jourLocal(new Date());
  const habitude = evaluerHabitude(donnees.seances, aujourdhui);
  const preparation = calculerPreparation(donnees);
  const mesureDuJour = donnees.recuperation.find((r) => r.date === aujourdhui);
  const ressentis = donnees.seances.filter((s) => s.feel).slice(0, 4).map((s) => s.feel!).reverse();
  const audace = curseurAudace({
    semainesReussiesConsecutives: habitude.serieActuelle,
    semainesActives: habitude.semainesActives,
    ressentisRecents: ressentis,
    preparation: preparation.verdict,
    contestation: donnees.profil.audOverride === 'push' ? 'pousser' : donnees.profil.audOverride === 'safe' ? 'prudent' : null,
  });
  const charges = chargesDuProfil(donnees.profil);
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const choisirFichier = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!fichier) return;
    try {
      setMessage({ texte: await p.onImporter(await fichier.text()), erreur: false });
    } catch (err) {
      setMessage({ texte: err instanceof Error ? err.message : "Cette sauvegarde n'a pas pu être lue.", erreur: true });
    }
    input.value = '';
  };

  return (
    <div class="ecran fond-clair avec-nav">
      <div class="en-tete">
        <div>
          <span class="legende" style="color:var(--mauve)">{date}</span>
          <h1 style="margin-top:6px">Bouge de là !</h1>
        </div>
        <Avatar src={donnees.profil.avatar} taille={52} onClick={p.onAllerToi} etiquette="Ouvrir mon profil" />
      </div>

      <div class="carte-hero">
        <div class="n">{habitude.cetteSemaine}</div>
        <div class="l">séance{habitude.cetteSemaine > 1 ? 's' : ''} cette semaine</div>
        <div style="font-size:14px;margin-top:10px;opacity:.95">{habitude.raison}</div>
      </div>

      {p.seanceEnCours && (
        <div class="carte">
          <h3>Une séance est en cours</h3>
          <p>Tu peux la reprendre là où tu t'étais arrêté.</p>
          <div class="pile">
            <button class="btn btn-principal" onClick={p.onReprendre}>Reprendre la séance</button>
            <button class="btn btn-contour" onClick={() => { if (confirm('Abandonner la séance en cours sans l\'enregistrer ?')) p.onAbandonnerEnCours(); }}>Abandonner</button>
          </div>
        </div>
      )}

      <div class="carte" id="commencer">
        <h3>Commencer une séance</h3>
        <div class="pile">
          {MODELES.map((m, i) => (
            <button key={m.id} class={`btn ${i === 0 && !p.seanceEnCours ? 'btn-principal' : 'btn-contour'}`} onClick={() => p.onLancer(m.id)}>
              {m.nom}
            </button>
          ))}
        </div>
      </div>

      <PreparationDuJour preparation={preparation} aDesHrv={donnees.recuperation.some((r) => r.hrv != null)} />
      <CheckIn key={aujourdhui} mesure={mesureDuJour} onSauver={p.onCheckin} />

      <div class="carte">
        <h3>Ton élan en ce moment</h3>
        <div class="curseur" aria-hidden="true"><div style={`width:${Math.round(audace.valeur * 100)}%`} /></div>
        <div class="ligne" style="margin-top:6px;font-size:12px;color:var(--plum);font-weight:600"><span>Prudent</span><span>Audacieux</span></div>
        <p>{audace.raison}</p>
        <div class="puces" style="justify-content:flex-start;margin-top:12px">
          {ENERGIES.map((e) => {
            const actif = (donnees.profil.audOverride ?? null) === e.choix;
            return <button key={e.nom} class={`puce ${actif ? 'active' : ''}`} aria-pressed={actif} onClick={() => p.onEnergie(e.choix)}>{e.nom}</button>;
          })}
        </div>
      </div>

      <div class="carte">
        <h3>Ton matériel</h3>
        {donnees.profil.halteres ? (
          <p>
            Haltères ajustables : {charges.paire.map((c) => nf(c)).join(' · ')} kg par haltère (paire).
            {charges.unique.length > charges.paire.length ? ` Jusqu'à ${nf(charges.unique[charges.unique.length - 1]!)} kg avec un seul haltère.` : ''}
          </p>
        ) : (
          <p>L'application ne connaît pas encore tes haltères : importe ta sauvegarde ci-dessous.</p>
        )}
      </div>

      <div class="carte">
        <h3>Sauvegarde</h3>
        <p>Tes données restent sur cet appareil. Exporte-les de temps en temps.</p>
        <div class="pile">
          <label class="champ-fichier">
            Importer une sauvegarde (fichier .json)
            <input type="file" accept="application/json,.json" onChange={choisirFichier} style="display:block;margin-top:8px;max-width:100%" />
          </label>
          <button class="btn btn-contour" onClick={p.onExporter}>Exporter ma sauvegarde</button>
        </div>
        {message && <div class={`message ${message.erreur ? 'erreur' : ''}`} role="status">{message.texte}</div>}
      </div>
    </div>
  );
}
