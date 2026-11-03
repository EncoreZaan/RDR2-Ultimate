# Architecture

## Principes

- **Statique et sans serveur** : tout tourne dans le navigateur ; aucune base de données,
  aucun compte, aucun coût récurrent.
- **Données séparées du code** : les données upstream sont vendues dans `upstream/`,
  normalisées au build dans `public/data/`, et chargées à l’exécution.
- **TypeScript strict** partout (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), dépendances d’exécution minimales.
- **Logique pure testable** (`src/core`, `src/data`) séparée de l’interface (`src/ui`)
  et de la carte (`src/map`).

## Stack

| Rôle | Choix | Pourquoi |
| --- | --- | --- |
| UI | Preact 11 + @preact/signals | 4 Ko, API React, réactivité fine sans re-rendu global |
| Carte | Leaflet 1.9 (`CRS.Simple`) | Même système de coordonnées que l’original, éprouvé, léger |
| Build | Vite 8 (Rolldown) | Rapide, sortie ES2022, découpage en chunks |
| PWA | vite-plugin-pwa (Workbox, `generateSW`) | Précache fiable, mise à jour contrôlée |
| Tests | Vitest + jsdom, Playwright | Unitaires/intégration rapides, E2E réels avec service worker |
| Qualité | ESLint 10 + typescript-eslint (règles typées) | Erreurs de promesses, imports de types, etc. |
| Polices | Cinzel, Inter (OFL, auto-hébergées, sous-ensemble latin) | Fonctionnent hors ligne |

Dépendances d’exécution : `preact`, `@preact/signals`, `leaflet` (+ polices). C’est tout.

## Arborescence

```
upstream/                 Données vendues depuis jeanropke/RDR2CollectorsMap (+ UPSTREAM.json : commit)
scripts/
  build-data.ts           upstream/ → public/data/*.json (validé, compact, filtré)
  sync-upstream.ts        Récupère un commit upstream, valide, met à jour upstream/
  upstream-report.ts      Rapport des évolutions upstream non synchronisées
  upstream-lib.ts         Fichiers suivis, accès git/raw
  verify-dist.ts          Contrôle de sécurité du bundle avant publication
  generate-icons.ts       Icônes PWA à partir de src/assets/logo.svg
src/
  data/types.ts           Modèle de données normalisé (partagé avec les scripts)
  data/normalize.ts       Validation + normalisation des fichiers upstream
  core/
    time.ts               Jours UTC, compte à rebours, jour de Madame Nazar
    cycles.ts             Résolution des cycles (calendrier / en ligne / manuel / repli)
    progress.ts           Récupéré, inventaire, filtres, statistiques
    storage.ts            Persistance versionnée, validation, sauvegardes, export/import
    search.ts             Index de recherche insensible aux accents
    route.ts              Itinéraire (plus proche voisin + 2-opt)
    live.ts               Services communautaires (hebdo, Nazar, cycles), best-effort
    describe.ts           Noms et descriptions des marqueurs
    i18n.ts               Textes d’interface FR/EN
  state/store.ts          État global (signals) : données, réglages, progression, actions
  map/
    controller.ts         Contrôleur Leaflet impératif (fonds, marqueurs, couches)
    MapView.tsx           Liaison signals → contrôleur
    icons.ts              Pictogrammes SVG originaux, couleurs des catégories
  ui/                     Composants (en-tête, recherche, panneaux, fiche détail, dialogues)
  app/                    App racine, enregistrement du service worker
  styles/                 Thème « cuir et laiton », responsive
tests/unit, tests/integration   Vitest
e2e/                      Playwright
```

## Flux de données

```
jeanropke/RDR2CollectorsMap ──(sync-upstream, validé)──▶ upstream/*.json (versionné dans Git)
                                                            │ build-data (validé)
                                                            ▼
                                                  public/data/*.json ──▶ précache du service worker
                                                            │ fetch au démarrage
                                                            ▼
            localStorage (réglages, progression, repères) ◀──▶ store (signals) ──▶ UI + carte
                                                            ▲
             services communautaires (optionnels) ──────────┘ hebdo, Nazar, cycles récents
```

### Modèle normalisé (`public/data`)

| Fichier | Contenu | Taille |
| --- | --- | --- |
| `collectibles.json` | 17 catégories, 17 collections, 184 objets, 1 586 marqueurs | ~370 Ko (~60 Ko gzip) |
| `cycles.json` | Calendrier des cycles (fenêtre glissante upstream) | ~4 Ko |
| `world.json` | Collections hebdo, trésors, légendaires, voyage rapide, Nazar | ~30 Ko |
| `basemap.json` | Réseau routier et ferré (carte schématique) | ~265 Ko |
| `i18n/{fr,en}.json` | Chaînes du jeu utiles uniquement (1 263 clés) | ~95 Ko |
| `meta.json` | Commit upstream, date de synchronisation | <1 Ko |

### Cycles

Le jeu associe à chaque groupe (fleurs, tarot, bijoux, alcools, œufs, pointes de flèche,
objets de famille, pièces, fossiles, aléatoires) un numéro de cycle 1–6 qui change à
**minuit UTC**. `resolveCycles` applique, par ordre de priorité : saisie manuelle →
entrée du calendrier (local fusionné avec la version en ligne) → repli (tout à 1, signalé
à l’utilisateur).

### Persistance

`Repository` enveloppe chaque document (`settings`, `progress`, `pins`) dans
`{ schema, savedAt, data }`. À la lecture : migrations successives, puis assainissement
(champ par champ). Un document illisible ou d’une version future est copié dans
`rdr2u:<doc>:corrupt:<horodatage>` avant d’utiliser les valeurs par défaut.
Les écritures en échec (quota) sont signalées à l’utilisateur.

## Choix notables

- **Pas de framework de routing ni de gestion d’état lourd** : un seul écran, des signals.
- **Contrôleur Leaflet impératif** : on évite de recréer la carte à chaque rendu ; les
  marqueurs ne sont reconstruits que si la liste visible change ; l’état « récupéré »
  ne fait que basculer des classes CSS.
- **Carte schématique sous les tuiles** : panneau Leaflet dédié (z-index 150 < tuiles 200),
  rendu canvas ; visible partout où les tuiles manquent (hors ligne, fournisseur indisponible).
- **Aucune ressource du jeu** : icônes, logo et thème sont originaux (voir LICENSING).
