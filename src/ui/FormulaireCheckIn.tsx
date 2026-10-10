import { useState } from 'preact/hooks';
import type { MesureRecuperation } from '../donnees/types';
import { lireNombre, type SaisieCheckin } from './checkin';
import { nf } from './format';

const ENERGIE = ['À plat', 'Bof', 'Correct', 'Bien', 'En forme'];
const COURBATURES = ['Aucune', 'Légères', 'Moyennes', 'Fortes', 'Très fortes'];
const MORAL = ['Bas', 'Moyen', 'Correct', 'Bon', 'Au top'];

function Choix({ titre, noms, valeur, onChoisir }: { titre: string; noms: string[]; valeur?: number; onChoisir: (v: number | undefined) => void }) {
  return (
    <div class="groupe">
      <span class="etiquette">{titre}</span>
      <div class="choix" role="group" aria-label={titre}>
        {noms.map((nom, i) => (
          <button key={nom} class={valeur === i + 1 ? 'active' : ''} aria-pressed={valeur === i + 1} onClick={() => onChoisir(valeur === i + 1 ? undefined : i + 1)}>{nom}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * Check-in du jour, en trois touches (énergie, courbatures, moral). Le reste (sommeil, poids, Polar) est replié.
 * Une fois fait, la carte se replie en une ligne pour laisser la place à la séance.
 */
export function CheckIn({ mesure, onSauver }: { mesure?: MesureRecuperation; onSauver: (s: SaisieCheckin) => Promise<void> }) {
  const dejaFait = mesure?.energy != null || mesure?.sore != null || mesure?.mood != null;
  const [ouvert, setOuvert] = useState(!dejaFait);
  const [fait, setFait] = useState(dejaFait);
  const [energy, setEnergy] = useState<number | undefined>(mesure?.energy ?? undefined);
  const [sore, setSore] = useState<number | undefined>(mesure?.sore ?? undefined);
  const [mood, setMood] = useState<number | undefined>(mesure?.mood ?? undefined);
  const [sleep, setSleep] = useState<number | undefined>(mesure?.sleep ?? undefined);
  const [poids, setPoids] = useState(mesure?.weight ? String(mesure.weight).replace('.', ',') : '');
  const [hrv, setHrv] = useState(mesure?.hrv ? String(mesure.hrv).replace('.', ',') : '');
  const [rhr, setRhr] = useState(mesure?.rhr ? String(mesure.rhr).replace('.', ',') : '');

  const sauver = async () => {
    await onSauver({ energy, sore, mood, sleep, weight: lireNombre(poids), hrv: lireNombre(hrv), rhr: lireNombre(rhr) });
    setFait(true);
    setOuvert(false);
  };

  return (
    <div class="carte">
      <div class="ligne">
        <div>
          <h3>{fait ? 'Check-in du jour' : 'Comment tu te sens ce matin ?'}</h3>
          {!ouvert && <p style="margin-top:2px">Fait : tu peux le modifier quand tu veux.</p>}
        </div>
        <button class="mini neutre" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>{ouvert ? 'Replier' : 'Modifier'}</button>
      </div>

      {ouvert && (
        <>
          <p>Trois touches suffisent, et tout est facultatif.</p>
          <Choix titre="Énergie" noms={ENERGIE} valeur={energy} onChoisir={setEnergy} />
          <Choix titre="Courbatures" noms={COURBATURES} valeur={sore} onChoisir={setSore} />
          <Choix titre="Moral" noms={MORAL} valeur={mood} onChoisir={setMood} />

          <details class="facultatif">
            <summary>Plus de détails : sommeil, poids, Polar</summary>
            <div class="groupe">
              <div class="ligne">
                <span class="etiquette">Sommeil de la nuit</span>
                <div class="pas">
                  <button aria-label="Une demi-heure de moins" onClick={() => setSleep(Math.max(3, (sleep ?? 7) - 0.5))}>−</button>
                  <div class="valeur" style="min-width:70px;font-size:28px">{sleep === undefined ? '—' : nf(sleep)}<small>heures</small></div>
                  <button aria-label="Une demi-heure de plus" onClick={() => setSleep(Math.min(12, (sleep ?? 7) + 0.5))}>+</button>
                </div>
              </div>
            </div>
            <div class="groupe">
              <label class="etiquette" for="poids">Poids (kg), si tu l'as pesé</label>
              <input id="poids" class="champ" inputMode="decimal" placeholder="81,2" value={poids} onInput={(e) => setPoids((e.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="deux-champs">
              <div><label for="hrv">HRV (ms)</label><input id="hrv" class="champ" inputMode="decimal" placeholder="60" value={hrv} onInput={(e) => setHrv((e.currentTarget as HTMLInputElement).value)} /></div>
              <div><label for="rhr">FC de repos (bpm)</label><input id="rhr" class="champ" inputMode="decimal" placeholder="55" value={rhr} onInput={(e) => setRhr((e.currentTarget as HTMLInputElement).value)} /></div>
            </div>
            <p style="margin-top:10px;font-size:13px">La HRV et la FC de repos viennent d'une mesure au réveil avec ta ceinture Polar : facultatif.</p>
          </details>

          <button class="btn btn-principal" style="margin-top:18px" onClick={sauver}>Enregistrer</button>
        </>
      )}
    </div>
  );
}
