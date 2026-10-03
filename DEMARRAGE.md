# Démarrage — mode d'emploi pour Christian

## Avant tout : sauvegarder tes données

Ouvre le prototype « Bouge de là ! » sur ton téléphone, va dans le profil et touche **Exporter (JSON)**. Garde ce fichier précieusement : c'est ton historique. Ne le mets **pas** dans le dépôt GitHub (le `.gitignore` le bloque déjà s'il contient le mot « sauvegarde »).

## Mise en place (une seule fois)

1. Crée un compte sur github.com, puis un **dépôt privé** nommé `bouge-de-la`.
2. Installe l'app de bureau Claude, ouvre l'onglet **Code**, et connecte ton compte GitHub quand elle le propose.
3. Dézippe ce dossier sur ton ordinateur, puis ouvre-le dans Claude Code.
4. Colle le prompt de la session 1 ci-dessous.

## Les sessions, dans l'ordre

Une session = une étape. Tu valides le résultat sur ton téléphone avant de passer à la suivante. Copie-colle chaque prompt tel quel.

### Session 1 — Fondations

> Lis `CLAUDE.md`, puis `docs/cahier-de-conception.md`, `docs/regles-moteur.md` et `docs/etat-du-prototype.md`. Résume-moi en 10 lignes ce que tu as compris du projet et signale-moi toute contradiction entre ces documents. Puis propose-moi la pile technique et la structure de dossiers. N'écris aucun code avant mon accord. Ensuite : initialise le projet, connecte-le à mon dépôt GitHub `bouge-de-la`, fais un premier commit.

### Session 2 — Le moteur, avec ses tests

> Migre le moteur du prototype (`Engine` dans `prototype/index.html`) vers `src/moteur/` en TypeScript, module par module. Pour chaque règle de `docs/regles-moteur.md` avec le statut « Validée » ou « Hypothèse » (hors section 8), écris d'abord les tests, puis le code. Corrige au passage l'écart n°1 de `docs/etat-du-prototype.md` (charges réellement disponibles). Chaque décision renvoie les identifiants des règles appliquées. Montre-moi le rapport de tests à la fin.

### Session 3 — Stockage et import de mes données

> Mets en place le stockage local IndexedDB et l'export / import JSON. L'import doit accepter le format du prototype décrit dans `docs/etat-du-prototype.md` (avec conversion de `dumbbells` en liste de nombres). Écris un test d'import avec un faux fichier au format du prototype.

### Session 4 — Les écrans

> Reconstruis les écrans du prototype (Coach, Plan, Activité, Progrès, Séance active) en respectant `docs/design-system.html`. Le moteur ne doit être appelé que depuis l'interface, jamais l'inverse. Priorité à l'écran de séance active : timer, saisie pré-remplie modifiable en un geste, timer de repos circulaire.

### Session 5 — En ligne sur mon iPhone

> Transforme l'app en PWA installable et hors ligne, puis déploie-la sur GitHub Pages. Explique-moi pas à pas comment l'ajouter à l'écran d'accueil de mon iPhone et comment y importer ma sauvegarde.

### Ensuite (phase 2, dans l'ordre suggéré)

1. Page « Ce que je sais de toi » complète et datée.
2. Créneaux préférés et planning qui s'appuie dessus (R-61).
3. Volume par muscle et par semaine, espacement 48 h par muscle (R-10 à R-12).
4. Bibliothèque d'exercices élargie depuis Free Exercise DB, traduite en français.
5. Feel scale qui ajuste la séance suivante (R-51).
6. Planification « si… alors… » et gestion des obstacles (R-43).
7. Module nutrition végétarienne léger (tendances, jamais de comptage).
8. Coach IA via l'API Anthropic. Cela demande une clé API payante à l'usage et une petite fonction serveur pour la protéger. À décider le moment venu.

### Phase 3 — iOS natif
Apple Santé, Polar, notifications, lecture de captures d'écran. Soit Swift natif, soit Capacitor autour de la PWA. Compte Apple Developer nécessaire.

## Conseils pour bien travailler avec Claude Code

- **Une demande à la fois.** Une session = une fonctionnalité.
- **Teste sur ton téléphone** après chaque session avant de continuer.
- Si un résultat ne te plaît pas, dis-le simplement (« le timer est trop petit », « je veux pouvoir sauter un exercice »). Inutile de parler technique.
- Quand une règle chiffrée change à l'usage, demande à Claude Code de **mettre à jour `docs/regles-moteur.md` en même temps que le code**. Le document doit toujours dire la vérité.
- Les réflexions de fond (nouvelle fonctionnalité, arbitrage scientifique) se font dans le Projet claude.ai ; le code se fait dans Claude Code. Quand une décision change le cahier de conception, mets à jour `docs/cahier-de-conception.md`.
