#!/usr/bin/env node
/**
 * Compose une voix à partir de deux fabrications de `generer-voix.mjs` : les coups viennent d'un dossier,
 * les mots et les nombres (« combo », « ronde », « 3, 2, 1 »…) d'un autre.
 *
 * Usage :  node outils/melanger-voix.mjs --coups donnees-perso/voix-A --mots donnees-perso/voix-B --sortie donnees-perso/voix-mixte [--nom "Tom"]
 */
import { mkdirSync, readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, tous) => (a.startsWith('--') ? [...acc, [a.slice(2), tous[i + 1]]] : acc), []),
);
for (const cle of ['coups', 'mots', 'sortie']) {
  if (!args[cle]) { console.error(`Il manque --${cle}`); process.exit(1); }
}
const lire = (dossier) => {
  const f = join(racine, dossier, 'sauvegarde-avec-voix.json');
  if (!existsSync(f)) { console.error(`Introuvable : ${f}`); process.exit(1); }
  return JSON.parse(readFileSync(f, 'utf8'));
};
const A = lire(args.coups), B = lire(args.mots);
const clipsA = A.profile.boxe.voixClips, clipsB = B.profile.boxe.voixClips;

const voixClips = {};
const origine = {};
for (const id of Object.keys(clipsA)) {
  const deCoups = id.startsWith('coup:');
  const source = deCoups ? clipsA : clipsB;
  voixClips[id] = source[id] ?? clipsA[id];
  origine[id] = deCoups ? args.coups : args.mots;
}

const sortie = join(racine, args.sortie);
mkdirSync(join(sortie, 'clips'), { recursive: true });
for (const id of Object.keys(voixClips)) {
  const base = `${id.replace(':', '-')}.m4a`;
  cpSync(join(racine, origine[id], 'clips', base), join(sortie, 'clips', base));
}
const sauvegarde = {
  ...A,
  exportedAt: new Date().toISOString(),
  profile: { gear: [], dumbbells: [], boxe: { voixClips, voixNom: args.nom ?? A.profile.boxe.voixNom } },
};
const texte = JSON.stringify(sauvegarde);
writeFileSync(join(sortie, 'sauvegarde-avec-voix.json'), texte);
const nbCoups = Object.keys(origine).filter((i) => i.startsWith('coup:')).length;
console.log(`${Object.keys(voixClips).length} clips : ${nbCoups} coups (${args.coups}), ${Object.keys(voixClips).length - nbCoups} mots et nombres (${args.mots}).`);
console.log(`À importer : ${join(sortie, 'sauvegarde-avec-voix.json')} (${(Buffer.byteLength(texte) / 1024).toFixed(0)} ko)`);
