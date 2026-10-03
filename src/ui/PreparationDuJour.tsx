import type { PreparationDuJour as Preparation, Verdict } from '../moteur/readiness';

const ETATS: Record<Verdict, string> = { normale: 'Séance normale', vigilance: 'Je reste à ton écoute', allegee: 'Séance allégée conseillée' };

export function PreparationDuJour({ preparation, aDesHrv }: { preparation: Preparation; aDesHrv: boolean }) {
  // Sans aucune mesure de HRV, la ligne « pas assez de mesures » n'apporterait rien.
  const signaux = preparation.signaux.filter((s) => s.etat !== 'inconnu' || s.id !== 'physio' || aDesHrv);
  return (
    <div class="carte">
      <h3>Ta préparation du jour</h3>
      {preparation.aDesDonnees ? (
        <>
          <div style="margin-top:10px"><span class={`etat ${preparation.verdict}`}>{ETATS[preparation.verdict]}</span></div>
          <p>{preparation.explication}</p>
        </>
      ) : (
        <p>Fais ton check-in ci-dessous : je pourrai alors t'écouter et ajuster ta séance.</p>
      )}
      <ul class="signaux">
        {signaux.map((s) => (
          <li key={s.id}>
            <span class={`point ${s.etat}`} aria-hidden="true" />
            <span><b>{s.nom}</b> — {s.raison}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
