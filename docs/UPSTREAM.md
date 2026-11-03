# Suivi du projet original (upstream)

Projet de référence : [jeanropke/RDR2CollectorsMap](https://github.com/jeanropke/RDR2CollectorsMap),
branche `master`, licence Unlicense (domaine public).

## Ce que nous réutilisons

| Réutilisé | Comment |
| --- | --- |
| **Données** : emplacements (`items.json`), cycles (`cycles.json`), valeurs (`items_value.json`), collections hebdo, trésors, légendaires, voyage rapide, Nazar, réseau routier/ferré (`geojson/`) | Vendues dans `upstream/`, synchronisées automatiquement |
| **Traductions** `langs/en.json`, `langs/fr.json` | Vendues, filtrées aux clés utiles au build |
| **Logique** (mapping catégorie → groupe de cycle, heure de bascule de Nazar, format des API communautaires, système de coordonnées `CRS.Simple`) | Réimplémentée en TypeScript, testée |
| **Code JS/CSS, images, polices** | ❌ Non réutilisés (réécriture ; ressources du jeu non redistribuables) |

Le commit upstream vendu est enregistré dans `upstream/UPSTREAM.json` et affiché dans
Réglages › Données en ligne.

## Automatisation

### 1. Synchronisation des données — `.github/workflows/upstream-sync.yml`
Deux fois par jour (01:23 et 13:23 UTC) et à la demande (avec un commit précis en option) :

1. `npm run upstream:sync` : `git ls-remote` pour le dernier commit, téléchargement des
   16 fichiers suivis **figés sur ce commit**, validation complète avec les normaliseurs
   de l’application (structure, catégories connues, cycles 1–6, coordonnées dans la carte,
   identifiants uniques, nombre minimal de marqueurs, dates sans doublon…).
   Données invalides → **rien n’est modifié**, le job échoue, un ticket `upstream-sync`
   est ouvert ou commenté.
2. Si des fichiers ont changé : lint, typage, tests unitaires et d’intégration, build,
   vérification du bundle, **tests E2E**.
3. Tout est vert → commit `chore(data): sync upstream <sha>` sur `main`, puis
   redéploiement (`deploy.yml`).

Upstream publie un nouveau calendrier de cycles **quotidiennement** : cette synchronisation
garde l’application à jour. Entre deux synchronisations, l’application peut aussi lire
directement le `cycles.json` upstream si le calendrier local ne couvre pas aujourd’hui
(option « services communautaires »).

### 2. Veille du code — `.github/workflows/upstream-watch.yml`
Chaque lundi (et à la demande) : `npm run upstream:report` fait un clone partiel
(historique seulement) et classe les fichiers modifiés depuis le commit vendu :

- 🔄 données déjà synchronisées ;
- 🗂️ autres données (nouvelle source potentielle) ;
- 🌐 traductions d’autres langues ;
- ✨ **code applicatif** (fonctionnalités à évaluer) ;
- 🎨 styles/ressources ; ⚙️ infrastructure ; 📄 divers.

S’il y a du code ou de nouvelles données, le ticket **« Évolutions upstream à examiner »**
(label `upstream`) est créé ou mis à jour avec le rapport et la liste des commits.

## Intégrer une évolution upstream (procédure manuelle)

1. Lire le rapport et les diffs upstream liés.
2. Décider : utile au collectionneur ? compatible avec nos principes (pas de publicité,
   pas de ressource du jeu, pas de service payant) ?
3. **Réimplémenter** dans notre architecture (`src/core` pour la logique, test unitaire
   d’abord), ne jamais coller le code upstream.
4. Nouvelle source de données : l’ajouter à `TRACKED_FILES` (`scripts/upstream-lib.ts`),
   écrire son normaliseur + tests dans `src/data/normalize.ts`, l’exposer via
   `scripts/build-data.ts`.
5. Branche `feature/…`, PR vers `main`, CI verte, fusion.
6. Fermer le ticket de veille.

## Commandes

```bash
npm run upstream:sync                       # dernier commit
npm run upstream:sync -- --check            # rapport sans écriture
npm run upstream:sync -- --commit <sha>     # commit précis (retour arrière possible)
npm run upstream:report -- --out report.md  # veille du code
```

**Revenir en arrière** sur des données upstream fautives : `npm run upstream:sync -- --commit <ancien sha>`
puis commit, ou `git revert` du commit de synchronisation.

## Préservation de nos personnalisations

- Les seuls fichiers écrits automatiquement sont dans `upstream/` (+ `UPSTREAM.json`).
- Tout le reste (code, styles, docs) n’est jamais touché par l’automatisation.
- Un changement de format upstream fait échouer la validation **avant** intégration :
  l’application continue de servir les dernières données valides.
