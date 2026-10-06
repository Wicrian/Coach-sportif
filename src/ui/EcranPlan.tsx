import { useState } from 'preact/hooks';
import { MODELES } from '../donnees/exercices';
import type { Donnees, GenreSeance, Moment, Profil } from '../donnees/types';
import { planifier, type JourPlanifie, type TypePlanifie } from '../moteur/planification';
import { ajouterJours, lundiDeLaSemaine } from '../moteur/utilitaires';
import { jourLocal } from './jour';
import { MOMENTS, NOMS_JOURS, actionPourType, basculerIndisponible, creneauDuJour, creneauxDuProfil, definirCreneau, genrePourType, libelleJour, libelleType, modeleConseille } from './plan';
import { calculerPreparation } from './preparation';

interface Props {
  donnees: Donnees;
  onProfil: (profil: Profil) => Promise<void>;
  onLancer: (modeleId: string) => void;
  /** Noter une séance prévue au plan et déjà faite (ouvre l'Activité, pré-remplie). */
  onNoter: (prefill: { kind: GenreSeance; dureeMin: number }) => void;
  /** Choisir une autre séance que celle du plan. */
  onAutreSeance: () => void;
  /** Ouvre « Mes créneaux » dès l'arrivée sur l'écran. */
  ouvrirCreneaux?: boolean;
}

const CLASSE: Record<TypePlanifie, string> = {
  force: 'force', combine: 'combine', boxe: 'boxe', marche: 'legere', mobilite: 'legere', recuperation: 'legere', repos: 'repos', 'deja-fait': 'legere',
};

export function EcranPlan({ donnees, onProfil, onLancer, onNoter, onAutreSeance, ouvrirCreneaux = false }: Props) {
  const maintenant = new Date();
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

  const modele = modeleConseille(donnees.seances);
  const nomModele = MODELES.find((m) => m.id === modele)!.nom;
  const indispos = new Set(profil.joursIndisponibles ?? []);

  const enregistrer = (changement: Partial<Profil>) => onProfil({ ...profil, ...changement });

  const carte = (j: JourPlanifie) => {
    const estAujourdhui = j.jour === aujourdhui;
    const action = estAujourdhui ? actionPourType(j.type) : null;
    const prefill = genrePourType(j.type);
    return (
      <div key={j.jour} class={`jour-plan ${estAujourdhui ? 'aujourdhui' : ''}`}>
        <div class="tete">
          <span class="quand">{libelleJour(j.jour, aujourdhui)}</span>
          {j.type !== 'deja-fait' && (
            <button class="mini neutre" aria-pressed={indispos.has(j.jour)} onClick={() => enregistrer({ joursIndisponibles: basculerIndisponible(profil.joursIndisponibles, j.jour, aujourdhui) })}>
              {indispos.has(j.jour) ? 'Je suis dispo' : 'Pas dispo'}
            </button>
          )}
        </div>
        <div class="quoi">
          <span class={`badge ${CLASSE[j.type]}`}>{libelleType(j.type)}</span>
          {j.dureeMin && <span class="discret">{j.dureeMin} min{j.moment ? ` · ${MOMENTS.find((m) => m.moment === j.moment)?.nom.toLowerCase()}` : ''}</span>}
        </div>
        <p class="pourquoi">{j.raison}</p>
        {estAujourdhui && (
          <div class="actions">
            {action === 'demarrer' && <button class="mini plein" onClick={() => onLancer(modele)}>{j.type === 'combine' ? `Démarrer la partie force (${nomModele})` : `Démarrer : ${nomModele}`}</button>}
            {action === 'noter' && prefill && <button class="mini plein" onClick={() => onNoter(prefill)}>Je l'ai faite</button>}
            <button class="mini neutre" onClick={onAutreSeance}>{j.type === 'deja-fait' ? 'Faire une autre séance' : 'Choisir une autre séance'}</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div class="ecran fond-clair avec-nav">
      <h1>Plan</h1>
      <p style="color:var(--plum);margin-top:6px">Tes 14 prochains jours. C'est une projection : elle se recalcule à chaque ouverture, selon ta forme et ce que tu fais. Tu peux démarrer la séance du jour ici, ou en choisir une autre.</p>

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
