import { useState } from 'preact/hooks';
import type { Donnees, Moment, Profil, Seance } from '../donnees/types';
import { planifier, type JourPlanifie, type TypePlanifie } from '../moteur/planification';
import { ajouterJours, lundiDeLaSemaine } from '../moteur/utilitaires';
import { FicheJour } from './FicheJour';
import type { GenreLibre } from './seance/libre';
import { jourLocal } from './jour';
import { MOMENTS, NOMS_JOURS, creneauDuJour, creneauxDuProfil, definirCreneau, libelleJour, libelleType } from './plan';
import { calculerPreparation } from './preparation';

interface Props {
  donnees: Donnees;
  onProfil: (profil: Profil) => Promise<void>;
  onLancer: (modeleId: string, enchainerBoxe?: boolean) => void;
  onLancerLibre: (kind: GenreLibre) => void;
  /** Enregistrer une séance faite ailleurs (depuis la fiche d'un jour). */
  onAjouter: (s: Seance) => Promise<void>;
  /** Ouvre « Mes créneaux » dès l'arrivée sur l'écran. */
  ouvrirCreneaux?: boolean;
}

const CLASSE: Record<TypePlanifie, string> = {
  force: 'force', combine: 'combine', boxe: 'boxe', marche: 'legere', mobilite: 'legere', recuperation: 'legere', repos: 'repos', 'deja-fait': 'legere',
};

export function EcranPlan({ donnees, onProfil, onLancer, onLancerLibre, onAjouter, ouvrirCreneaux = false }: Props) {
  const maintenant = new Date();
  const [ficheOuverte, setFicheOuverte] = useState<string | null>(null);
  const [creneauxOuverts, setCreneauxOuverts] = useState(ouvrirCreneaux || donnees.profil.creneaux === undefined);
  const aujourdhui = jourLocal(maintenant);
  const { profil } = donnees;
  const creneaux = creneauxDuProfil(profil);
  const dimancheCourant = ajouterJours(lundiDeLaSemaine(aujourdhui), 6);
  const chargee = profil.semaineChargeeJusquAu !== undefined && profil.semaineChargeeJusquAu >= aujourdhui;

  const plan = planifier({
    aujourdhui,
    seances: donnees.seances,
    creneaux,
    preparation: calculerPreparation(donnees, maintenant).verdict,
    semaineChargeeJusquAu: chargee ? profil.semaineChargeeJusquAu : undefined,
    joursIndisponibles: profil.joursIndisponibles,
  });

  const indispos = new Set(profil.joursIndisponibles ?? []);

  const enregistrer = (changement: Partial<Profil>) => onProfil({ ...profil, ...changement });

  const carte = (j: JourPlanifie) => (
    <button key={j.jour} class="jour-plan" onClick={() => { setFicheOuverte(j.jour); window.scrollTo(0, 0); }} aria-label={`${libelleJour(j.jour, aujourdhui)} : ${libelleType(j.type)}. Ouvrir la fiche.`}>
      <div class="tete">
        <span class="quand premiere-majuscule">{libelleJour(j.jour, aujourdhui)}</span>
        <span class="fleche" aria-hidden="true">›</span>
      </div>
      <div class="quoi">
        <span class={`badge ${CLASSE[j.type]}`}>{libelleType(j.type)}</span>
        {j.dureeMin && <span class="discret">{j.dureeMin} min{j.moment ? ` · ${MOMENTS.find((m) => m.moment === j.moment)?.nom.toLowerCase()}` : ''}</span>}
        {indispos.has(j.jour) && <span class="discret">· pas dispo</span>}
      </div>
    </button>
  );

  const fiche = ficheOuverte ? plan.jours.find((j) => j.jour === ficheOuverte) : undefined;
  if (fiche) {
    return (
      <FicheJour
        jour={fiche}
        aujourdhui={aujourdhui}
        donnees={donnees}
        onRetour={() => { setFicheOuverte(null); window.scrollTo(0, 0); }}
        onLancer={onLancer}
        onLancerLibre={onLancerLibre}
        onAjouter={onAjouter}
        onProfil={onProfil}
      />
    );
  }

  return (
    <div class="ecran fond-clair avec-nav">
      <h1>Plan</h1>
      <p style="color:var(--plum);margin-top:6px">Tes 14 prochains jours. C'est une projection : elle se recalcule à chaque ouverture, selon ta forme et ce que tu fais. Touche un jour pour voir la fiche : ce qui est prévu, et ce que tu peux en faire.</p>

      <div class="carte">
        <h3>Cette semaine</h3>
        <p>Une semaine très chargée ? Je limite les séances à 30 minutes, sans force lourde, jusqu'à dimanche.</p>
        <div class="puces" style="justify-content:flex-start;margin-top:12px">
          <button class={`puce ${chargee ? 'active' : ''}`} aria-pressed={chargee} onClick={() => enregistrer({ semaineChargeeJusquAu: chargee ? undefined : dimancheCourant })}>
            {chargee ? 'Semaine chargée : oui' : 'Semaine chargée'}
          </button>
        </div>
        {plan.avertissements.map((a) => <div key={a.semaine} class="avertissement" role="note">{a.raison}</div>)}
      </div>

      {plan.jours.map(carte)}

      <details class="facultatif carte" style="padding:16px" open={creneauxOuverts} onToggle={(e) => setCreneauxOuverts((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>Mes créneaux</summary>
        <p style="margin-top:10px">Choisis, jour par jour, le moment où tu peux t'entraîner. Le midi, je compte 30 minutes pour te laisser le temps de manger.</p>
        {NOMS_JOURS.map((nom, i) => {
          const actuel = creneauDuJour(creneaux, i + 1)?.moment ?? null;
          return (
            <div key={nom} class="rangee-creneau">
              <span class="jour">{nom}</span>
              <div class="ligne-puces">
                <button class={`puce ${actuel === null ? 'active' : ''}`} aria-pressed={actuel === null} onClick={() => enregistrer({ creneaux: definirCreneau(creneaux, i + 1, null) })}>Aucun</button>
                {MOMENTS.map((m) => (
                  <button key={m.moment} class={`puce ${actuel === m.moment ? 'active' : ''}`} aria-pressed={actuel === m.moment} onClick={() => enregistrer({ creneaux: definirCreneau(creneaux, i + 1, m.moment as Moment) })}>{m.nom}</button>
                ))}
              </div>
            </div>
          );
        })}
      </details>
    </div>
  );
}
