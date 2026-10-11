#!/usr/bin/env node
/**
 * Fabrique la voix enregistrée de la boxe guidée avec Piper (synthèse vocale libre, 100 % locale :
 * rien n'est envoyé sur Internet).
 *
 * Résultat, dans le dossier de sortie (par défaut donnees-perso/voix) :
 *   clips/*.m4a                 les clips, pour les écouter
 *   demo.wav                    une séance en quelques secondes, pour juger la voix d'un coup
 *   sauvegarde-avec-voix.json   à importer depuis l'accueil de l'app (« Importer une sauvegarde »)
 *
 * Usage :  node outils/generer-voix.mjs [options]
 *   --modele chemin.onnx   voix Piper (défaut : celle de ton projet jarvis-assistant-vocal)
 *   --piper chemin/piper   programme Piper
 *   --nom "Nom affiché"    nom de la voix dans l'app
 *   --locuteur N           numéro de la voix quand le modèle en contient plusieurs (upmc : 1 = Pierre)
 *   --vitesse 1.0          1.0 normal ; 0.9 un peu plus lent
 *   --douceur 0.667        bruit de la voix : plus bas = plus lisse, plus régulier
 *   --presence 4           renfort des aigus (en dB, vers 3 kHz) pour mieux distinguer les consonnes ; 0 = aucun
 *   --mots-courts 1.3      ralentit les mots très courts (nombres, « sur »…) pour qu'ils soient prononcés jusqu'au bout
 *   --coupe-aigus 7000     supprime les aigus au-dessus de cette fréquence (Hz) : enlève le sifflement de certaines voix
 *   --sortie dossier       dossier de sortie, relatif au projet
 * Le dossier donnees-perso/ n'est jamais versionné.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, tous) => (a.startsWith('--') ? [...acc, [a.slice(2), tous[i + 1]]] : acc), []),
);
const piper = args.piper ?? join(homedir(), 'jarvis-assistant-vocal/.venv/bin/piper');
const modele = args.modele ?? join(homedir(), 'jarvis-assistant-vocal/voix/fr_FR-siwis-medium.onnx');
const nom = args.nom ?? 'Siwis (Piper)';
const longueur = args.vitesse ? String(1 / Number(args.vitesse)) : '1.0'; // longueur de phonème : plus petit = plus rapide
const presenceDb = args.presence !== undefined ? Number(args.presence) : 0;
const motsCourts = args['mots-courts'] !== undefined ? Number(args['mots-courts']) : 1;
const coupeAigus = args['coupe-aigus'] !== undefined ? Number(args['coupe-aigus']) : 0;
const optionsVoix = [
  ...(args.locuteur !== undefined ? ['--speaker', String(args.locuteur)] : []),
  ...(args.douceur !== undefined ? ['--noise_scale', String(args.douceur), '--noise_w', String(Math.min(0.8, Number(args.douceur) + 0.1))] : []),
];

for (const [label, chemin] of [['Piper', piper], ['la voix', modele]]) {
  if (!existsSync(chemin)) {
    console.error(`Je ne trouve pas ${label} : ${chemin}\nIndique-le avec --piper ou --modele.`);
    process.exit(1);
  }
}

// ---- Traitement du son (WAV 16 bits mono) ----

function lireWav(octets) {
  let i = 12;
  let freq = 22050;
  while (i + 8 <= octets.length) {
    const id = octets.toString('ascii', i, i + 4);
    const taille = octets.readUInt32LE(i + 4);
    if (id === 'fmt ') freq = octets.readUInt32LE(i + 12);
    if (id === 'data') {
      const n = Math.min(taille, octets.length - i - 8) >> 1;
      const x = new Float32Array(n);
      for (let k = 0; k < n; k++) x[k] = octets.readInt16LE(i + 8 + 2 * k) / 32768;
      return { freq, x };
    }
    i += 8 + taille + (taille & 1);
  }
  throw new Error('WAV illisible');
}

function ecrireWav(x, freq) {
  const out = Buffer.alloc(44 + x.length * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + x.length * 2, 4); out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(freq, 24); out.writeUInt32LE(freq * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(x.length * 2, 40);
  for (let k = 0; k < x.length; k++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[k])) * 32767), 44 + 2 * k);
  return out;
}

/** Filtre biquad (formules « Audio EQ Cookbook »), appliqué dans le temps. */
function biquad(x, b0, b1, b2, a0, a1, a2) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const v = (b0 / a0) * x[n] + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1; x1 = x[n]; y2 = y1; y1 = v; y[n] = v;
  }
  return y;
}

