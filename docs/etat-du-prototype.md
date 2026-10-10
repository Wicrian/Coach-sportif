# État du prototype (`prototype/index.html`)

Prototype d'un seul fichier HTML (~59 ko), écrit pour tourner dans claude.ai. Il sert de **référence fonctionnelle** pour la migration : on reprend sa logique, pas son code tel quel.

## Ce qui existe et fonctionne

- **Navigation** à 4 onglets : Coach, Plan, Activité, Progrès, plus un écran de séance active.
- **Bibliothèque** de 9 exercices (`LIB`) et 2 modèles de séance (`TPL`) : full-body haltères et poids du corps + swiss ball. 4 séances rapides (marche, mobilité, boxe/reflex bag, cardio léger).
- **Moteur** (`Engine`), déjà séparé de l'interface :
  - `readiness` : règle « 2 sur 3 » avec explications par signal (R-01 à R-08).
  - `suggest` : double progression simple.
  - `audacity` : curseur d'audace avec contestation possible.
  - `streaks` : streak hebdomadaire (objectif 3 séances).
  - `projection` : planning 14 jours.
  - `records`, `weeklyVolumes`, `recTrend`, `e1rm`.
- **Check-in du jour** : énergie, courbatures (1–5), HRV, FC de repos, sommeil, poids.
- **Profil** éditable : matériel, haltères, régime, « pourquoi ».
- **Export / import JSON** des données.
- Respect de `prefers-reduced-motion`.

## Ce qui doit changer

### Dépendances à claude.ai (à supprimer)
- `Store.connect()` utilise `claude.use('db')` et `claude.use('user')` → remplacer par IndexedDB.
- L'export utilise `claude.use('downloads')` → remplacer par un téléchargement de fichier classique.

### Écarts avec le cahier de conception
1. **La progression ignore l'inventaire réel.** `suggest` propose toujours `charge + 2,5 kg`. Avec des haltères de 2,5 / 5 / 10 kg, passer de 5 à 7,5 kg est impossible. → Appliquer R-22 et R-23 (charge disponible suivante, lissage des sauts).
2. **Le planning est figé** sur lundi / mercredi / vendredi (+ marche mardi, mobilité samedi). → R-61 : utiliser les créneaux déclarés.
3. **Le coach est scripté**, pas conversationnel. C'est acceptable en phase 1. L'IA viendra plus tard.
4. **Pas de feel scale exploité** pour alléger la séance suivante (R-51).
5. **Pas de suivi du volume par muscle et par semaine** (R-11, R-12).
6. **Pas de page « Ce que je sais de toi »** complète : le profil existe, mais pas la vue datée (poids et sa date, dernier ressenti).
7. **Pas d'espacement par groupe musculaire** (R-10) : la projection raisonne par séance, pas par muscle.
8. Les exercices n'ont **pas de démonstration visuelle**.

