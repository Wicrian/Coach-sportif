import { useState } from 'preact/hooks';
import { COUPS, FAMILLES, libelleCoup, membreDuCoup, type Garde, type ProgrammeBoxe, type RondeBoxe } from '../donnees/boxe';
import { copierProgramme, nouveauProgramme, rondeVide } from './boxe';

interface Props {
  programmes: ProgrammeBoxe[];
  garde: Garde;
  /** Appelé à chaque modification : tout est enregistré tout de suite. */
  onChanger: (programmes: ProgrammeBoxe[]) => void;
  onFermer?: () => void;
}

interface Cible { ronde: number; combo: number }

const texteCombo = (combo: string[]) => (combo.length ? combo.map(libelleCoup).join(' · ') : 'Vide');

/** Composer ses séries : des rondes, des combos, des coups. Tout reste sur le téléphone. */
export function EditeurBoxe({ programmes, garde, onChanger, onFermer }: Props) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [cible, setCible] = useState<Cible | null>(null);

  const remplacer = (id: string, f: (p: ProgrammeBoxe) => ProgrammeBoxe) =>
    onChanger(programmes.map((p) => (p.id === id ? f(p) : p)));

  const programme = programmes.find((p) => p.id === ouvert);

  if (!programme) {
    return (
      <div>
        <p style="margin-top:6px">Une série, c'est une suite de rondes. Chaque ronde a des combos, répétés chacun pendant leur part de la ronde.</p>
        {programmes.map((p) => (
          <div class="groupe" key={p.id} style="border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px">
            <b>{p.nom}</b>
            <p style="margin:2px 0 8px;font-size:13px">{p.rondes.length} ronde{p.rondes.length > 1 ? 's' : ''}</p>
            <div class="grille2">
              <button class="mini neutre" style="padding:12px" onClick={() => { setCible(null); setOuvert(p.id); }}>Modifier</button>
              <button class="mini neutre" style="padding:12px" onClick={() => onChanger([...programmes, copierProgramme(p, new Date())])}>Dupliquer</button>
            </div>
            {programmes.length > 1 && (
              <button class="mini neutre" style="margin-top:8px" onClick={() => { if (confirm(`Supprimer « ${p.nom} » ?`)) onChanger(programmes.filter((x) => x.id !== p.id)); }}>Supprimer</button>
            )}
          </div>
        ))}
        <div class="pile">
          <button class="btn btn-contour" onClick={() => {
            const n = nouveauProgramme('Ma nouvelle série', new Date());
            onChanger([...programmes, n]);
            setOuvert(n.id);
          }}>Nouvelle série</button>
          {onFermer && <button class="btn btn-contour" onClick={onFermer}>Fermer</button>}
        </div>
      </div>
    );
  }

  const modifRonde = (i: number, f: (r: RondeBoxe) => RondeBoxe) =>
    remplacer(programme.id, (p) => ({ ...p, rondes: p.rondes.map((r, k) => (k === i ? f(r) : r)) }));
  const modifCombo = (c: Cible, f: (combo: string[]) => string[]) =>
    modifRonde(c.ronde, (r) => ({ ...r, combos: r.combos.map((x, k) => (k === c.combo ? f(x) : x)) }));

  const combo = cible ? programme.rondes[cible.ronde]?.combos[cible.combo] : undefined;

  return (
    <div>
      <button class="retour-lien" onClick={() => { setCible(null); setOuvert(null); }}>← Mes séries</button>
      <div class="groupe">
        <label class="etiquette" for="nom-serie">Nom de la série</label>
        <input id="nom-serie" class="champ" value={programme.nom} onInput={(e) => {
          const nom = (e.currentTarget as HTMLInputElement).value;
          remplacer(programme.id, (p) => ({ ...p, nom }));
        }} />
      </div>

      {programme.rondes.map((ronde, i) => (
        <div class="groupe" key={i} style="border:1px solid var(--line);border-radius:var(--r-md);padding:12px 14px">
          <b>Ronde {i + 1}</b>
          {ronde.combos.map((c, j) => {
            const actif = cible?.ronde === i && cible.combo === j;
            return (
              <div key={j} style="margin-top:10px">
                <span class="etiquette">Combo {j + 1}</span>
                <button class={`puce ${actif ? 'active' : ''}`} style="display:block;text-align:left;width:100%;margin-top:4px;border-radius:var(--r-md)" aria-pressed={actif} onClick={() => setCible(actif ? null : { ronde: i, combo: j })}>
                  {texteCombo(c)}
                </button>
              </div>
            );
          })}
          {ronde.enchainer && ronde.combos.filter((c) => c.length).length > 1 && (
            <p style="margin-top:10px;font-size:13px"><b>Combo {ronde.combos.length + 1}</b> : tous les combos ci-dessus, bout à bout.</p>
          )}
          <div class="ligne-puces" style="margin-top:10px">
            <button class="mini neutre" onClick={() => modifRonde(i, (r) => ({ ...r, combos: [...r.combos, []] }))}>+ un combo</button>
            {ronde.combos.length > 1 && (
              <button class="mini neutre" onClick={() => { setCible(null); modifRonde(i, (r) => ({ ...r, combos: r.combos.slice(0, -1) })); }}>− dernier combo</button>
            )}
            <button class={`mini ${ronde.enchainer ? 'plein' : 'neutre'}`} aria-pressed={ronde.enchainer} onClick={() => modifRonde(i, (r) => ({ ...r, enchainer: !r.enchainer }))}>
              {ronde.enchainer ? 'Enchaîné : oui' : 'Enchaîné : non'}
            </button>
          </div>
          <div class="ligne-puces" style="margin-top:8px">
            <button class="mini neutre" onClick={() => remplacer(programme.id, (p) => ({ ...p, rondes: [...p.rondes.slice(0, i + 1), { enchainer: ronde.enchainer, combos: ronde.combos.map((c) => [...c]) }, ...p.rondes.slice(i + 1)] }))}>Copier la ronde</button>
            {programme.rondes.length > 1 && (
              <button class="mini neutre" onClick={() => { setCible(null); remplacer(programme.id, (p) => ({ ...p, rondes: p.rondes.filter((_, k) => k !== i) })); }}>Supprimer la ronde</button>
            )}
          </div>
        {cible && combo && cible.ronde === i && (
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
            <h3 style="font-size:16px">Ronde {cible.ronde + 1} · combo {cible.combo + 1}</h3>
            <div class="ligne-puces" style="margin:8px 0;min-height:36px">
              {combo.length === 0 && <span class="discret" style="font-size:13px">Touche des coups pour construire le combo.</span>}
              {combo.map((id, k) => (
                <button key={k} class="puce active" aria-label={`Retirer ${libelleCoup(id)}`} onClick={() => modifCombo(cible, (c) => c.filter((_, n) => n !== k))}>{k + 1}. {libelleCoup(id)} ✕</button>
              ))}
            </div>
            {FAMILLES.map((f) => (
              <div key={f.id} style="margin-top:8px">
                <span class="etiquette">{f.nom}</span>
                <div class="ligne-puces" style="margin-top:4px">
                  {COUPS.filter((c) => c.famille === f.id).map((c) => {
                    const membre = membreDuCoup(c, garde);
                    return (
                      <button key={c.id} class="puce" onClick={() => modifCombo(cible, (x) => [...x, c.id])}>
                        {c.libelle}{membre ? <small style="opacity:.7"> ({membre})</small> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div class="grille2" style="margin-top:12px">
              <button class="mini neutre" style="padding:12px" onClick={() => modifCombo(cible, () => [])}>Vider</button>
              <button class="mini plein" style="padding:12px" onClick={() => setCible(null)}>OK</button>
            </div>
          </div>
        )}
        </div>
      ))}

      <div class="pile">
        <button class="btn btn-contour" onClick={() => remplacer(programme.id, (p) => ({ ...p, rondes: [...p.rondes, rondeVide()] }))}>Ajouter une ronde</button>
      </div>

    </div>
  );
}
