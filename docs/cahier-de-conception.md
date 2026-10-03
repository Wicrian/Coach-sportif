
**Projet personnel, non commercial. Prototype web d'abord, app iOS native ensuite.**
Version 1 du document — synthèse du brainstorming.

---

## 1. Vision en une phrase

Une application d'entraînement **personnelle**, qui construit et adapte jour après jour des programmes de sport à la maison ou en extérieur, en fonction de mes objectifs, de mon matériel réel, de ma récupération et de mon état d'esprit — avec une IA qui dialogue, explique et présente, pendant qu'un moteur de règles scientifiques décide en coulisse.

Le fil rouge de conception : **rendre le démarrage automatique (habitude) et le moment agréable (affect, intensité douce), pendant que le moteur garantit le progrès sans jamais sur-dramatiser les chiffres.**

---

## 2. Principes directeurs

Ces principes tranchent les arbitrages tout au long du projet.

1. **Séparer la décision et la présentation.** Le *moteur* calcule (règles chiffrées, déterministes, auditables). L'*IA* habille (langage, explication, dialogue). Si l'app allège une séance, on doit pouvoir remonter à la règle exacte qui l'a déclenché.
2. **Prudent par défaut, surtout tant que l'habitude n'est pas ancrée.** L'abandon tue plus de progression que le sous-entraînement. Le moteur ne devient plus audacieux que lorsque la régularité et la récupération le justifient.
3. **Des chiffres honnêtes, jamais spectaculaires.** Pas de « +623 % vs ta baseline ». On interprète en tendance, sobrement. C'est un correctif explicite au défaut constaté dans SensAI.
4. **Ne jamais alourdir. La machine propose, l'utilisateur confirme ou corrige en un geste.**
5. **Jamais culpabilisant.** Ton « tu peux », pas « tu dois ». Un oubli ne casse rien. Cadrage santé prudent (surtout alimentation et poids).
6. **Autonomie, compétence, lien social** : les trois besoins psychologiques à nourrir en permanence (base scientifique de la motivation durable).

---

## 3. Périmètre

- **Usage** : personnel. Si l'app est partagée, c'est via un lien, sans objectif commercial.
- **Conséquence licences** : en usage perso, on peut s'appuyer sur DAREBEE (boxe, progression) en plus des sources libres. Si un jour commercialisation → repasser sur Free Exercise DB (domaine public) + wger (CC-BY-SA).
- **Plateforme** :
  - **Phase 1 — prototype web** : artéfact web, ajouté à l'écran d'accueil iOS comme raccourci. Données sauvegardées via le stockage persistant des artéfacts. Saisie manuelle rapide des chiffres (poids, HRV, sommeil) recopiés depuis des captures d'écran.
  - **Phase 2 — dev natif iOS** : lecture directe d'Apple Santé, notifications système, tentative de connexion Polar H10 / Polar Flow, lecture automatique des captures d'écran. À faire quand on passera à la dev intense.
- **Modalités sportives visées** : haltères, poids du corps, swiss ball, boxe/kickboxing (reflex bag musical et sac de frappe), cardio/marche, mobilité. Extérieur possible.
- **Profil utilisateur** : végétarien (impact nutrition).

---

## 4. Architecture fonctionnelle — les trois couches du moteur

### Couche 1 — Les entrées (ce que le moteur lit)

**Objectif**
- Perte de graisse / hypertrophie / mixte, et le « pourquoi » (nourrit la motivation autonome).

**Récupération**
- HRV / RMSSD (Polar H10, mesure matinale standardisée) — en tendance sur moyenne mobile 7 jours.
- FC de repos.
- Courbatures / ressenti subjectif.
- Sommeil (Apple Santé).
- Performance de la dernière séance.

**Contexte**
- Matériel disponible aujourd'hui (inventaire précis).
- Temps disponible.
- Lieu (maison / extérieur).
- Affect rapporté pendant / après la dernière séance.

### Couche 2 — Les règles de décision (déterministe, auditable)

**Ajustement quotidien — règle « 2 sur 3 »**
On ne dégrade jamais une séance sur un seul signal (la HRV est bruitée). On croise trois signaux : HRV/FC repos, courbatures/subjectif, performance.
- ≥ 2 signaux rouges → séance allégée ou récupération active (10–20 min cardio léger / mobilité).
- 1 signal rouge → maintenir, surveiller.
- 0 → séance normale.
- **Le subjectif peut surclasser l'objectif** : bonne HRV mais vidé/démotivé → on allège. Et inversement.

