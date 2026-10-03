# Bouge de là ! — instructions pour Claude Code

Application d'entraînement **personnelle et non commerciale**. Elle construit et adapte au jour le jour des séances de sport à la maison ou en extérieur, selon mes objectifs, mon matériel réel, ma récupération et mon état d'esprit.

Je ne suis pas développeur professionnel. Explique tes choix en français simple, avance par petites étapes vérifiables, et demande-moi avant toute décision structurante (choix de bibliothèque, changement de format de données, suppression de fonctionnalité).

## Documents de référence (à lire avant de coder une fonctionnalité)

- `docs/cahier-de-conception.md` — la vision, les écrans, les règles. **Source de vérité fonctionnelle.**
- `docs/regles-moteur.md` — toutes les règles chiffrées du moteur, avec leur source. **Source de vérité pour les tests.**
- `docs/design-system.html` — couleurs, typographies, composants, ton.
- `docs/etat-du-prototype.md` — ce qui existe déjà, ce qui est à corriger.
- `docs/recherche/` — les trois rapports scientifiques (progression, motivation, bases d'exercices). À consulter pour justifier une règle, pas à recopier.
- `prototype/index.html` — le prototype actuel (un seul fichier). Point de départ de la migration, **ne pas le modifier**.

## Les six principes qui tranchent tous les arbitrages

1. **Séparer décision et présentation.** Le moteur calcule (fonctions pures, déterministes, testées). L'interface et le coach habillent. Toute décision du moteur doit pouvoir être tracée jusqu'à la règle qui l'a déclenchée (chaque résultat porte un champ `raison` / `regle`).
2. **Prudent par défaut**, surtout tant que l'habitude n'est pas installée. L'abandon coûte plus que le sous-entraînement.
3. **Chiffres honnêtes, jamais spectaculaires.** Pas de « +623 % ». Tendances sobres, moyennes mobiles.
4. **Ne jamais alourdir la saisie.** La machine pré-remplit, l'utilisateur confirme ou corrige en un geste.
5. **Jamais culpabilisant.** Ton « tu peux », jamais « tu dois ». Un oubli ne casse rien (streak hebdomadaire).
6. **Nourrir autonomie, compétence et lien social** : toujours proposer des choix, un report sans pénalité, un curseur contestable.

## Architecture cible

```
src/
  moteur/        # règles pures : aucune dépendance au DOM, au stockage ni à l'IA
    readiness.ts       # règle « 2 sur 3 »
    progression.ts     # double progression, contraintes matériel
    audace.ts          # curseur prudent ↔ audacieux
    planification.ts   # projection 2 semaines, espacement 48–72 h
    habitude.ts        # streaks hebdomadaires
    *.test.ts          # tests Vitest à côté de chaque module
  donnees/       # bibliothèque d'exercices, modèles de séance, types
  stockage/      # persistance locale (IndexedDB) + export/import JSON
  coach/         # textes du coach (scripté pour l'instant, IA plus tard)
  ui/            # écrans : Coach, Plan, Activité, Progrès, Séance active, « Ce que je sais de toi »
docs/
prototype/
```

Règle d'or : **`src/moteur/` n'importe jamais rien de `ui/`, `stockage/` ou `coach/`.** Il reçoit des données, renvoie des décisions expliquées.

## Pile technique (proposition — à confirmer avec moi en première session)

- Vite + TypeScript (strict), Preact pour l'interface (léger, proche du prototype).
- Vitest pour les tests du moteur.
- IndexedDB (via Dexie) pour les données, sur l'appareil.
- PWA (vite-plugin-pwa) pour l'ajout à l'écran d'accueil de l'iPhone et l'usage hors ligne.
- Hébergement : GitHub Pages.
- Polices : Fraunces + Plus Jakarta Sans (Google Fonts), avec repli système.

Si tu proposes autre chose, explique pourquoi en deux phrases et attends mon accord.

## Ce qui ne doit plus exister dans le nouveau code

Le prototype tournait dans claude.ai. Ces API **n'existent pas** hors de claude.ai et doivent disparaître :
`window.claude`, `claude.use('db')`, `claude.use('user')`, `claude.use('downloads')`, `window.storage`.
Remplacement : IndexedDB pour les données, un lien de téléchargement classique pour l'export.

## Compatibilité des données (impératif)

Le nouvel import doit accepter le format d'export du prototype :
`{ app: 'bouge-de-la', v: 1, exportedAt, profile, sessions, recovery }`.
Je vais exporter mes données du prototype et les réimporter. Aucune perte acceptée. Prévoir un champ de version et une fonction de migration.

## Façon de travailler

- Une fonctionnalité à la fois. Avant de coder : résume en 3–5 lignes ce que tu vas faire et quels fichiers tu touches.
- Pour toute règle du moteur : **écrire le test d'abord**, avec les seuils de `docs/regles-moteur.md`.
- Après chaque étape : `npm test` et `npm run build` doivent passer. Puis propose un commit avec un message clair en français.
- Ne jamais inventer un seuil chiffré. S'il manque, demande-moi ou signale-le dans `docs/regles-moteur.md` comme « hypothèse à valider ».
- Interface : respecter le design system (rose qui mène, neutres aubergine, jamais de gris froid, fond sombre en séance active, `prefers-reduced-motion` respecté, focus clavier visible, mobile d'abord).
- Accessibilité et confidentialité : aucune donnée envoyée à un serveur sans que je l'aie demandé explicitement.

## Contenus et licences (usage personnel)

- Base d'exercices : partir de **Free Exercise DB** (yuhonas, domaine public) — on peut l'intégrer et la traduire.
- **DAREBEE** (CC BY-NC-ND) : liens vers leurs pages uniquement, jamais d'intégration ni de modification de leurs visuels.
- wger (CC-BY-SA) possible avec attribution.

## Profil utilisateur utile au code

- Végétarien (module nutrition, plus tard).
- Matériel : haltères (valeur par défaut du prototype : 2,5 / 5 / 10 kg), swiss ball, reflex bag mural musical, sac de frappe sur socle. L'inventaire exact vit dans le profil de l'app, jamais en dur dans le code. **Le moteur ne propose que des charges réellement disponibles.**
- Données de récupération saisies à la main (HRV, FC de repos, sommeil, poids), copiées depuis Polar et Apple Santé.

## Hors périmètre pour l'instant

Coach IA par API Anthropic, Apple Santé, Polar, notifications système, lecture de captures d'écran, app iOS native. Voir la feuille de route dans `DEMARRAGE.md`.
