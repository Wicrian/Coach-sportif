

## TL;DR
- Les trois ressources les plus complètes et fiables pour un débutant qui veut construire des programmes maison avec équipement minimal sont **DAREBEE** (fiches d'entraînement visuelles, progressions par niveaux, filtres par équipement incluant haltères/swiss ball/boxe), **wger** (base d'exercices open source AGPL + données CC-BY-SA, API REST publique, règles de progression) et **Free Exercise DB de yuhonas** (873 exercices en domaine public/Unlicense, avec niveau débutant/intermédiaire/avancé, images et instructions).
- Pour la **boxe/kickboxing** à domicile, DAREBEE couvre les séances (aucun équipement ou sac de frappe optionnel) ; pour l'**IA / reconnaissance de mouvements**, il existe des datasets académiques ouverts CC-BY-4.0 (Zenodo boxing punch IMU, Nature/figshare karaté MoCap, TUHAD taekwondo, Roboflow Universe combat).
- Attention aux licences : certaines sources sont réutilisables commercialement (domaine public, CC-BY), d'autres pas (DAREBEE = CC BY-NC-ND, pas de dérivés ni usage commercial ; ExerciseDB/MuscleWiki via API = conditions restrictives). Toujours vérifier avant intégration dans une app.

## Key Findings

1. **Il existe un noyau solide de 3-4 bases vraiment ouvertes et fiables** couvrant musculation haltères, poids du corps et ballon de gym avec instructions et notion de progression : wger, Free Exercise DB, DAREBEE, et l'API Ninjas Exercises (avec niveaux débutant/intermédiaire/expert).
2. **La progression structurée par niveaux** est surtout présente chez DAREBEE (light → advanced, programmes de 30 jours, Level I/II/III dans chaque fiche) et wger (règles de progression automatique du poids/reps/sets). Les bases « catalogue d'exercices » (Free Exercise DB, ExerciseDB) codent un niveau par exercice mais ne construisent pas la séance.
3. **Le sac de frappe sur socle et le reflex bag mural musical sont quasi absents des bases de données structurées.** Aucune base open data ne modélise spécifiquement ces équipements ; la meilleure approche est d'utiliser les workouts « combat » de DAREBEE (shadow boxing, punch bag optionnel) et, pour l'IA, les datasets de reconnaissance de coups.
4. **Pour l'IA/reconnaissance de mouvements de boxe/kickboxing**, plusieurs jeux de données académiques sont ouverts sous CC-BY-4.0, notamment le dataset IMU « Boxing punch data » (Zenodo), le dataset MoCap de karaté Kyokushin (Nature Scientific Data / figshare, avec labels débutant/avancé) et TUHAD (taekwondo).
5. **Les licences varient énormément** : du domaine public pur (Free Exercise DB, OpenPowerlifting) à des restrictions fortes (DAREBEE non commercial/sans dérivés ; MuscleWiki API interdit le téléchargement des vidéos).

## Details

### A. Musculation avec haltères / dumbbells

**wger Workout Manager** — https://wger.de (API : https://wger.de/api/v2/ ; code : https://github.com/wger-project/wger)
- Type : application web open source + API REST publique (documentée OpenAPI). Endpoints publics accessibles sans authentification (ex. `/api/v2/exercise/`, `/api/v2/exerciseinfo/`).
- Licence : code sous **AGPL-3.0+** ; les données d'exercices sous **Creative Commons Attribution Share-Alike 3.0 (CC-BY-SA 3.0)** (le partage à l'identique/share-alike rend la donnée peu « bundle-friendly » pour une app fermée, contrairement au domaine public). Réutilisable, y compris commercialement, avec attribution et partage à l'identique.
- Contenu : base communautaire d'exercices filtrable par équipement (dont dumbbell/haltères), catégorie corporelle, muscles. L'instance publique compte plusieurs centaines d'exercices (un scraper Apify du site recense 845+ exercices, 12 types d'équipement, 16 groupes musculaires, 30 langues).
- Explications & illustrations : descriptions textuelles + images statiques (pas d'animations GIF sur l'instance publique).
- Progression : oui — le moteur de « routines » gère des règles de progression automatique (poids, reps, sets, RiR par itération). C'est un vrai constructeur de programmes.
- Fiabilité : très élevée (projet mature, actif, self-hostable, communauté, traductions).

