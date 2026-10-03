import { useEffect, useState } from 'preact/hooks';
import { lireDetails, type Details, type SaisieDetails } from './details';

const NIVEAUX_RESERVE: { id: NonNullable<SaisieDetails['reserve']>; nom: string }[] = [
  { id: 'aucune', nom: 'Aucune' },
  { id: '1-2', nom: '1 ou 2' },
  { id: '3-plus', nom: '3 ou plus' },
];

const VIDE: SaisieDetails = { zoneGene: '', fcMoy: '', fcMax: '', zones: ['', '', '', '', ''], note: '' };

interface Props {
  /** Appelé à chaque modification, avec les détails déjà convertis. */
  onChange: (details: Details) => void;
  /** Masque les questions qui n'ont de sens que pour une séance de force. */
  force?: boolean;
}

/** Bloc facultatif de fin de séance : effort, répétitions en réserve, gêne, données Polar, note. */
export function DetailsSeance({ onChange, force = true }: Props) {
  const [s, setS] = useState<SaisieDetails>(VIDE);
  const maj = (changement: Partial<SaisieDetails>) => setS((avant) => ({ ...avant, ...changement }));
  useEffect(() => { onChange(lireDetails(s)); }, [s]);
  const champ = (id: string, etiquette: string, valeur: string, placeholder: string, surChangement: (v: string) => void) => (
    <div>
      <label for={id}>{etiquette}</label>
      <input id={id} class="champ" inputMode="decimal" placeholder={placeholder} value={valeur} onInput={(e) => surChangement((e.currentTarget as HTMLInputElement).value)} />
    </div>
  );

  return (
    <details class="facultatif">
      <summary>Ajouter des détails (facultatif)</summary>

      <div class="groupe">
        <span class="etiquette">Effort ressenti, de 1 (très facile) à 10 (maximal)</span>
        <div class="effort" role="group" aria-label="Effort ressenti">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button key={n} class={s.effort === n ? 'active' : ''} aria-pressed={s.effort === n} onClick={() => maj({ effort: s.effort === n ? undefined : n })}>{n}</button>
          ))}
        </div>
      </div>

      {force && (
        <div class="groupe">
          <span class="etiquette">À la fin de tes séries, il te restait combien de répétitions ?</span>
          <div class="ligne-puces">
            {NIVEAUX_RESERVE.map((n) => (
              <button key={n.id} class={`puce ${s.reserve === n.id ? 'active' : ''}`} aria-pressed={s.reserve === n.id} onClick={() => maj({ reserve: s.reserve === n.id ? undefined : n.id })}>{n.nom}</button>
            ))}
          </div>
        </div>
      )}

      <div class="groupe">
        <span class="etiquette">Une gêne ou une douleur ?</span>
        <div class="ligne-puces">
          <button class={`puce ${s.gene === undefined ? 'active' : ''}`} aria-pressed={s.gene === undefined} onClick={() => maj({ gene: undefined })}>Non</button>
          <button class={`puce ${s.gene === 'legere' ? 'active' : ''}`} aria-pressed={s.gene === 'legere'} onClick={() => maj({ gene: 'legere' })}>Légère</button>
          <button class={`puce ${s.gene === 'a-surveiller' ? 'active' : ''}`} aria-pressed={s.gene === 'a-surveiller'} onClick={() => maj({ gene: 'a-surveiller' })}>À surveiller</button>
        </div>
        {s.gene && (
          <>
            <input class="champ" style="margin-top:10px" placeholder="Où ? (épaule, genou…)" aria-label="Zone de la gêne" value={s.zoneGene} onInput={(e) => maj({ zoneGene: (e.currentTarget as HTMLInputElement).value })} />
            {s.gene === 'a-surveiller' && <p style="margin-top:8px;font-size:13px;color:var(--plum)">Si cette douleur revient ou dure, parles-en à un professionnel de santé. L'application ne peut pas poser de diagnostic.</p>}
          </>
        )}
      </div>

      <div class="groupe">
        <span class="etiquette">Données Polar</span>
        <div class="deux-champs" style="margin-top:0">
          {champ('fc-moy', 'FC moyenne (bpm)', s.fcMoy, '128', (v) => maj({ fcMoy: v }))}
          {champ('fc-max', 'FC max (bpm)', s.fcMax, '171', (v) => maj({ fcMax: v }))}
        </div>
        <p style="margin:12px 0 6px;font-size:13px;font-weight:700;color:var(--plum)">Minutes dans chaque zone</p>
        <div class="zones">
          {s.zones.map((z, i) => (
            <div key={i}>
              <label for={`zone-${i + 1}`}>Zone {i + 1}</label>
              <input id={`zone-${i + 1}`} class="champ" inputMode="numeric" placeholder="0" value={z} onInput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; setS((avant) => ({ ...avant, zones: avant.zones.map((x, k) => (k === i ? v : x)) })); }} />
            </div>
          ))}
        </div>
      </div>

      <div class="groupe">
        <label class="etiquette" for="note-seance">Une note pour toi</label>
        <textarea id="note-seance" class="champ" rows={3} placeholder="Ce que tu veux retenir de cette séance" value={s.note} onInput={(e) => maj({ note: (e.currentTarget as HTMLTextAreaElement).value })} />
      </div>
    </details>
  );
}
