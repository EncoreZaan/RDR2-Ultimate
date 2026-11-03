# RDR2 Collector’s Ultimate

Carte de collection **personnelle** pour le rôle de Collectionneur de *Red Dead Online* :
cycles du jour, emplacements des 17 catégories d’objets, collection hebdomadaire,
Madame Nazar, inventaire et progression — **sans publicité, sans traceur, installable
(PWA) et utilisable hors ligne**.

Les données de collection proviennent du projet communautaire
[jeanropke/RDR2CollectorsMap](https://github.com/jeanropke/RDR2CollectorsMap)
(domaine public) et sont synchronisées automatiquement chaque jour, après validation
et tests. Le code de l’application est une réécriture complète en TypeScript.

> Red Dead Redemption 2 et Red Dead Online sont des marques de Rockstar Games.
> Ce projet n’est ni affilié ni approuvé par Rockstar Games.

## Fonctionnalités

- **Carte interactive** (Leaflet) : 1 586 emplacements, seuls ceux du cycle du jour sont
  affichés ; fond officiel Rockstar, tuiles personnalisées, ou **carte schématique
  vectorielle hors ligne** dessinée sous les tuiles (filet de sécurité automatique).
- **Cycles** : calendrier publié + mise à jour en ligne + saisie manuelle ; compte à rebours
  jusqu’à la réinitialisation (minuit UTC), navigation J-7 … J+1, alerte « même cycle qu’hier ».
- **Collection** : marquer un emplacement comme récupéré, inventaire par objet (+/−),
  remise à zéro quotidienne optionnelle, filtres (tous / collection hebdo / objets manquants).
- **Progression** : emplacements du jour, objets possédés, valeur de l’inventaire,
  collections complètes, progression par collection.
- **Collection hebdomadaire** et **Madame Nazar** : détection en ligne (services
  communautaires) ou choix manuel.
- **Couches** : cartes au trésor, animaux légendaires, voyage rapide, routes/voies ferrées,
  repères personnels (appui long / clic droit) avec titre, note et couleur.
- **Itinéraire** : ordre de visite optimisé (plus proche voisin + 2-opt) des emplacements
  non récupérés.
- **Recherche** instantanée insensible aux accents (objets, catégories, lieux, repères),
  raccourci `/`.
- **Personnalisation** : langue FR/EN, taille/opacité des marqueurs, couleur par catégorie,
  affichage des objets récupérés (estompés/masqués), réduction des animations.
- **Sauvegarde** : export/import JSON, sauvegarde automatique avant toute réinitialisation,
  données corrompues conservées (jamais effacées silencieusement).
- **PWA** : installable (iPadOS, Android, ordinateur), fonctionne hors ligne après la première
  visite, indicateur de connexion, mise à jour proposée quand une nouvelle version est publiée.

Détails : [docs/FEATURES.md](docs/FEATURES.md).

## Démarrage rapide

Prérequis : **Node.js ≥ 22.18** (exécute les scripts TypeScript nativement).

```bash
npm ci
npm run dev          # http://localhost:5173 (génère d’abord les données : npm run data)
npm run build        # données + vérification TypeScript + bundle dans dist/
npm run preview      # sert dist/ sur http://localhost:4173 (service worker actif)
```

## Qualité

```bash
npm run check        # ESLint + TypeScript strict + tests unitaires/intégration (Vitest)
npm run test:e2e     # Playwright : bureau, iPad, téléphone, hors ligne, PWA (après npm run build)
npm run verify:dist  # contrôle de sécurité du bundle avant publication
```

Voir [docs/TESTING.md](docs/TESTING.md).

## Données upstream

```bash
npm run upstream:sync            # récupère, valide et vend les données upstream (jamais le code)
npm run upstream:sync -- --check # vérifie sans rien écrire
npm run upstream:report          # rapport des évolutions upstream à examiner
```

Automatisé par GitHub Actions (synchronisation 2×/jour, veille hebdomadaire).
Voir [docs/UPSTREAM.md](docs/UPSTREAM.md).

## Documentation

| Document | Contenu |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, modules, flux de données |
| [docs/FEATURES.md](docs/FEATURES.md) | Fonctionnalités et comparaison avec le projet original |
| [docs/OFFLINE.md](docs/OFFLINE.md) | PWA, cache, mode hors ligne et ses limites |
| [docs/UPSTREAM.md](docs/UPSTREAM.md) | Suivi et intégration des évolutions upstream |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Déploiement GitHub Pages et alternatives |
| [docs/TESTING.md](docs/TESTING.md) | Stratégie et exécution des tests |
| [docs/SECURITY.md](docs/SECURITY.md) | Sécurité, vie privée, CSP |
| [docs/LICENSING.md](docs/LICENSING.md) | Licences du code, des données et des ressources |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Conventions de développement |
| [CHANGELOG.md](CHANGELOG.md) | Historique des versions |