**Espacement musculaire**
- 48–72 h entre deux sollicitations intenses du même groupe. Le moteur ne reprogramme pas un muscle trop tôt.

**Ajustement hebdomadaire — surcharge progressive**
- Double progression : quand la cible de reps est dépassée de 1–2 sur toutes les séries → charge +2–10 % (petits muscles ~2–5 %, grands muscles 5–10 %).
- À domicile sans charge en plus : progresser par reps, séries, tempo, densité (repos réduit), variantes plus dures.
- Volume : débutant 4–10 séries/muscle/semaine → intermédiaire 10–20. Fréquence ≥ 2×/semaine par muscle.
- Charges légères proches de l'échec (1–3 RIR) = hypertrophie comparable aux charges lourdes → **clé du domicile**.

**Déclencheurs qui changent la trajectoire**
- Perte > 1 %/semaine sur 2–3 semaines OU force −5 % → réduire déficit (~100 kcal), protéines +0,2 g/kg.
- Stagnation force/muscle ≥ 2–3 semaines → augmenter volume ou rapprocher de l'échec.
- HRV chroniquement basse + FC repos élevée + courbatures persistantes → semaine de deload.

### Couche 3 — L'IA (présentation, dialogue)

L'IA ne décide rien. Elle explique la décision, présente la séance, montre l'exécution, dialogue pour ajuster, capte le subjectif, et alimente le moteur en paramètres.

---

## 5. Le curseur d'audace (prudent ↔ agressif)

Paramètre interne évolutif, **transparent** (visible, contestable par l'utilisateur).

**Ce qui le fait bouger vers l'audace :**
- Historique objectif : régularité, progression réelle, récupération stable sur plusieurs semaines.
- Solidité de l'habitude (voir §8) — tant que l'habitude n'est pas ancrée, on reste prudent même si le corps encaisserait plus.

**Ce qui le fait bouger vers la prudence :**
- Check-in subjectif négatif, fatigue, baisse de motivation, irrégularité.

**Comportement :**
- La machine **nomme** son raisonnement : « Vu tes 6 semaines très régulières, on pourrait pousser un peu » / « Je te sens encore en train d'installer l'habitude, je reste prudent — on consolide avant d'accélérer ».
- L'utilisateur peut contester (« non, je me sens prêt à pousser ») → nourrit l'autonomie.

---

## 6. Matériel comme contrainte de calcul

- **Inventaire précis** déclaré par l'utilisateur : types d'haltères et poids disponibles (ex. 2, 5, 10 kg), élastiques, swiss ball, reflex bag, sac de frappe, etc.
- Le moteur ne propose **que** des combinaisons réalisables et calcule autour de la contrainte (compensation par reps/tempo/repos si la charge dispo est légère).
- **Minimiser les changements de matériel dans une séance** : regrouper et ordonner les exercices pour limiter les allers-retours entre poids. Le confort d'exécution est un critère, pas seulement la charge idéale.
- **Transition de charge progressive** : un saut trop brutal (ex. 2 → 6 kg) est anticipé et lissé (« on reste à 2 kg avec plus de reps deux séances, puis on tente 6 kg »). Si l'utilisateur répond « trop de changements » / « pas motivé », le moteur réajuste la séance **et** les projections suivantes.
- **Conseil d'investissement matériel** — toujours proposer d'abord la solution sans achat (combinaison, variante). Ne suggérer un achat que lorsque le matériel est vraiment le facteur limitant. « Tes 10 kg ne te chargent plus assez sur les squats : soit un modèle réglable jusqu'à 20 kg, soit en attendant je te bascule sur des variantes unijambistes. »

---

## 7. Alimentation (léger, tendance, végétarien)

**Principe** : pas de comptage calorique manuel (corvée = abandon). On travaille en **tendance et qualité**, jamais en comptabilité culpabilisante.

- **Photos de repas optionnelles** → estimation qualitative, jamais un chiffre faux et culpabilisant. Retour type « repas bien protéiné » / « pense à une source de protéines ce soir ».
- **Leviers réellement suivis** :
  - Protéines ~1,6 g/kg/jour (levier dominant pour préserver le muscle en déficit). Vérification simple « source de protéines à chaque repas ? ».
  - Tendance du poids (via Apple Santé ou saisie manuelle) = vraie boucle de feedback pour piloter le déficit.
- **Spécifique végétarien** :
  - Aider à la **répartition** des protéines sur la journée et à la **complémentarité** des sources (légumineuses + céréales…).
  - Suggestions concrètes et végétariennes, actionnables.
  - **Garde-manger personnel** : saisie/photo des étiquettes des produits achetés régulièrement → l'app connaît les valeurs réelles de tes produits et suggère à partir de ce que tu as vraiment.
  - **Points de vigilance** connus (fer, B12, parfois zinc/oméga-3) : l'app peut les signaler et renvoyer vers un professionnel de santé, sans jouer au médecin ni prescrire de supplémentation.
- **Garde-fou** : cadrage « tendance, qualité, jamais de chiffre culpabilisant » = protection contre un rapport malsain à la nourriture, pas seulement du confort.

---

## 8. Motivation et adhésion

### Habitude (le socle)
- Créneau + lieu fixes + indice contextuel (« après le café du matin, dans le salon »).
- Cible ~4 séances/semaine sur ≥ 6 semaines.
- Ne jamais promettre « 21 jours » : horizon réel d'automaticité 2–8 mois, très variable, communiqué honnêtement.
- **Habitude d'instigation** (déclencher automatiquement la décision de commencer) prioritaire.

### Streaks tolérants
- Base **hebdomadaire** (« 3–4 séances = semaine réussie »), pas quotidienne.
- Un jour manqué ne remet pas à zéro. Message encourageant.

### Affect pendant la séance (levier sous-estimé)
- Ce qui prédit le retour, c'est le ressenti *pendant* l'effort, pas la satisfaction d'avoir fini.
- Plafonner l'intensité sous le seuil ventilatoire pour débutant (repère : rester capable de parler).
- « Feel scale » en séance → si négatif, le moteur baisse l'intensité la fois suivante (boucle avec le curseur d'audace).