**Free Exercise DB (yuhonas)** — https://github.com/yuhonas/free-exercise-db (frontend : https://yuhonas.github.io/free-exercise-db/)
- Type : dataset JSON open source (fichiers individuels + `dist/exercises.json`) + images hébergées sur GitHub raw.
- Licence : **Unlicense (domaine public)** — aucune attribution requise, usage commercial libre. (La question de la licence des images a été soulevée dans les issues du repo ; le projet les présente comme domaine public.)
- Contenu : **873 exercices** (confirmé par le README du projet), chaque exercice avec `level` (beginner/intermediate/expert), `force`, `mechanic`, `equipment` (dont dumbbell), `primaryMuscles`, `secondaryMuscles`, `instructions` (étapes) et `images` (2 photos par exercice). Schéma JSON validé par CI.
- Progression : notion de niveau par exercice, mais pas de construction de séance.
- Fiabilité : élevée (1,7k+ stars, schéma JSON validé, CI/CD).

**API Ninjas — Exercises API** — https://api-ninjas.com/api/exercises
- Type : API REST (clé gratuite, tier premium payant pour la pagination).
- Licence : gratuite pour usage limité ; usage commercial soumis à abonnement. Données propriétaires (pas open data au sens strict).
- Contenu : milliers d'exercices, filtrables par `name`, `type`, `muscle`, `difficulty` (beginner/intermediate/expert), `equipments` (dont dumbbell). Instructions textuelles + `safety_info` (consignes de sécurité).
- Illustrations : pas d'images/vidéos (texte seulement).
- Progression : champ difficulté, pas de programme.
- Fiabilité : bonne, mais le tier gratuit est limité (jusqu'à 5 résultats par requête, offset payant).

**ExerciseDB (AscendAPI / RapidAPI)** — https://exercisedb.dev / https://github.com/exercisedb/exercisedb-api
- Type : API REST (versions gratuite et payante via RapidAPI) ; code V1 open source déployable sur Vercel.
- Licence : le code V1 est open source ; le service hébergé via RapidAPI a un tier gratuit très limité (historiquement ~10 requêtes/jour). Usage des médias soumis aux conditions RapidAPI.
- Contenu : de 1 300 à 11 000+ exercices selon la version, avec `bodyPart`, `target`, `equipment` (dont dumbbell), `gifUrl` (animations), instructions étape par étape, et parfois `difficulty`.
- Illustrations : GIF animés — un vrai atout pour montrer l'exécution.
- Progression : champ difficulté sur certaines versions.
- Fiabilité : correcte mais fragmentée (multiples forks, pricing instable, dépendance RapidAPI).

**MuscleWiki** — https://musclewiki.com (API : https://api.musclewiki.com)
- Type : bibliothèque web gratuite (2000+ exercices, carte musculaire interactive) + API commerciale.
- Licence : le site est gratuit d'accès, mais **les conditions d'API interdisent explicitement le téléchargement/stockage des vidéos et images** (streaming uniquement, attribution « Powered by MuscleWiki » obligatoire, tiers gratuit = playground 500 appels/mois). Ce n'est **pas** de l'open data.
- Contenu : 1 700–2 000 exercices, filtrables par muscle/équipement/catégorie, vidéos de démonstration, instructions étape par étape, mode maison (bodyweight) ou salle.
- Progression : générateur de routines et niveaux, mais fonctions avancées payantes.
- Fiabilité : contenu de bonne qualité, mais restrictions de licence fortes ; des APIs « non officielles » scrappées existent sur GitHub (zone grise juridique, à éviter en production).

### B. Musculation au poids du corps

- **DAREBEE** (voir ci-dessous, la référence pour le poids du corps) — filtres « no equipment », programmes Foundation/Foundation Light pour vrais débutants.
- **Free Exercise DB** et **wger** couvrent aussi les exercices au poids du corps (equipment = body only / none), avec niveaux et instructions.
- **API Ninjas** et **ExerciseDB** ont une catégorie équipement « body weight ».

### C. Ballon de gym (Swiss ball / gym ball / medicine ball)

- **DAREBEE** : filtre équipement « swiss ball » (≈12 workouts), ex. « Quick Swiss Ball Workout » full body, avec niveaux I/II/III.
- **wger** et **Free Exercise DB** contiennent des exercices « exercise ball / stability ball / medicine ball » via le champ équipement.
- Remarque : le medicine ball et le swiss ball sont parfois confondus dans les tags ; filtrer précisément.

### D. Boxe / kickboxing / cardio-boxe / sac de frappe

**DAREBEE — collections Combat / Boxing / Kicking** — https://darebee.com (ex. https://darebee.com/collections/boxing-workouts-collections.html)
- Filtre type « combat » : **246 workouts** (darebee.com/workout/types/combat), répartis par difficulté en light (10), easy (8), normal (97), hard (102) et advanced (29) — une vraie granularité de progression. Collections « Boxing Workouts » et « Kicking Workouts », programmes dédiés (ex. « Boxer Prime », workouts « Boxer », « Pro Boxer », « Kickboxer », « Boxer Power »).
- Progression : la page Boxing est « conçue pour la progression » — on choisit selon son niveau et on travaille jusqu'à réussir chaque séance en Level III ; certaines séances imitent le rythme des rounds (rounds de 3 minutes).
- Équipement : la plupart sans matériel (shadow boxing) ; le sac de frappe est **optionnel** (ex. « Boxer Power » : « If you have a punch bag handy this is one workout where you get to use it, but it's not obligatory »).
- Instructions/illustrations : posters visuels avec illustrations d'exécution + « Video Exercise Library » + « How-To video » du workout du jour.
- Licence : **CC BY-NC-ND** (partage sans modification, non commercial, copyright visible). Usage perso/associatif/coach autorisé si gratuit ; **interdit dans un produit/app même gratuit**.

**Constat sac de frappe sur socle & reflex bag mural musical** : aucune base de données ouverte structurée ne modélise spécifiquement ces équipements. Ils n'apparaissent ni dans les tags équipement de wger/Free Exercise DB, ni comme catégorie dans les APIs. Solution pratique : utiliser les séances « combat » de DAREBEE (transposables au sac) et, pour l'analyse de coups, les datasets IA ci-dessous.

### E. Entraînement rythmique / musical (fitness rythmé, shadow boxing)

- Peu de bases open data dédiées au « fitness sur musique ». DAREBEE propose des séances combat/cardio rythmées (bounce, cadence des rounds) et du shadow boxing, mais sans piste audio.
- Pour l'analyse rythmique de mouvements (cadence de coups, tempo), les datasets IMU/vidéo de boxe (section F) fournissent des séries temporelles horodatées exploitables.

### F. Bases de données pour IA / reconnaissance de mouvements (boxe, kickboxing, arts martiaux)

**Boxing punch data (Zenodo)** — https://zenodo.org/records/14965635 (DOI 10.5281/zenodo.14965635)
- Type : dataset IMU (capteurs poignets), CSV, 200 Hz (accéléromètre + gyroscope X/Y/Z).
- Licence : **Creative Commons Attribution 4.0 International (CC-BY-4.0)** — record ouvert.
- Contenu : 6 classes de coups (Lead/Rear Hand Jab, Hook, Uppercut). Protocole du paper associé (Manoharan et al., PLOS One, doi 10.1371/journal.pone.0322490) : « Eight elite boxers (five orthodox and three southpaw) performed 320 shadowboxing punches, covering 14 punch types. For analysis, six distinct punch types, including a "no punch" category, were classified. » Capteurs **MetaMotion IMU Mbientlab** (±16 g accéléromètre, ±2000 deg/s gyroscope, 200 Hz), fixés aux deux poignets. Auteur : Saravanan Manoharan (IIT Madras).
- Usage : classification/analyse cinématique de coups, projets ML.

**BoxingVI (arXiv 2511.16524)** — https://arxiv.org/abs/2511.16524 (repo annoncé : https://github.com/Bikudebug/BoxingVI)
- Type : benchmark multimodal de reconnaissance/localisation d'actions de boxe.
- Contenu : 6 915 clips de coups segmentés (6 classes : Cross, Jab, Lead/Rear Hook, Lead/Rear Uppercut) issus de 20 vidéos YouTube publiques, 18 athlètes ; annotations temporelles + keypoints de pose.
- Licence/accès : **partiellement ouvert seulement** — le dépôt fournit les liens YouTube + annotations + labels, PAS les vidéos brutes redistribuées ; aucune licence open data explicite (CC) annoncée. À vérifier sur le repo GitHub.

**Kyokushin karate optical MoCap (Nature Scientific Data)** — https://www.nature.com/articles/s41597-021-00801-5 (données : figshare, DOI 10.6084/m9.figshare.c.4981073)
- Type : capture de mouvement optique (Vicon Plug-In Gait, 39 marqueurs), fichiers C3D.
- Licence : **CC BY 4.0**.
- Contenu : selon Szczęsna, Błaszczyszyn & Pawlyta (Nature Scientific Data, 2021, doi 10.1038/s41597-021-00801-5), « 1411 mocap recordings of 37 subjects… 3229 single kicks and punches », captés à 250 Hz. Athlètes labellisés par niveau (du 4e dan au 9e kyu) et âge, avec conditions (air / bouclier / adversaire) ; techniques Gyaku-Zuki (coup de poing), Mae-Geri, Mawashi-Geri, Ushiro-Mawashi-Geri. **Labels débutant vs avancé présents** — utile pour modéliser la progression.

**TUHAD (Taekwondo Unit technique Human Action Dataset)** — https://www.mdpi.com/1424-8220/20/17/4871 (PMC7506860)
- Type : dataset multimodal (RGB, profondeur, infrarouge), 2 vues caméra.
- Licence : article MDPI **CC BY 4.0** ; données en matériel supplémentaire de l'article (pas de DOI de dépôt indépendant).
- Contenu : 1 936 échantillons d'actions, 8 techniques unitaires (blocages, coups de poing, coup de pied avant), 10 experts, ~100 000 séquences d'images.

**Roboflow Universe — datasets combat/kick/punch** — https://universe.roboflow.com (ex. https://universe.roboflow.com/georgebrown/kick-and-punch-object-detection)
- Type : datasets de détection d'objets/actions (images annotées, export YOLO/COCO).
- Licence : typiquement **CC BY 4.0** (licence par défaut Universe ; à vérifier par projet).
- Contenu : classes jab, cross, hook, uppercut, kick, punch, grappling, stance orthodox/southpaw, high/low guard, boxing-bag, etc. Ex. « Kick and punch object detection » (GeorgeBrown, 2 047 images), « Combat Sports » (382 images).
- Usage : vision par ordinateur pour reconnaître coups/gardes/postures à domicile via webcam.

**Autres datasets de recherche pertinents** : MSR-Action3D (inclut forward punch, side-boxing, forward/side kick), CAMREP Kickboxing (270 séquences, 7 actions : jab, hook, uppercut, defense, side/lower kick, jumping defense), SensiML boxing punch tutorial (données glove IMU). Vérifier la licence de chacun.

### G. Ressources open data gouvernementales

**Data.Sports (INJEP / Ministère des Sports)** — https://data.sports.gouv.fr (lancé le 29 avril 2025)
- Type : plateforme open data publique (API v2.1, exports).
- Contenu : la base DATA ES recense « plus de 330 000 lieux de pratiques… en France métropolitaine et dans les territoires d'outre-mer » (référentiel exhaustif mis à jour quotidiennement), plus licences sportives, emplois, fédérations, portraits de territoires.
- Pertinence pour des programmes d'entraînement maison : **faible/indirecte** — c'est de la donnée statistique/territoriale, pas des exercices ni des progressions. Utile pour le contexte (implantation, pratiques) mais pas pour concevoir des séances.
- L'INJEP alimente aussi data.gouv.fr en open data.

**OpenPowerlifting** — https://openpowerlifting.org (données : https://gitlab.com/openpowerlifting/opl-data)
- Licence : code AGPLv3+, **données CSV en domaine public**.
- Contenu : résultats de compétitions de powerlifting (pas d'exercices ni d'instructions). Pertinence pour un débutant maison : **faible** — utile seulement pour des benchmarks de force/analyses, pas pour apprendre l'exécution.

### H. Datasets « catalogue » sur Kaggle / Hugging Face
- Kaggle héberge de nombreux datasets d'exercices (ex. « Fitness Exercises Dataset » 1 500+ exercices avec GIF, « 600K+ Fitness Exercise & Workout Program Dataset », « The Ultimate Gym Exercises Dataset for All Levels »). Beaucoup dérivent d'ExerciseDB/wger ; qualité et licences variables (souvent non précisées) — à vérifier au cas par cas.
- Hugging Face : surtout des datasets QA/texte (`fitness-qa`, `fitness-question-answers`) ou wearables synthétiques, peu d'instructions d'exécution illustrées. Le repo GitHub `hasaneyldrm/exercises-dataset` (1 324 exercices, GIF + instructions en 10 langues dont le français) est un dérivé pratique mais les médias sont sous copyright tiers.
- `exercemus/exercises` (GitHub) : liste open source curée depuis wger.de + exercises.json, avec instructions, tips, tempo, images et vidéos YouTube.

## Recommendations

**Étape 1 — Démarrer immédiatement (débutant, zéro budget, sans code).** Utiliser **DAREBEE** comme source principale de programmes : commencer par « Foundation » ou « Foundation Light », puis filtrer par équipement (dumbbells, swiss ball) et par type « combat » pour la boxe. C'est la ressource la plus « clé en main » pour la progression et l'exécution illustrée. Respecter la licence CC BY-NC-ND (usage personnel/coaching gratuit, pas d'intégration dans une app).

**Étape 2 — Construire une base d'exercices structurée (projet/app).** Combiner **wger** (API publique + moteur de progression + attribution CC-BY-SA) et **Free Exercise DB** (domaine public, idéal pour partir sans contrainte de licence, avec niveaux et images). Ces deux-là forment le socle réutilisable, y compris commercialement. Ajouter **API Ninjas** ou **ExerciseDB** si vous voulez des GIF animés / du champ difficulté, en tenant compte des limites de tier gratuit.

**Étape 3 — Boxe/kickboxing à domicile.** S'appuyer sur les collections combat de DAREBEE pour les séances ; le sac de frappe sur socle reste optionnel dans ces workouts. Pour un reflex bag mural musical, aucune base ne le couvre : concevoir soi-même des drills à partir des mouvements de shadow boxing.

**Étape 4 — Composante IA / reconnaissance de mouvements.** Pour analyser/valider l'exécution des coups : commencer par le dataset **Zenodo boxing punch IMU (CC-BY-4.0)** si capteurs, ou les **datasets Roboflow Universe (CC BY 4.0)** si vision par webcam ; ajouter le **MoCap karaté (CC BY 4.0, labels débutant/avancé)** pour modéliser la progression technique.

**Seuils qui changeraient la recommandation :**
- Si l'objectif devient **commercial dans une app** → écarter DAREBEE et MuscleWiki, privilégier Free Exercise DB (domaine public) et wger (CC-BY-SA avec attribution).
- Si vous avez besoin de **démonstrations animées** → ExerciseDB (GIF) ou MuscleWiki (vidéos, mais streaming only) plutôt que wger/Free Exercise DB (images statiques).
- Si le besoin est **la reconnaissance de mouvements en production** → privilégier les datasets avec licence explicite (Zenodo, figshare, Roboflow) et éviter BoxingVI tant que la licence n'est pas clarifiée.

## Caveats
- **Licences** : distinguer « gratuit » de « réutilisable ». DAREBEE (CC BY-NC-ND) et MuscleWiki (conditions API restrictives) sont gratuits mais **non intégrables commercialement / sans dérivés**. Free Exercise DB (Unlicense) et OpenPowerlifting (domaine public) sont les plus permissifs. wger impose l'attribution + partage à l'identique (CC-BY-SA).
- **Qualité des images de Free Exercise DB** : leur statut de licence a fait l'objet de questions ouvertes sur GitHub ; le projet les revendique en domaine public, mais un doute subsiste pour un usage commercial à risque — vérifier.
- **Sac de frappe sur socle & reflex bag mural musical** : non couverts par les bases de données ouvertes existantes ; il n'y a pas de dataset structuré dédié. Toute affirmation contraire serait spéculative.
- **BoxingVI** : la disponibilité réelle des données (liens YouTube + annotations seulement, pas de vidéos, licence non précisée) doit être confirmée sur le dépôt GitHub avant tout usage.
- **Datasets Kaggle/Hugging Face** : beaucoup sont des re-publications d'ExerciseDB/wger avec des licences non explicites ou des médias sous copyright ; ne pas présumer qu'ils sont librement réutilisables.
- **Data.Sports (INJEP) et OpenPowerlifting** sont fiables mais **hors sujet pour concevoir des séances** : données statistiques/compétition, pas d'instructions d'exécution ni de progression pédagogique.