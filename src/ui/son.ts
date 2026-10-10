/**
 * Petit son à la fin du repos. Les sons « maison » sont synthétisés par le téléphone (aucun fichier).
 * Sur iPhone, l'audio ne démarre qu'après un premier appui de l'utilisateur : `debloquerAudio` s'en charge.
 */
import type { ChoixSon, EvenementSon, Profil, SonChoisi } from '../donnees/types';

export type { ChoixSon, EvenementSon, SonChoisi };

export const SONS: { id: ChoixSon; nom: string }[] = [
  { id: 'ding', nom: 'Ding doux' },
  { id: 'cloche', nom: 'Cloche' },
  { id: 'double', nom: 'Double ding' },
  { id: 'aucun', nom: 'Aucun' },
];

/** Taille maximale d'un son personnel (il est gardé sur l'appareil, dans le profil). */
export const TAILLE_MAX_SON = 1_000_000;

export interface Note {
  /** Fréquence en Hz. */
  frequence: number;
  /** Début, en secondes après le déclenchement. */
  debut: number;
  /** Durée de la note, en secondes. */
  duree: number;
  /** Volume de crête, de 0 à 1. */
  volume: number;
}

/** Description des sons synthétisés (pure : sert aussi aux tests). */
export function notesDuSon(choix: ChoixSon): Note[] {
  switch (choix) {
    case 'ding':
      return [
        { frequence: 880, debut: 0, duree: 0.9, volume: 0.3 },
        { frequence: 1760, debut: 0, duree: 0.5, volume: 0.1 },
      ];
    case 'cloche':
      return [
        { frequence: 523, debut: 0, duree: 1.5, volume: 0.25 },
        { frequence: 1047, debut: 0, duree: 1.1, volume: 0.12 },
        { frequence: 1568, debut: 0, duree: 0.7, volume: 0.07 },
      ];
    case 'double':
      return [
        { frequence: 784, debut: 0, duree: 0.5, volume: 0.28 },
        { frequence: 1047, debut: 0.22, duree: 0.8, volume: 0.28 },
      ];
    default:
      return [];
  }
}

export function fichierSonValide(f: { size: number; type: string }): string | null {
  if (!f.type.startsWith('audio/')) return "Ce fichier n'est pas un son. Choisis un fichier audio (mp3, m4a, wav…).";
  if (f.size > TAILLE_MAX_SON) return 'Ce son est trop lourd : choisis un son court et léger, de moins de 1 Mo.';
  return null;
}

/** Les cinq moments qui peuvent jouer un son, avec le réglage par défaut. */
export const EVENEMENTS: { id: EvenementSon; nom: string; explication: string; parDefaut: ChoixSon }[] = [
  { id: 'ouverture', nom: "À l'ouverture de l'app", explication: "Au premier toucher de l'écran : l'iPhone ne permet pas de jouer un son avant.", parDefaut: 'aucun' },
  { id: 'debutSeance', nom: "Au lancement d'une séance", explication: 'Quand tu démarres une séance.', parDefaut: 'aucun' },
  { id: 'debutBoxe', nom: "Au lancement d'une séance de boxe", explication: 'Quand tu démarres une séance de boxe.', parDefaut: 'aucun' },
  { id: 'finSeance', nom: "À la fin d'une séance", explication: "Quand ton bilan s'affiche.", parDefaut: 'aucun' },
  { id: 'finRepos', nom: 'À la fin du repos', explication: 'Pour passer à la série suivante.', parDefaut: 'ding' },
];

/** Le son réglé pour un moment, avec reprise de l'ancien réglage « fin de repos » s'il existe. */
export function sonPour(profil: Profil, evenement: EvenementSon): SonChoisi {
  const choisi = profil.sons?.[evenement];
  if (choisi) return choisi;
  if (evenement === 'finRepos' && profil.sonRepos) {
    return { choix: profil.sonRepos, perso: profil.sonPerso, nom: profil.sonPersoNom };
  }
  return { choix: EVENEMENTS.find((e) => e.id === evenement)!.parDefaut };
}

