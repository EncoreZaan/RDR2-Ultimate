# Tests

## Commandes

| Commande | Contenu |
| --- | --- |
| `npm run lint` | ESLint (typescript-eslint avec règles typées) |
| `npm run typecheck` | `tsc -b` : app, scripts Node, tests (mode strict) |
| `npm test` | Vitest : génère les données puis lance les tests unitaires et d’intégration |
| `npm run check` | Les trois précédents |
| `npm run build` | Données + typage + bundle |
| `npm run test:e2e` | Playwright sur `dist/` (lancer `npm run build` avant) |
| `npm run verify:dist` | Contrôle de sécurité du bundle |

Playwright utilise Chromium (`npx playwright install chromium` la première fois ; dans
l’environnement de développement cloud, le navigateur est préinstallé).

## Couverture fonctionnelle

### Unitaires (`tests/unit`)
- **normalize** : données réelles upstream (1 586 marqueurs, 17 catégories, identifiants
  uniques, liens objet/marqueur, vidéos YouTube uniquement), erreurs précises sur données
  invalides (catégorie inconnue, coordonnées hors carte, cycle invalide, dates dupliquées,
  liste tronquée), GeoJSON, nettoyage des chaînes.
- **cycles/time** : jours UTC, compte à rebours, jour de Nazar (−6 h), calendrier,
  repli, saisie manuelle, « même cycle qu’hier », fusion des calendriers.
- **storage** : assainissement des réglages (bornes, énumérations, couleurs, URL de tuiles
  sûres), progression, repères, aller-retour, **sauvegarde des documents corrompus**,
  version future refusée, migrations, échec d’écriture (quota), export/import.
- **progress** : marquage + inventaire, plafond, remise à zéro quotidienne, filtres,
  statistiques et collections complètes.
- **search / route / live** : accents et ligatures, classement, itinéraire (visite unique,
  amélioration vs ordre naïf), formats des API communautaires, repli sur la 2ᵉ source,
  délai d’expiration.
- **i18n/describe** : parité des clés FR/EN, interpolation, formats monétaires, noms.
- **upstream** : validation d’un instantané upstream (acceptation / rejet), classement des changements.

### Intégration (`tests/integration/store.test.ts`, jsdom)
Données générées réelles + store + `localStorage` : chargement et résolution des cycles,
**persistance après rechargement** (progression, inventaire, réglages, catégories masquées),
expiration au changement de jour UTC, blocage du marquage hors aujourd’hui,
réinitialisation avec sauvegarde automatique puis restauration, choix manuels hebdo/Nazar,
recherche en français.

### End-to-end (`e2e/`, Playwright — projets *desktop* 1440×900, *ipad* iPad Pro 11, *phone* Pixel 7)
Le réseau est isolé : tuiles bloquées (teste la carte de secours), API communautaires
simulées, date figée au milieu du calendrier livré.
- chargement sans erreur, > 150 marqueurs, carte schématique présente ;
- marquer un emplacement puis recharger (persistance) ;
- recherche insensible aux accents et focalisation ;
- masquer/afficher toutes les catégories ;
- inventaire et écran Progrès ;
- détection en ligne de la collection hebdo et de Nazar ;
- changement de langue persistant ;
- repère par clic droit persistant ;
- export d’une sauvegarde valide ;
- tous les boutons ont un nom accessible ;
- **PWA** : manifeste complet et icônes accessibles, CSP stricte, **fonctionnement hors ligne**
  (service worker, rechargement hors ligne, progression conservée, données en cache) ;
- **responsive** : pas de défilement horizontal, menu utilisable, cibles tactiles ≥ 40 px,
  fiche détail dans l’écran, captures par appareil (`test-results/`).

## Dernière exécution locale (2026-11-03)

- Vitest : **73 tests réussis** (8 fichiers).
- Playwright : **43 réussis**, 2 ignorés volontairement (le test hors ligne ne tourne que
  sur le projet *desktop*).
- ESLint et TypeScript : 0 erreur. `verify:dist` : OK.

La CI (`.github/workflows/ci.yml`) exécute l’ensemble à chaque push et pull request.

## Limites

- Les tests E2E tournent sur Chromium uniquement (WebKit non installé dans l’environnement) ;
  le profil « iPad » émule la taille, le tactile et l’agent utilisateur, pas le moteur Safari.
- Les vraies tuiles Rockstar et les vraies API communautaires ne sont pas appelées en test
  (réseau isolé, et hôtes inaccessibles depuis l’environnement de développement).
