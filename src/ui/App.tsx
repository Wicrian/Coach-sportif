import { useCallback, useEffect, useState } from 'preact/hooks';
import { MODELES } from '../donnees/exercices';
import type { Donnees } from '../donnees/types';
import { curseurAudace } from '../moteur/audace';
import { evaluerHabitude } from '../moteur/habitude';
import { chargerBrouillon, chargerDonnees, effacerBrouillon, exporterTexte, importerSauvegarde, sauverBrouillon, sauverMesure, sauverProfil, sauverSeance, supprimerSeance } from '../stockage/base';
import { base } from '../stockage/instance';
import { Accueil } from './Accueil';
import { Activite } from './EcranActivite';
import { fusionnerCheckin } from './checkin';
import { EcranPlan } from './EcranPlan';
import { Nav, type Onglet } from './Nav';
import { calculerPreparation } from './preparation';
import { jourLocal } from './jour';
import { demarrer, terminer, type Brouillon } from './seance/deroulement';
import { preparerSeance } from './seance/preparer';
import { SeanceActive } from './seance/SeanceActive';

export function App() {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [enSeance, setEnSeance] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>('aujourdhui');

  const recharger = useCallback(async () => setDonnees(await chargerDonnees(base)), []);

  useEffect(() => {
    void (async () => {
      await recharger();
      setBrouillon(await chargerBrouillon<Brouillon>(base));
    })();
  }, [recharger]);

  if (!donnees) return <div class="ecran fond-clair"><p class="discret" style="margin-top:40vh;text-align:center">Chargement…</p></div>;

  const changer = (b: Brouillon) => {
    setBrouillon(b);
    void sauverBrouillon(base, b);
  };
  const lancer = (modeleId: string) => {
    const modele = MODELES.find((m) => m.id === modeleId)!;
    changer(demarrer(preparerSeance({ modele, seances: donnees.seances, profil: donnees.profil }), new Date()));
    setEnSeance(true);
  };
  const quitter = async () => {
    await effacerBrouillon(base);
    setBrouillon(null);
    setEnSeance(false);
  };

  if (enSeance && brouillon) {
    const habitude = evaluerHabitude(donnees.seances, jourLocal(new Date()));
    const ressentis = donnees.seances.filter((s) => s.feel).slice(0, 4).map((s) => s.feel!).reverse();
    const { bonus } = curseurAudace({
      semainesReussiesConsecutives: habitude.serieActuelle,
      semainesActives: habitude.semainesActives,
      ressentisRecents: ressentis,
      preparation: calculerPreparation(donnees).verdict,
      contestation: donnees.profil.audOverride === 'push' ? 'pousser' : donnees.profil.audOverride === 'safe' ? 'prudent' : null,
    });
    const playlists = donnees.profil.playlists ?? [];
    const playlist = playlists.find((p) => !p.pour || p.pour.length === 0 || p.pour.includes('strength'));
    const precedente = donnees.seances.find((s) => s.kind === 'strength' && s.tplId === brouillon.modeleId);
    return (
      <SeanceActive
        b={brouillon}
        inventaire={donnees.profil.halteres}
        playlist={playlist}
        precedente={precedente}
        bonus={bonus}
        onChange={changer}
        onAbandon={quitter}
        onTerminer={async (feel) => {
          await sauverSeance(base, terminer(brouillon, feel, new Date()));
          await quitter();
          await recharger();
        }}
      />
    );
  }

  const ecran = onglet === 'plan' ? (
    <EcranPlan
      donnees={donnees}
      onProfil={async (profil) => { await sauverProfil(base, profil); await recharger(); }}
      onLancer={lancer}
    />
  ) : onglet === 'activite' ? (
    <Activite
      seances={donnees.seances}
      onAjouter={async (s) => { await sauverSeance(base, s); await recharger(); }}
      onSupprimer={async (id) => { await supprimerSeance(base, id); await recharger(); }}
    />
  ) : (
    <Accueil
      donnees={donnees}
      seanceEnCours={brouillon !== null}
      onLancer={lancer}
      onCheckin={async (saisie) => {
        const jour = jourLocal(new Date());
        await sauverMesure(base, fusionnerCheckin(donnees.recuperation.find((r) => r.date === jour), jour, saisie));
        await recharger();
      }}
      onReprendre={() => setEnSeance(true)}
      onAbandonnerEnCours={quitter}
      onEnergie={async (choix) => {
        await sauverProfil(base, { ...donnees.profil, audOverride: choix });
        await recharger();
      }}
      onImporter={async (texte) => {
        const { rapport, avertissements } = await importerSauvegarde(base, texte);
        await recharger();
        const morceaux = [
          `Import terminé : ${rapport.seancesAjoutees} séance${rapport.seancesAjoutees > 1 ? 's' : ''} et ${rapport.mesuresAjoutees} mesure${rapport.mesuresAjoutees > 1 ? 's' : ''} ajoutée${rapport.mesuresAjoutees > 1 ? 's' : ''}.`,
        ];
        if (rapport.profilCompleteChamps.length) morceaux.push('Ton profil a été complété.');
        if (avertissements.length) morceaux.push(avertissements.join(' '));
        return morceaux.join(' ');
      }}
      onExporter={async () => {
        const texte = await exporterTexte(base, new Date());
        const lien = document.createElement('a');
        lien.href = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
        lien.download = `bouge-de-la-sauvegarde-${jourLocal(new Date())}.json`;
        lien.click();
        URL.revokeObjectURL(lien.href);
      }}
    />
  );

  return (
    <>
      {ecran}
      <Nav actif={onglet} onChoisir={setOnglet} />
    </>
  );
}
