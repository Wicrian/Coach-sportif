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