### Musique
- Pour la boxe : la machine de reflex bag gère déjà la synchro → rien à faire côté app.
- Ailleurs : bouton qui lance la playlist Apple Music au démarrage de séance.

### Trois besoins psychologiques
- **Autonomie** : menu de séances au choix, durée, musique ; report sans pénalité ; curseur contestable.
- **Compétence** : feedback de maîtrise explicite (« +30 s vs il y a 2 semaines ») ; viser 70–85 % de réussite ressentie ; progression graduée.
- **Lien social** : opt-in ; pour débutant, comparaison à soi-même plutôt qu'aux autres.

### Gamification prudente
- Gamifier la compétence et l'autonomie (défis auto-choisis, feedback de progrès), pas la contrainte.
- Badges/points secondaires. Ne jamais fonder la rétention sur des récompenses externes (effet fort au début, quasi nul à long terme, et érosion possible de la motivation intrinsèque).

### Techniques comportementales à coder (jamais isolées — empilées)
- Auto-surveillance (le composant le plus prédictif).
- Fixation d'objectifs (processus ET résultat).
- Planification « si… alors… » + gestion des barrières (« s'il pleut, alors boxe au salon »).
- Feedback (comportement et résultat).

---

## 9. Débrief de séance (feedback intelligent, pas de confettis)

Après chaque séance, court et utile :
- Ce qui a été accompli, relié à la progression (« tu as battu ton volume de la semaine dernière »).
- Lecture de ce qui s'est passé si possible (« moins de reps que prévu + FC haute → probablement la fatigue des 3 derniers jours, d'où la séance allégée demain »).
- Un conseil actionnable.

**Contrainte** : chiffres sobres, honnêtes, en tendance. Pas de pourcentages spectaculaires.

---

## 10. Notifications et planification

- Notification quelques minutes avant la séance prévue.
- L'app apprend les bons jours/créneaux en observant réussites et oublis → cale ses suggestions dessus (renforce l'habitude).
- Connexion agenda : optionnelle, v2.
- Vue prévisionnelle sur ~2 semaines (séances + récupération), **présentée comme une projection mouvante**, pas un contrat rigide — le moteur la remanie selon récupération et retours.

---

## 11. Écrans de l'application

### Navigation principale (4 onglets, inspirés de ce qui marche bien)
- **Coach** : le chat (onboarding + ajustement continu + dialogue subjectif + explications).
- **Plan** : le planning (prochaine séance, semaine, projection 2 semaines).
- **Activité** : l'historique des séances + résumé quotidien en langage naturel.
- **Progrès** : records, tendances (sobres), récupération/readiness.

