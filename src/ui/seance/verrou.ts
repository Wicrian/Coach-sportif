import { useEffect } from 'preact/hooks';

/** Garde l'écran allumé tant que le composant est affiché (si l'appareil le permet). */
export function useVerrouEcran(): void {
  useEffect(() => {
    let verrou: { release: () => Promise<void> } | null = null;
    const demander = async () => {
      try {
        verrou = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
      } catch { /* non disponible : sans importance */ }
    };
    void demander();
    const revenir = () => { if (document.visibilityState === 'visible') void demander(); };
    document.addEventListener('visibilitychange', revenir);
    return () => { document.removeEventListener('visibilitychange', revenir); void verrou?.release(); };
  }, []);
}