### Seuils à valider
Les seuils du prototype qui ne viennent pas du cahier sont marqués « Hypothèse » dans `regles-moteur.md` (0,85 pour la performance, −0,2 / −0,25 pour l'audace, etc.).

## Format des données (à préserver)

```js
// Export du prototype
{ app: 'bouge-de-la', v: 1, exportedAt: '…ISO…',
  profile:  { gear: [...], dumbbells: '2,5 / 5 / 10', diet: 'Végétarien', why, audOverride, … },
  sessions: [ { id, date, kind: 'strength'|…, tplId, feel: 1-5,
                exercises: [ { key, sets: [ { type: 'warmup'|…, w, reps } ] } ] } ],
  recovery: [ { date: 'AAAA-MM-JJ', hrv, rhr, sleep, weight, energy, sore } ] }
```

Attention : `dumbbells` est une **chaîne de texte**. Le nouveau modèle doit la convertir en liste de nombres (`[2.5, 5, 10]`) lors de l'import.

## Import et stockage (session 3)

- **Import** (`src/stockage/sauvegarde.ts`) : accepte le format du prototype (v1). Les haltères en texte (« 2,5 / 5 / 10 ») sont convertis en liste de nombres (`dumbbells: [2.5, 5, 10]`). Les séances et mesures sont conservées à l'identique, champs inconnus compris. Sauvegarde actuelle : **v2** (même enveloppe `{ app, v, exportedAt, profile, sessions, recovery }`).
- **Fusion** : séances reconnues par leur `id`, mesures par leur date. Importer deux fois le même fichier ne crée aucun doublon. Les données de l'appareil ne sont jamais écrasées. Pour le profil, l'appareil gagne et le fichier comble les trous ; le matériel est réuni.
- **Ancien `dumbbells`** : conservé tel quel pour mémoire, mais **le moteur n'utilise que `halteres`** (barre + disques). Le prototype contenait une estimation fausse (2,5 / 5 / 10 kg) ; l'inventaire réel se saisit dans le profil.
- **Stockage** (`src/stockage/base.ts`) : IndexedDB via Dexie, tout reste sur l'appareil. Une seule mesure par jour.
- **Pas encore fait** : le bouton de téléchargement de l'export et l'écran d'import (session 4, interface).

## Photo de profil et raccourci des créneaux

- **Photo de profil** : choisie dans l'onglet « Toi », recadrée en carré et réduite à 256 × 256 pixels sur l'appareil, puis gardée dans le profil (`avatar`, adresse de données). Elle ne quitte jamais le téléphone, sauf si l'utilisateur exporte sa sauvegarde : elle y figure alors (quelques ko). Une bulle apparaît sur l'accueil et ouvre l'onglet « Toi ».
- **Créneaux** : un bouton dans « Toi » mène à « Mes créneaux » (onglet Plan, section ouverte). La section s'ouvre aussi toute seule tant que les créneaux n'ont jamais été réglés.

## Retours d'usage (6 octobre) et corrections

- **Check-in d'hier encore affiché** : l'app était restée ouverte pendant la nuit. Le formulaire est maintenant lié au jour (il repart à zéro un nouveau jour), et l'app relit ses données et recalcule le jour quand elle revient au premier plan.
- **Impossible de lancer une séance** : le Plan n'offrait un bouton que pour la force du jour, et « Commencer une séance » était sous la préparation et le check-in. Maintenant : « Commencer une séance » est en haut de l'accueil ; la carte du jour dans le Plan propose toujours une action (démarrer, « Je l'ai faite » qui ouvre la saisie pré-remplie, ou « Choisir une autre séance »), y compris quand la journée est marquée « déjà fait ».
- **Titre** : « Ce que je sais de toi » devient « Ton profil » (onglet « Profil »).
- **Musique** : si plusieurs playlists conviennent à la séance, l'utilisateur choisit laquelle ouvrir.
- **Test de robustesse** : `src/ui/seance/robustesse.test.ts` prépare une séance sur 3 000 historiques aléatoires sans erreur.

## Plan : des fiches sur lesquelles on appuie (7 octobre)

Retour d'usage : la carte du jour, colorée et dotée d'un bouton « Je l'ai faite », ressemblait à un état déjà validé, et l'utilisateur s'attendait à « entrer dans la fiche ».
- Chaque jour du Plan est une **carte neutre** sur laquelle on appuie (flèche à droite, aucun bouton dans la liste).
- La **fiche du jour** (`FicheJour.tsx`) montre ce qui est prévu et pourquoi ; pour la force, la liste des exercices avec séries, reps et charges ; aujourd'hui, elle permet de démarrer la séance, de noter qu'elle a été faite (formulaire pré-rempli avec ressenti et détails), de **choisir une autre séance** (liste des deux séances de force, ou une séance faite ailleurs) et de **reporter sans pénalité** (jour indisponible).
- Les **jours à venir** s'ouvrent aussi : le prévu, et « je ne suis pas dispo ».
- **Matériel inconnu** : la fiche affiche « charge à choisir » et, en séance, le bouton de charge avance par pas de 1 kg.

## Bilan de séance, son de fin de repos, check-in léger (10 octobre)

Retours d'usage : « j'aimerais un feedback après mes séances », « j'ai du mal à penser à mon check-in le matin », « un petit son à la fin du repos ».
- **Bilan** : écran affiché après « Terminer » et rouvrable depuis l'Activité (bouton « Bilan »). Voir `docs/regles-moteur.md` §18.
- **R-51** (séance allégée après un ressenti pénible ou bof) est maintenant codée.
- **Check-in** : en haut de l'accueil, trois touches, replié une fois fait.
- **Son** : réglable dans « Profil » ; fichier personnel possible.
- **Rappel du matin** : une application web installée sur iPhone ne peut pas envoyer de notification programmée sans serveur. En attendant la version native, l'utilisateur peut créer une automatisation dans l'app Raccourcis.

## Sons par moment et séances libres (10 octobre)

- **Cinq moments, cinq sons** (profil `sons`) : ouverture de l'app, lancement d'une séance, lancement d'une séance de boxe, fin de séance (affichage du bilan), fin de repos. Chaque son est un son synthétisé (ding doux, cloche, double ding), aucun, ou un fichier de l'utilisateur. Réglage dans « Profil » → « Tes sons ».
- **Sons personnels** : gardés **uniquement sur l'appareil** (adresse de données dans le profil, 1 Mo maximum chacun). Ils ne sont **jamais ajoutés au dépôt** : ce sont des extraits protégés par des droits d'auteur. Le fichier de sauvegarde personnel qui les contient reste dans `donnees-perso/` (ignoré par git).
- **Limite de l'iPhone** : un son ne peut pas se jouer avant un premier toucher de l'écran. Le son d'ouverture se joue donc au premier appui.
- **Séances libres** (`src/ui/seance/libre.ts`, `SeanceLibre.tsx`) : boxe, marche, mobilité, cardio léger se lancent depuis la fiche du jour : chronomètre, playlist du type, bouton « Terminer », ressenti et détails, bilan. La séance en cours survit à un rechargement (brouillon `libre`). La boxe reste à faire dans Boxa, Heavybox ou au sac : l'app tient le temps, la musique et le bilan.
- **Moteur de décision** : inchangé. Une séance libre compte dans la semaine réussie et dans la planification.