function passeHaut(x, freq, f0, q = 0.707) {
  const w = (2 * Math.PI * f0) / freq, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  return biquad(x, (1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al);
}

function passeBas(x, freq, f0, q = 0.707) {
  const w = (2 * Math.PI * f0) / freq, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  return biquad(x, (1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al);
}

function cloche(x, freq, f0, gainDb, q = 0.9) {
  const A = 10 ** (gainDb / 40), w = (2 * Math.PI * f0) / freq, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  return biquad(x, 1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A);
}

/**
 * Retire le silence au début et à la fin, normalise, et adoucit les bords (pas de « clic »).
 * Le seuil est relatif au point le plus fort, et on garde une queue de 120 ms : sinon la fin douce
 * des mots courts (« trois », « un ») serait coupée.
 */
function finir(x, freq) {
  let crete = 0;
  for (const v of x) crete = Math.max(crete, Math.abs(v));
  const seuil = crete * 0.015;
  let debut = 0, fin = x.length - 1;
  while (debut < fin && Math.abs(x[debut]) < seuil) debut++;
  while (fin > debut && Math.abs(x[fin]) < seuil) fin--;
  const avant = Math.round(freq * 0.03), apres = Math.round(freq * 0.12);
  const coupe = x.slice(Math.max(0, debut - avant), Math.min(x.length, fin + apres + 1));
  const gain = crete > 0 ? 0.7 / crete : 1;
  const fonduDebut = Math.round(freq * 0.01), fonduFin = Math.round(freq * 0.05);
  for (let k = 0; k < coupe.length; k++) {
    let g = gain;
    if (k < fonduDebut) g *= k / fonduDebut;
    const reste = coupe.length - 1 - k;
    if (reste < fonduFin) g *= reste / fonduFin;
    coupe[k] *= g;
  }
  return coupe;
}

function traiter(octets) {
  const { freq, x } = lireWav(octets);
  let y = passeHaut(x, freq, 80);
  if (coupeAigus > 0 && coupeAigus < freq / 2) y = passeBas(passeBas(y, freq, coupeAigus), freq, coupeAigus); // 4e ordre
  if (presenceDb !== 0) y = cloche(y, freq, 3000, presenceDb);
  return { freq, x: finir(y, freq) };
}

// ---- Fabrication ----

const clips = JSON.parse(readFileSync(join(racine, 'src/donnees/clips-voix.json'), 'utf8'));
const sortie = join(racine, args.sortie ?? 'donnees-perso/voix');
const dossierClips = join(sortie, 'clips');
const temp = join(sortie, 'temp');
rmSync(dossierClips, { recursive: true, force: true });
mkdirSync(dossierClips, { recursive: true });
mkdirSync(temp, { recursive: true });

const voixClips = {};
const sons = {};
for (const clip of clips) {
  const base = clip.id.replace(':', '-');
  const wav = join(temp, `${base}.wav`);
  const traite = join(temp, `${base}-traite.wav`);
  const m4a = join(dossierClips, `${base}.m4a`);
  // Un mot très court est souvent « avalé » par ces voix : on le ralentit et on le termine par un point.
  const court = clip.dire.replace(/[^\p{L}]/gu, '').length <= 6;
  const longueurClip = String(Number(longueur) * (court ? motsCourts : 1));
  const texteDit = /[.!?]$/.test(clip.dire) ? clip.dire : `${clip.dire}.`;
  execFileSync(piper, ['--model', modele, ...optionsVoix, '--output_file', wav, '--length_scale', longueurClip, '--sentence_silence', '0'], {
    input: texteDit, stdio: ['pipe', 'ignore', 'ignore'],
  });
  const { freq, x } = traiter(readFileSync(wav));
  sons[clip.id] = { freq, x };
  writeFileSync(traite, ecrireWav(x, freq));
  // AAC mono léger : quelques ko par clip, lisible par l'iPhone.
  execFileSync('afconvert', [traite, m4a, '-f', 'm4af', '-d', 'aac', '-b', '56000', '-c', '1']);
  voixClips[clip.id] = `data:audio/mp4;base64,${readFileSync(m4a).toString('base64')}`;
}
rmSync(temp, { recursive: true, force: true });

// Démo : « Prépare-toi, ronde 1 sur 3 — combo 1 : … — 3, 2, 1 — combo 1, puis les coups », à écouter d'un coup.
const sequence = [
  'mot:preparetoi', 'mot:ronde', 'nombre:1', 'mot:sur', 'nombre:3', 'PAUSE',
  'mot:combo', 'nombre:1', 'coup:jab', 'coup:low-kick-arriere', 'coup:direct', 'coup:crochet-avant', 'PAUSE',
  'nombre:3', 'nombre:2', 'nombre:1', 'PAUSE',
  'mot:combo', 'nombre:1', 'PAUSE', 'coup:jab', 'PAUSE', 'coup:low-kick-arriere', 'PAUSE', 'coup:direct', 'PAUSE', 'coup:crochet-avant',
];
const freq0 = Object.values(sons)[0].freq;
const morceaux = [];
for (const id of sequence) {
  if (id === 'PAUSE') morceaux.push(new Float32Array(Math.round(freq0 * 0.6)));
  else { morceaux.push(sons[id].x); morceaux.push(new Float32Array(Math.round(freq0 * 0.08))); }
}
const total = morceaux.reduce((s, m) => s + m.length, 0);
const demo = new Float32Array(total);
let pos = 0;
for (const m of morceaux) { demo.set(m, pos); pos += m.length; }
writeFileSync(join(sortie, 'demo.wav'), ecrireWav(demo, freq0));

const sauvegarde = {
  app: 'bouge-de-la',
  v: 2,
  exportedAt: new Date().toISOString(),
  profile: { gear: [], dumbbells: [], boxe: { voixClips, voixNom: nom } },
  sessions: [],
  recovery: [],
};
const fichier = join(sortie, 'sauvegarde-avec-voix.json');
const texte = JSON.stringify(sauvegarde);
writeFileSync(fichier, texte);
console.log(`${clips.length} clips, ${(Buffer.byteLength(texte) / 1024).toFixed(0)} ko.\nÀ écouter : ${join(sortie, 'demo.wav')}\nÀ importer : ${fichier}`);
