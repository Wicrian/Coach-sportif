import { describe, expect, it } from 'vitest';
import { EXERCICES, MODELES } from '../../donnees/exercices';
import type { InventaireHalteres, Profil, Seance, TypeSerie } from '../../donnees/types';
import { chargesDuProfil, preparerSeance } from './preparer';

/** Petit générateur pseudo-aléatoire reproductible (mulberry32). */
function alea(graine: number) {
  let a = graine;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INVENTAIRE: InventaireHalteres = { barre: 1.5978, disques: [{ poids: 1.1, quantite: 4 }, { poids: 2.3, quantite: 4 }] };
const PROFILS: Profil[] = [
  { gear: [], dumbbells: [], halteres: INVENTAIRE },
  { gear: [], dumbbells: [2.5, 5, 10] },
  { gear: [], dumbbells: [] },
];
const TYPES: TypeSerie[] = ['warmup', 'normal', 'normal', 'normal', 'drop', 'failure'];

describe('préparer une séance sur des historiques quelconques', () => {
  it('ne plante jamais et propose toujours une séance complète et réalisable', () => {
    const r = alea(42);
    const choisir = <T,>(l: T[]) => l[Math.floor(r() * l.length)]!;

    for (let essai = 0; essai < 3000; essai++) {
      const profil = choisir(PROFILS);
      const charges = chargesDuProfil(profil);
      const seances: Seance[] = [];
      for (let i = 0, n = Math.floor(r() * 6); i < n; i++) {
        const modele = choisir(MODELES);
        const exercices = modele.exercices
          .filter(() => r() > 0.25)
          .map((key) => {
            const e = EXERCICES[key]!;
            const dispo = e.poidsDuCorps ? [0] : [...charges.paire, ...charges.unique, 3, 12.5];
            return {
              key,
              sets: Array.from({ length: Math.floor(r() * 5) }, () => ({ type: choisir(TYPES), w: choisir(dispo.length ? dispo : [0]), reps: 1 + Math.floor(r() * 25) })),
            };
          });
        seances.push({ id: `s${essai}-${i}`, date: `2026-09-${String(1 + i).padStart(2, '0')}T18:00:00`, kind: 'strength', tplId: modele.id, exercises: exercices });
      }

      const modele = choisir(MODELES);
      let plan;
      try {
        plan = preparerSeance({ modele, seances, profil });
      } catch (erreur) {
        throw new Error(`Plantage à l'essai ${essai} : ${String(erreur)}\n${JSON.stringify({ modele: modele.id, profil, seances })}`);
      }

      expect(plan.exercices.map((e) => e.key).sort()).toEqual([...modele.exercices].sort());
      for (const e of plan.exercices) {
        expect(e.series).toHaveLength(modele.series);
        for (const s of e.series) {
          expect(Number.isFinite(s.w) && Number.isFinite(s.reps) && s.reps > 0).toBe(true);
        }
      }
    }
  });
});