### Écran de séance active (cœur de l'usage)
- Timer/compteur immédiat.
- Exercice en cours : nom, démonstration visuelle du mouvement, muscle travaillé, reps + charge cibles, matériel exact à prendre.
- Après chaque série : retour rapide et modifiable (reps réelles, charge, échauffement oui/non), pré-rempli par la machine → l'utilisateur confirme ou corrige en un geste.
- Timer de repos (circulaire, ±15 s, pause, skip) avec annonce du prochain set.
- Menu contextuel : info exercice, historique de performance, **Smart Swap** (changer d'exercice), ajouter/supprimer un set, signaler un problème.
- Types de set : warm-up / normal / drop set / failure.

### Page « Ce que je sais de toi » (nouvelle — mémoire éditable)
Récapitulatif des éléments clés enregistrés, consultables et **rectifiables** :
- **Matériel** : inventaire (ajouter/retirer du matériel, « au fait j'ai un nouveau… »).
- **Physique** : poids et sa date (« ça fait un moment que je n'ai pas donné mon poids »), mesures éventuelles.
- **Psychologique / état d'esprit** : dernier ressenti, motivation, à une date donnée.
- **Objectifs et préférences**.
Objectif : voir ce que la machine retient, corriger, compléter, mettre à jour.

### Onboarding = le chat lui-même
- Pas de long formulaire. Le coach pose ses questions au fil de l'eau et compile.
- Récolte progressive : objectif + pourquoi, matériel exact, types de séances aimés, niveau, fréquence/créneaux/lieu, puis profil végétarien, garde-manger, préférences.
- Le premier échange suffit à lancer une première séance sensée ; le reste se précise ensuite.

---

## 12. Direction visuelle

- **Sobriété et honnêteté** : c'est le correctif au défaut de SensAI. Aucun chiffre spectaculaire.
- Fond sombre pour les écrans de séance active (concentration, contraste des illustrations de mouvement), clair pour les écrans de consultation (plan, progrès).
- Illustration du muscle travaillé sur l'écran d'exercice.
- Timer de repos circulaire lisible de loin.
- Résumé quotidien en langage naturel, ton chaleureux et non-culpabilisant.
- Accessibilité : responsive mobile, focus clavier visible, motion réduit respecté.

---

## 13. Contraintes techniques connues (à ne pas oublier)

- **Prototype web** : pas de lecture automatique d'Apple Santé / Polar / captures d'écran → saisie manuelle rapide. Données via stockage persistant d'artéfact.
- **Polar H10 / Flow** : la HRV matinale (RMSSD) n'est pas toujours exposée simplement même en natif → prévoir la saisie manuelle comme mode par défaut, l'API en amélioration progressive.
- **Apple Santé** : accessible seulement en app iOS native.
- **Captures d'écran** : mode d'entrée universel et robuste, à traiter comme entrée par défaut tant qu'on n'a pas les API.
- **Séparation décision/présentation** : à respecter dans le code (moteur de règles isolé, IA par-dessus).

---

## 14. Feuille de route

**Phase 1 — Prototype web (en cours)**
- Ossature de navigation (Coach / Plan / Activité / Progrès).
- Écran de séance active avec timer et saisie rapide.
- Chat coach (onboarding + ajustement).
- Page « Ce que je sais de toi » éditable.
- Plan / projection 2 semaines.
- Stockage persistant.
- Saisie manuelle des données de récupération.

**Phase 2 — Enrichissement du moteur**
- Règles complètes d'adaptation (2-sur-3, surcharge progressive, deload).
- Curseur d'audace transparent.
- Gestion fine du matériel et des transitions de charge.
- Nutrition végé + garde-manger.

**Phase 3 — Dev natif iOS**
- Apple Santé, notifications système, tentative Polar, lecture automatique des captures.

---

## 15. Ce qui reste à trancher / explorer plus tard

- Sécurité et technique d'exécution quand on s'entraîne seul (au-delà du renvoi vers apps tierces pour la boxe).
- Détail des drills reflex bag / sac de frappe (aucune base de données ne les couvre → à concevoir).
- Décision définitive web vs natif au moment du passage en phase 3.
- Forme exacte du check-in subjectif (nombre de questions, fréquence) pour rester léger.
