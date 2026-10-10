import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { MODELES } from '../donnees/exercices';
import type { Donnees, EvenementSon, Profil } from '../donnees/types';
import { curseurAudace } from '../moteur/audace';
import { evaluerHabitude } from '../moteur/habitude';
import { chargerBrouillon, chargerDonnees, effacerBrouillon, exporterTexte, importerSauvegarde, sauverBrouillon, sauverMesure, sauverProfil, sauverSeance, supprimerSeance } from '../stockage/base';
import { base } from '../stockage/instance';
import { Accueil } from './Accueil';
import { Activite } from './EcranActivite';
import { fusionnerCheckin } from './checkin';
import { EcranPlan } from './EcranPlan';
import { EcranToi } from './EcranToi';
import { EcranBilan } from './EcranBilan';
import { Nav, type Onglet } from './Nav';
import { preparerBilan } from './seance/bilan';
import { playlistsPour } from './plan';
import { arreterSon, debloquerAudio, jouerSon, numeroDemande, prechargerSons, sonPour } from './son';
import { calculerPreparation } from './preparation';
import { jourLocal } from './jour';
import { demarrer, terminer, type Brouillon } from './seance/deroulement';
import { preparerSeance } from './seance/preparer';
import { demarrerLibre, terminerLibre, type BrouillonLibre, type GenreLibre } from './seance/libre';
import { SeanceActive } from './seance/SeanceActive';
import { SeanceLibre } from './seance/SeanceLibre';

