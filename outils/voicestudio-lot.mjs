#!/usr/bin/env node
/**
 * Fabrique un lot de fichiers audio avec VoiceStudio (application libre de génération de voix) : un fichier par
 * ligne d'une liste. L'application doit être ouverte : elle propose une API locale (127.0.0.1:3900), rien ne sort
 * de ton ordinateur. Les fichiers déjà faits sont gardés : relancer reprend là où on s'était arrêté.
 *
 * Usage :
 *   node outils/voicestudio-lot.mjs --liste liste.txt --sortie dossier [options]
 * La liste : une ligne par phrase, « nom-du-fichier <tabulation> texte » (la première ligne d'en-tête est ignorée si
 * elle contient « Nom du fichier »).
 * Options :
 *   --instructions "male, young adult, very low pitch"   consigne de style (voix, âge, hauteur…)
 *   --langue fr         langue du texte
 *   --graine 7          graine : même réglage, même résultat (reproductible)
 *   --vitesse 1.0       vitesse de parole
 *   --format wav        wav, mp3, flac…
 *   --ref-audio fichier.wav   voix de référence : toutes les phrases sont dites avec cette même voix (évite que la voix
 *                       change d'une phrase à l'autre)
 *   --ref-texte "…"     ce que dit la voix de référence, mot pour mot
 *   --port 3900         port de l'API locale
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, tous) => (a.startsWith('--') ? [...acc, [a.slice(2), tous[i + 1]]] : acc), []),
);
if (!args.liste || !args.sortie) {
  console.error('Usage : node outils/voicestudio-lot.mjs --liste liste.txt --sortie dossier [--instructions "…"] [--langue fr] [--graine 7] [--vitesse 1.0]');
  process.exit(1);
}
const base = `http://127.0.0.1:${args.port ?? 3900}`;
const format = args.format ?? 'wav';

try {
  const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(String(r.status));
} catch {
  console.error(`VoiceStudio ne répond pas sur ${base}. Ouvre l'application, puis relance.`);
  process.exit(1);
}

const lignes = readFileSync(resolve(args.liste), 'utf8').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && !l.startsWith('Nom du fichier'));
const sortie = resolve(args.sortie);
mkdirSync(sortie, { recursive: true });

let faits = 0;
let deja = 0;
const echecs = [];
for (const ligne of lignes) {
  const [nom, ...reste] = ligne.split('\t');
  let texte = reste.join('\t').trim();
  if (!nom || !texte) continue;
  const fichier = join(sortie, `${nom}.${format}`);
  if (existsSync(fichier)) { deja++; continue; }
  // Un mot isolé est souvent avalé : on le termine par un point.
  if (!/[.!?…]$/.test(texte)) texte += '.';
  if (args['ref-audio']) {
    // Voix de référence : l'API « generate » clone la même voix pour chaque phrase.
    const form = new FormData();
    form.append('text', texte);
    if (args.langue) form.append('language', args.langue);
    form.append('ref_audio', new Blob([readFileSync(resolve(args['ref-audio']))], { type: 'audio/wav' }), 'reference.wav');
    if (args['ref-texte']) form.append('ref_text', args['ref-texte']);
    if (args.graine) form.append('seed', args.graine);
    if (args.vitesse) form.append('speed', args.vitesse);
    try {
      const r = await fetch(`${base}/generate`, { method: 'POST', body: form, signal: AbortSignal.timeout(300000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
      faits++;
      console.log(`ok ${nom}  « ${texte} »`);
    } catch (e) {
      echecs.push(nom);
      console.error(`échec ${nom} : ${e.message}`);
    }
    continue;
  }
  const corps = {
    model: 'omnivoice',
    input: texte,
    voice: 'default',
    response_format: format,
    ...(args.langue ? { language: args.langue } : {}),
    ...(args.instructions ? { instructions: args.instructions } : {}),
    ...(args.graine ? { seed: Number(args.graine) } : {}),
    ...(args.vitesse ? { speed: Number(args.vitesse) } : {}),
  };
  try {
    const r = await fetch(`${base}/v1/audio/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), signal: AbortSignal.timeout(300000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
    faits++;
    console.log(`ok ${nom}  « ${texte} »`);
  } catch (e) {
    echecs.push(nom);
    console.error(`échec ${nom} : ${e.message}`);
  }
}
console.log(`\n${faits} fichier(s) fabriqué(s), ${deja} déjà présent(s), ${echecs.length} échec(s). Dossier : ${sortie}`);
process.exit(echecs.length ? 2 : 0);
