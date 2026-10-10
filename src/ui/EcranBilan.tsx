import type { Bilan } from '../coach/debrief';
import type { Seance } from '../donnees/types';
import { libelleGenre } from './activite';
import { jourDe } from '../moteur/utilitaires';

function Section({ titre, lignes }: { titre: string; lignes: string[] }) {
  if (lignes.length === 0) return null;
  return (
    <div class="carte">
      <h3>{titre}</h3>
      <ul class="signaux" style="margin-top:6px">
        {lignes.map((l, i) => (
          <li key={i}><span style="color:var(--ink)">{l}</span></li>
        ))}
      </ul>
    </div>
  );
}

export function EcranBilan({ seance, bilan, onFermer, onEnchainerBoxe }: { seance: Seance; bilan: Bilan; onFermer: () => void; onEnchainerBoxe?: () => void }) {
  const jour = new Date(`${jourDe(seance.date)}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div class="ecran fond-clair">
      <span class="legende premiere-majuscule" style="color:var(--mauve)">{jour} · {libelleGenre(seance.kind)}</span>
      <h1 style="margin-top:6px">Ton bilan</h1>
      <p style="color:var(--plum);margin-top:6px">Ce que tu peux retenir de cette séance, sans jugement.</p>

      {onEnchainerBoxe && (
        <div class="carte-hero" style="margin-top:16px">
          <div class="n" style="font-size:26px">Ta boxe t'attend</div>
          <div class="l" style="margin-bottom:14px">La partie force est faite. Tu peux enchaîner tout de suite, ou la faire plus tard.</div>
          <button class="btn btn-contour" style="color:var(--hot-pink)" onClick={onEnchainerBoxe}>Démarrer la boxe</button>
        </div>
      )}

      <Section titre="Ce que tu as fait" lignes={bilan.accompli} />
      <Section titre="Ce que tu as modifié" lignes={bilan.modifications} />
      <Section titre="Pour la prochaine fois" lignes={bilan.suite} />
      <Section titre="Ton ressenti" lignes={bilan.ressenti} />
      <Section titre="Tes données Polar" lignes={bilan.polar} />
      <Section titre="Où tu en es cette semaine" lignes={bilan.semaine} />

      <div class="carte-hero" style="margin-top:16px">
        <div class="l" style="margin-top:0;font-size:16px">{bilan.conseil}</div>
      </div>

      <div class="espace" />
      <button class="btn btn-principal" style="margin-top:20px" onClick={onFermer}>C'est noté</button>
    </div>
  );
}