export function App() {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [enSeance, setEnSeance] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>('aujourdhui');
  const [ouvrirCreneaux, setOuvrirCreneaux] = useState(false);
  const [bilanId, setBilanId] = useState<string | null>(null);
  const [boxeApresBilan, setBoxeApresBilan] = useState(false);
  const [libre, setLibre] = useState<BrouillonLibre | null>(null);
  const [enLibre, setEnLibre] = useState(false);
  const profilRef = useRef<Profil | undefined>(undefined);
  const [, setRafraichir] = useState(0);

  const recharger = useCallback(async () => setDonnees(await chargerDonnees(base)), []);

  useEffect(() => {
    void (async () => {
      await recharger();
      setBrouillon(await chargerBrouillon<Brouillon>(base));
      setLibre(await chargerBrouillon<BrouillonLibre>(base, 'libre'));
    })();
  }, [recharger]);

  // Sur iPhone, le son n'est autorisé qu'à la FIN d'un premier toucher (quand le doigt se relève), pas à son
  // début : on débloque donc l'audio à ce moment-là, et c'est là que le son d'ouverture peut se jouer.
  // Si ce premier toucher lance aussitôt une séance, le son de séance remplace celui d'ouverture.
  useEffect(() => {
    const evenements = ['touchend', 'click', 'keydown'];
    let fait = false;
    const retirer = () => evenements.forEach((e) => window.removeEventListener(e, premier, true));
    function premier() {
      if (fait) return;
      fait = true;
      retirer();
      debloquerAudio();
      const profil = profilRef.current;
      if (profil) {
        const son = sonPour(profil, 'ouverture');
        // On attend un instant : si ce toucher lance aussitôt une séance, son propre son passe avant.
        const numero = numeroDemande();
        setTimeout(() => {
          if (numeroDemande() === numero) void jouerSon(son.choix, son.perso).catch(() => undefined);
        }, 150);
      }
    }
    evenements.forEach((e) => window.addEventListener(e, premier, true));
    return retirer;
  }, []);

  // Décode à l'avance les sons personnels pour qu'ils partent sans attendre.
  const sonsDuProfil = donnees?.profil.sons;
  useEffect(() => {
    if (!sonsDuProfil) return;
    const adresses = Object.values(sonsDuProfil).map((x) => x?.perso).filter((x): x is string => typeof x === 'string');
    if (adresses.length) void prechargerSons(adresses);
  }, [sonsDuProfil]);

  // Quand l'app revient au premier plan (par exemple le lendemain), on recalcule le jour et on relit les données.
  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState === 'visible') {
        setRafraichir((n) => n + 1);
        void recharger();
      }
    };
    document.addEventListener('visibilitychange', auRetour);
    return () => document.removeEventListener('visibilitychange', auRetour);
  }, [recharger]);

  profilRef.current = donnees?.profil;

  if (!donnees) return <div class="ecran fond-clair"><p class="discret" style="margin-top:40vh;text-align:center">Chargement…</p></div>;

  const changer = (b: Brouillon) => {
    setBrouillon(b);
    void sauverBrouillon(base, b);
  };
  const jouer = (evenement: EvenementSon) => {
    const son = sonPour(donnees.profil, evenement);
    void jouerSon(son.choix, son.perso).catch(() => undefined);
  };
  const lancerLibre = (kind: GenreLibre) => {
    jouer(kind === 'box' ? 'debutBoxe' : 'debutSeance');
    const b = demarrerLibre(kind, new Date());
    setLibre(b);
    setEnLibre(true);
    void sauverBrouillon(base, b, 'libre');
  };
  const quitterLibre = async () => {
    await effacerBrouillon(base, 'libre');
    setLibre(null);
    setEnLibre(false);
  };
  const lancer = (modeleId: string, enchainerBoxe = false) => {
    jouer('debutSeance');
    const modele = MODELES.find((m) => m.id === modeleId)!;
    const nouvelle = demarrer(preparerSeance({ modele, seances: donnees.seances, profil: donnees.profil }), new Date());
    changer(enchainerBoxe ? { ...nouvelle, enchainerBoxe: true } : nouvelle);
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
    const playlists = playlistsPour(donnees.profil.playlists, 'strength');
    const precedente = donnees.seances.find((s) => s.kind === 'strength' && s.tplId === brouillon.modeleId);
    return (
      <SeanceActive
        b={brouillon}
        inventaire={donnees.profil.halteres}
        playlists={playlists}
        son={sonPour(donnees.profil, 'finRepos')}
        onFinAffichee={() => jouer('finSeance')}
        precedente={precedente}
        bonus={bonus}
        onChange={changer}
        onAbandon={quitter}
        onTerminer={async (feel, details) => {
          arreterSon();
          const terminee = terminer(brouillon, feel, new Date(), details);
          await sauverSeance(base, terminee);
          await quitter();
          await recharger();
          setBoxeApresBilan(brouillon.enchainerBoxe === true);
          setBilanId(terminee.id);
        }}
      />
    );
  }

  if (enLibre && libre) {
    return (
      <SeanceLibre
        b={libre}
        playlists={playlistsPour(donnees.profil.playlists, libre.kind)}
        onFinAffichee={() => jouer('finSeance')}
        onAbandon={quitterLibre}
        onTerminer={async (feel, details) => {
          arreterSon();
          const terminee = terminerLibre(libre, feel, new Date(), details);
          await sauverSeance(base, terminee);
          await quitterLibre();
          await recharger();
          setBilanId(terminee.id);
        }}
      />
    );
  }

  const seanceBilan = bilanId ? donnees.seances.find((s) => s.id === bilanId) : undefined;
  const bilan = seanceBilan ? preparerBilan(seanceBilan, donnees) : null;
  if (seanceBilan && bilan) {
    return (
      <EcranBilan
        seance={seanceBilan}
        bilan={bilan}
        onFermer={() => { arreterSon(); setBilanId(null); setBoxeApresBilan(false); window.scrollTo(0, 0); }}
        onEnchainerBoxe={boxeApresBilan ? () => { arreterSon(); setBilanId(null); setBoxeApresBilan(false); lancerLibre('box'); } : undefined}
      />
    );
  }

  const enregistrerMesure = async (saisie: Parameters<typeof fusionnerCheckin>[2]) => {
    const jour = jourLocal(new Date());
    await sauverMesure(base, fusionnerCheckin(donnees.recuperation.find((r) => r.date === jour), jour, saisie));
    await recharger();
  };

  const ecran = onglet === 'toi' ? (
    <EcranToi
      donnees={donnees}
      onProfil={async (profil) => { await sauverProfil(base, profil); await recharger(); }}
      onMesure={enregistrerMesure}
      onAllerCreneaux={() => { setOuvrirCreneaux(true); setOnglet('plan'); }}
    />
  ) : onglet === 'plan' ? (
    <EcranPlan
      donnees={donnees}
      onProfil={async (profil) => { await sauverProfil(base, profil); await recharger(); }}
      onLancer={lancer}
      onLancerLibre={lancerLibre}
      onAjouter={async (s) => { await sauverSeance(base, s); await recharger(); }}
      ouvrirCreneaux={ouvrirCreneaux}
    />
  ) : onglet === 'activite' ? (
    <Activite
      seances={donnees.seances}
      onAjouter={async (s) => { await sauverSeance(base, s); await recharger(); }}
      onSupprimer={async (id) => { await supprimerSeance(base, id); await recharger(); }}
      onBilan={(id) => { setBilanId(id); window.scrollTo(0, 0); }}
    />
  ) : (
    <Accueil
      donnees={donnees}
      seanceEnCours={brouillon !== null}
      onLancer={lancer}
      onCheckin={enregistrerMesure}
      onAllerToi={() => setOnglet('toi')}
      libreEnCours={libre?.kind ?? null}
      onReprendreLibre={() => setEnLibre(true)}
      onAbandonnerLibre={quitterLibre}
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
      <Nav actif={onglet} onChoisir={(o) => { setOuvrirCreneaux(false); setOnglet(o); }} />
    </>
  );
}