/** Profil avec le son d'un moment modifié. Le son joué ne change pas les autres moments. */
export function definirSon(profil: Profil, evenement: EvenementSon, son: SonChoisi): Profil {
  const { sonRepos: _a, sonPerso: _b, sonPersoNom: _c, ...reste } = profil;
  // On reprend l'ancien réglage de fin de repos dans `sons` avant de le retirer, pour ne rien perdre.
  const sons = { ...(evenement !== 'finRepos' && profil.sonRepos ? { finRepos: sonPour(profil, 'finRepos') } : {}), ...profil.sons, [evenement]: son };
  return { ...reste, sons };
}

// ---- Partie navigateur (non testée en Node) ----

let contexte: AudioContext | null = null;
/** Numéro de la dernière demande de son : une demande plus récente annule celles qui attendent encore. */
let demande = 0;
let enCours: { stop: () => void }[] = [];
const tampons = new Map<string, AudioBuffer>();

function obtenirContexte(): AudioContext | null {
  if (contexte) return contexte;
  const Classe = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Classe) return null;
  contexte = new Classe();
  return contexte;
}

/** À appeler lors d'un appui de l'utilisateur : débloque la lecture audio sur iPhone. */
export function debloquerAudio(): void {
  const ctx = obtenirContexte();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const vide = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = vide;
  source.connect(ctx.destination);
  source.start(0);
}

/** Coupe le son en cours (un nouveau son remplace le précédent). */
export function arreterSon(): void {
  demande++; // annule aussi un son qui serait encore en cours de préparation
  for (const source of enCours) {
    try { source.stop(); } catch { /* déjà terminé */ }
  }
  enCours = [];
}

/** Numéro de la dernière demande de son : permet de savoir si un autre son a été demandé depuis. */
export const numeroDemande = (): number => demande;

/** Décode à l'avance des sons personnels pour qu'ils se jouent sans attendre au bon moment. */
export async function prechargerSons(adresses: string[]): Promise<void> {
  const ctx = obtenirContexte();
  if (!ctx) return;
  for (const adresse of adresses) {
    if (tampons.has(adresse)) continue;
    try {
      const donnees = await (await fetch(adresse)).arrayBuffer();
      tampons.set(adresse, await ctx.decodeAudioData(donnees));
    } catch { /* un son illisible ne doit rien casser */ }
  }
}

export async function jouerSon(choix: ChoixSon, perso?: string): Promise<void> {
  arreterSon();
  const moi = demande;
  if (choix === 'aucun') return;
  const ctx = obtenirContexte();
  if (!ctx) return;
  if (ctx.state === 'suspended') await ctx.resume();
  if (moi !== demande) return;

  if (choix === 'perso') {
    if (!perso) return;
    let tampon = tampons.get(perso);
    if (!tampon) {
      const donnees = await (await fetch(perso)).arrayBuffer();
      if (moi !== demande) return;
      tampon = await ctx.decodeAudioData(donnees);
      tampons.set(perso, tampon);
    }
    if (moi !== demande) return;
    const source = ctx.createBufferSource();
    source.buffer = tampon;
    source.connect(ctx.destination);
    source.start();
    enCours.push(source);
    return;
  }

  const maintenant = ctx.currentTime;
  for (const n of notesDuSon(choix)) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = n.frequence;
    const debut = maintenant + n.debut;
    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(n.volume, debut + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + n.duree);
    osc.connect(gain).connect(ctx.destination);
    osc.start(debut);
    osc.stop(debut + n.duree + 0.05);
    enCours.push(osc);
  }
}

/** Lit un fichier audio choisi par l'utilisateur et le range sous forme d'adresse de données. */
export function lireFichierSon(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result));
    lecteur.onerror = () => reject(new Error("Ce son n'a pas pu être lu."));
    lecteur.readAsDataURL(fichier);
  });
}
