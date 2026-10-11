/**
 * Voix de l'iPhone (synthèse vocale du navigateur) : elle fonctionne hors ligne et rien n'est envoyé nulle part.
 * Sur iPhone, la première prise de parole doit venir d'un geste (un toucher), ce que fait le bouton « Lancer ».
 */

const synthese = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export const voixDisponible = (): boolean => synthese() !== null;

/** Voix françaises installées, les meilleures d'abord (les voix « premium » / « améliorées » sont plus naturelles). */
export function voixFrancaises(): SpeechSynthesisVoice[] {
  const liste = synthese()?.getVoices() ?? [];
  const francaises = liste.filter((v) => v.lang.toLowerCase().startsWith('fr'));
  const qualite = (v: SpeechSynthesisVoice) => (/premium|enhanced|am[ée]lior/i.test(v.name) ? 0 : 1);
  return [...francaises].sort((a, b) => qualite(a) - qualite(b) || a.name.localeCompare(b.name));
}

/** Prévient quand la liste des voix change (elle arrive souvent après le chargement de la page). */
export function surVoixChangees(rappel: () => void): () => void {
  const s = synthese();
  if (!s) return () => undefined;
  s.addEventListener('voiceschanged', rappel);
  return () => s.removeEventListener('voiceschanged', rappel);
}

export function arreterVoix(): void {
  synthese()?.cancel();
}

/** Dit un texte, en coupant ce qui était en cours : une annonce en retard ne doit pas s'empiler. */
export function parler(texte: string, voixId?: string, vitesse = 1): void {
  const s = synthese();
  if (!s || !texte) return;
  s.cancel();
  const message = new SpeechSynthesisUtterance(texte);
  message.lang = 'fr-FR';
  message.rate = vitesse;
  const voix = voixId ? s.getVoices().find((v) => v.voiceURI === voixId) : undefined;
  if (voix) message.voice = voix;
  s.speak(message);
}

/** À appeler dans un geste (toucher) : sur iPhone, la voix ne parle ensuite qu'après un premier appel de ce genre. */
export function debloquerVoix(): void {
  const s = synthese();
  if (!s) return;
  const muet = new SpeechSynthesisUtterance(' ');
  muet.volume = 0;
  s.speak(muet);
}
