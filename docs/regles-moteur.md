# Règles du moteur — spécification chiffrée

Ce document est la **source de vérité pour les tests**. Chaque règle a un identifiant (`R-xx`), un énoncé testable, sa source, et son statut.

Statuts : **Validée** (issue du cahier ou de la recherche) · **Hypothèse** (choix raisonnable à confirmer par l'usage) · **Plus tard** (hors phase 1).

Toute fonction du moteur renvoie, en plus de sa décision, la liste des règles appliquées (`regles: ['R-01', …]`) et une phrase d'explication. C'est ce qui rend le moteur auditable.

---

## 1. Préparation du jour (readiness) — règle « 2 sur 3 »

Trois signaux, chacun `vert`, `rouge` ou `inconnu`.

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-01 | **Signal physiologique rouge** si la HRV (RMSSD) du jour est < moyenne des 7 jours précédents − 1 écart-type **et** la FC de repos est > moyenne 7 jours + 1 écart-type. Si la FC du jour est absente, la HRV seule suffit. | Rapport progression, axe 3 | Validée |
| R-02 | Le signal physiologique reste `inconnu` tant qu'il y a moins de 4 mesures HRV sur les 7 jours précédents. Jamais de décision sur une lecture isolée. | Rapport progression (HRV bruitée) | Validée |
| R-03 | **Signal subjectif rouge** si courbatures ≥ 4/5 **ou** énergie ≤ 2/5 (check-in du jour). | Prototype | Hypothèse |
| R-04 | **Signal performance rouge** si, lors de la dernière séance de force, reps réalisées / reps ciblées < 0,85 (séries d'échauffement exclues). | Prototype | Hypothèse |
| R-05 | 2 ou 3 signaux rouges → `allégée` : séance allégée ou récupération active de 10 à 20 min (cardio léger, mobilité, shadow boxing doux). | Cahier §4 | Validée |
| R-06 | 1 signal rouge → `vigilance` : séance maintenue, message d'écoute. | Cahier §4 | Validée |
| R-07 | 0 signal rouge → `normale`. | Cahier §4 | Validée |
| R-08 | **Le subjectif peut surclasser l'objectif** : subjectif rouge seul fait passer `normale` à `vigilance` au minimum. Si l'utilisateur dit « je suis vidé », on allège même si HRV est bonne. | Cahier §4 | Validée |

## 2. Espacement et volume

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-10 | Un groupe musculaire sollicité intensément n'est pas reprogrammé avant **48 h** (cible 48–72 h). | Rapport progression, axe 3 | Validée |
| R-11 | Fréquence cible : chaque groupe musculaire **≥ 2 fois par semaine**. | Rapport progression, axe 2 | Validée |
| R-12 | Volume débutant : **4 à 10 séries effectives par muscle et par semaine**. Passage vers 10–20 seulement au statut intermédiaire. | Rapport progression | Validée |
| R-13 | Critère de passage débutant → intermédiaire. | — | **À définir** (proposition : ≥ 8 semaines régulières + progression de charge sur ≥ 3 exercices) |
| R-14 | Séries prescrites à **1–3 reps en réserve (RIR)**. Pas d'échec systématique. | Rapport progression (Refalo 2023, Robinson 2024) | Validée |

## 3. Progression (surcharge progressive)

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-20 | **Double progression** : si toutes les séries de travail dépassent la cible de 1 à 2 reps → proposer une hausse de charge. | Cahier §4, ACSM 2009 | Validée |
| R-21 | Hausse visée : petits muscles +2 à 5 %, grands muscles +5 à 10 %. | ACSM 2009 | Validée |
| R-22 | **Contrainte matériel** : la charge proposée est toujours une charge **réellement disponible** dans l'inventaire. On prend la charge disponible immédiatement supérieure. | Cahier §6 | Validée |
| R-23 | **Saut trop brutal** : si la prochaine charge disponible dépasse la charge actuelle de plus de 25 %, ne pas monter tout de suite. Progresser d'abord par reps (+1 à 2 par série), tempo plus lent ou repos réduit, sur 2 séances, puis proposer la nouvelle charge. | Cahier §6 (lissage) | Hypothèse (seuil 25 %) |
| R-24 | Exercices au poids du corps : si toutes les séries dépassent la cible de 2 reps → +1 rep par série, ou variante plus difficile quand la cible dépasse 15–20 reps. | Rapport progression | Hypothèse (plafond) |
| R-25 | Si l'utilisateur répond « trop de changements » ou « pas motivé » à une proposition → revenir à la charge précédente et décaler la prochaine tentative de 2 séances. | Cahier §6 | Validée |
| R-26 | Minimiser les changements de matériel dans une séance : à efficacité égale, regrouper les exercices utilisant la même charge. | Cahier §6 | Validée |
| R-27 | Suggestion d'achat de matériel seulement si la charge maximale disponible est atteinte **et** que les variantes sans achat (unilatéral, tempo, reps) ont été proposées. | Cahier §6 | Validée |

## 4. Curseur d'audace (0 = prudent, 1 = audacieux)

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-30 | Le curseur monte avec la régularité (semaines réussies consécutives) et l'ancienneté. | Cahier §5 | Validée |
| R-31 | **Plafond de 0,75 tant que l'habitude n'est pas installée** (moins de 6 semaines d'activité). | Cahier §5, Kaushal & Rhodes | Validée (valeur : hypothèse) |
| R-32 | Ressenti moyen des 4 dernières séances ≤ 2,3/5 → −0,2. | Prototype | Hypothèse |
| R-33 | Préparation `allégée` → −0,25 ; `vigilance` → −0,1. | Prototype | Hypothèse |
| R-34 | L'utilisateur peut contester : « je me sens prêt » → +0,25 ; « je préfère rester prudent » → −0,25. | Cahier §5 | Validée |
| R-35 | Le curseur est toujours affiché avec sa raison en une phrase. | Cahier §5 | Validée |

## 5. Habitude et streaks

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-40 | Streak **hebdomadaire** : une semaine est réussie à partir de 3 séances (cible conseillée : 4). | Cahier §8 | Validée |
| R-41 | La semaine en cours ne casse jamais le streak tant qu'elle n'est pas terminée. | Prototype | Validée |
| R-42 | Une semaine manquée isolée n'efface pas l'historique : on affiche aussi la plus longue série et le total de semaines réussies. Message encourageant, jamais culpabilisant. | Lally 2010 | Validée |
| R-43 | Adhésion < 4 séances/semaine sur 2 semaines consécutives → proposer une planification « si… alors… » et un rappel de l'indice contextuel. | Rapport motivation | Validée |

## 6. Affect pendant la séance

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-50 | Pour débutant : intensité plafonnée sous le seuil ventilatoire (repère : capable de parler ; effort perçu ≤ 4/10 en cardio). | Ekkekakis | Validée |
| R-51 | Ressenti de séance « Pénible » ou « Bof » → la séance suivante du même type est allégée d'un cran (moins de séries ou d'intensité), et le curseur baisse (R-32). | Cahier §8 | Validée |

## 7. Planification

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-60 | Projection sur 14 jours, présentée comme mouvante (recalculée à chaque ouverture). | Cahier §10 | Validée |
| R-61 | Les jours d'entraînement suivent les **créneaux préférés déclarés** par l'utilisateur (pas lundi/mercredi/vendredi en dur). | Cahier §10 | Validée |
| R-62 | Si la préparation du jour est `allégée`, la séance du jour devient de la récupération active et la suite est décalée en respectant R-10. | Cahier §4 | Validée |

## 8. Déclencheurs de trajectoire (phase 2)

| ID | Règle | Source | Statut |
|---|---|---|---|
| R-70 | Perte de poids > 1 %/semaine sur 2–3 semaines OU force −5 % → message de ralentissement (manger un peu plus, protéines). Aucun chiffre calorique imposé. | Rapport progression | Plus tard |
| R-71 | Stagnation ≥ 2–3 semaines sur un exercice → augmenter le volume ou rapprocher de l'échec (vers 1 RIR). | Rapport progression | Plus tard |
| R-72 | HRV basse + FC repos élevée + courbatures persistantes sur ≥ 3 jours → proposer une semaine de décharge (deload). | Rapport progression | Plus tard |

## 9. Calculs utilitaires

- Volume d'une série : charge × reps (× 2 si exercice unilatéral réalisé des deux côtés). Échauffements exclus.
- 1RM estimé (Epley) : charge × (1 + reps/30), seulement entre 1 et 10 reps. À usage interne : **jamais affiché comme un record spectaculaire**.
- Tendances : moyennes mobiles sur 7 jours, au moins 3 valeurs pour afficher une tendance.

## 10. Précisions d'implémentation (readiness)

Choix faits lors du codage de `src/moteur/readiness.ts`, à valider à l'usage :

- **Écart-type** : écart-type de population (division par n), comme le prototype.
- **« Jour » et « 7 jours précédents »** : la HRV du jour est celle de la mesure datée d'aujourd'hui (pas la dernière mesure connue). L'historique couvre les 7 jours calendaires qui précèdent (J−7 à J−1). Sans mesure aujourd'hui, le signal physiologique est `inconnu`.
- **R-01, FC de repos présente mais historique FC < 4 mesures** : la FC n'est pas utilisable, donc le signal reste `vert` (la HRV seule ne suffit que si la FC du jour est absente). *Hypothèse à valider.*
- **R-04** : seuil strict (`< 0,85` rouge ; 0,85 exactement = vert). Reps cibles fournies par l'appelant (clé d'exercice → reps).
- **R-08** : le texte du cahier (« on allège ») et le tableau ci-dessus (« vigilance au minimum ») ne disent pas la même chose. Le code suit le tableau : ressenti rouge seul = `vigilance`. *À trancher.*

## 11. Précisions d'implémentation (matériel et progression)

Choix faits lors du codage de `src/moteur/materiel.ts` et `src/moteur/progression.ts` :

- **Inventaire = barre + disques**, jamais une liste de charges fixes. Les charges réalisables sont calculées (R-22), arrondies à 0,1 kg, avec un montage toujours **symétrique**. Exercice à deux haltères : les disques sont partagés (4 côtés). Exercice à un seul haltère : tous les disques peuvent servir (2 côtés).
- **Matériel de l'utilisateur** (barre 1,5978 kg, 4 disques de 1,1 kg et 4 de 2,3 kg) : paire = 1,6 / 3,8 / 6,2 / 8,4 kg ; un seul haltère = jusqu'à 15,2 kg.
- **R-21 (+2 à 10 %)** sert de repère, pas de blocage : on prend toujours la charge disponible immédiatement supérieure (R-22). Seul R-23 (> 25 %) peut retarder une montée.
- **R-23** : saut > 25 % → l'exercice passe en « lissage » : même charge, reps visées = cible + 2, tempo plus lent ou repos réduit. Après 2 séances de lissage, la nouvelle charge est proposée. Avec les haltères de l'utilisateur, **toutes les montées passent par ce lissage** (3,8 → 6,2 = +63 %).
- **R-24 (plafond)** : au-delà de **20 reps** visées, on propose une variante plus difficile. *Hypothèse à valider.*
- **Première fois** : la plus grande charge disponible ≤ charge conseillée, sinon la plus légère. *Hypothèse à valider* (les charges conseillées du prototype, 2,5 et 5 kg, devront être revues avec ses vrais haltères).
- **R-25** : après un refus, retour à la charge précédente pendant 2 séances.
- **R-26** (regrouper les exercices par charge pour limiter les changements de disques) : **pas encore codé**, viendra avec la planification de séance.

## 12. Précisions d'implémentation (habitude et curseur d'audace)

Choix faits lors du codage de `src/moteur/habitude.ts` et `src/moteur/audace.ts` :

- **Semaines** : du lundi au dimanche. Toutes les séances comptent (force, marche, mobilité, boxe, cardio).
- **« Semaines d'activité » (R-31)** : nombre de semaines comptant au moins une séance. *Hypothèse à valider.*
- **R-43** : jugé sur les 2 dernières semaines **complètes** (la semaine en cours n'est jamais jugée), et seulement si l'historique les couvre. Les deux seuils (3 pour réussir une semaine, 4 pour la cible) sont voulus : voir le rapport sur la motivation.
- **R-30 (formule)** : `(série de semaines réussies + min(semaines actives, 6) / 2) / 8`, reprise du prototype. *Hypothèse.*
- **R-31** : le plafond de 0,75 est appliqué **avant** les ajustements R-32 à R-34, pour que « allégée » ou un mauvais ressenti baissent toujours vraiment le curseur ; il est aussi réappliqué à la fin, donc la contestation « je me sens prêt » ne le dépasse pas tant que l'habitude n'est pas installée. Au-delà de 6 semaines d'activité, le plafond passe à 1.
- **Plancher** du curseur : 0,05 (jamais exactement zéro). *Hypothèse.*
- **R-32** : demande au moins 2 ressentis (un seul mauvais ressenti ne fait pas baisser le curseur), moyenne sur les 4 derniers.
- **R-36 (nouvelle, hypothèse) — poussée douce** : quand l'utilisateur dit vouloir pousser, le plafond de prudence reste en place, mais si la préparation du jour est `normale` et que les derniers ressentis ne sont pas bas, le moteur propose un petit bonus : une série en plus sur le dernier exercice, arrêt possible à tout moment. Après la séance, le ressenti décide de la suite (R-32 et R-51).
