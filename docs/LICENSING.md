# Licences et droits

## Ce dépôt

Le code de ce dépôt (application, scripts, tests, documentation) appartient à son
propriétaire et n’est pas publié sous licence libre (`"license": "UNLICENSED"` dans
`package.json`, convention npm pour un projet privé). Le propriétaire peut à tout moment
choisir une licence (par exemple l’Unlicense, comme l’original).

## Composants tiers

| Élément | Origine | Licence | Usage |
| --- | --- | --- | --- |
| Données de collection, cycles, collections hebdo, trésors, légendaires, Nazar, réseau routier (`upstream/data`) | jeanropke/RDR2CollectorsMap et contributeurs | **Unlicense** (domaine public), copie dans `upstream/LICENSE.upstream` | Redistribution autorisée ; attribution courtoise affichée sur la carte |
| Traductions `upstream/langs/{en,fr}.json` | Communauté (Crowdin du projet original), publiées dans le dépôt Unlicense | Unlicense (fichiers du dépôt) | Filtrées aux clés utiles |
| Preact, @preact/signals | preactjs | MIT | Exécution |
| Leaflet | Volodymyr Agafonkin & contributeurs | BSD-2-Clause | Exécution (mention « Leaflet » dans l’attribution de la carte) |
| Cinzel, Inter | Google Fonts via Fontsource | SIL Open Font License 1.1 | Auto-hébergées |
| Workbox (via vite-plugin-pwa) | Google | MIT | Service worker |
| Outillage (Vite, TypeScript, ESLint, Vitest, Playwright…) | divers | MIT / Apache-2.0 / BSD | Développement uniquement |

## Ce qui n’est volontairement PAS inclus

| Élément de l’original | Raison |
| --- | --- |
| Icônes d’objets `assets/images/icons/game/*`, fonds, images d’interface | Extraites du jeu : propriété de Rockstar Games, pas de droit de redistribution |
| Polices RDR (`RDRLino`, `RDRCatalogueBold`) | Dérivées du jeu, licence inconnue |
| Tuiles « détaillé / sombre / noir » (`map-tiles.b-cdn.net`) | Hébergées sur le CDN payant du mainteneur upstream ; les utiliser depuis un autre site consommerait sa bande passante |
| Calques `assets/overlays` | Images dérivées du jeu |
| Code JS/CSS upstream | Non nécessaire : réécriture complète (il est pourtant dans le domaine public) |

## Carte officielle Rockstar

Le fond « officiel » charge, à la demande, les tuiles publiques que Rockstar Games sert
pour sa propre carte en ligne (comme le fait l’original), avec la mention « © Rockstar
Games ». Elles ne sont **ni copiées dans ce dépôt, ni téléchargées en masse, ni
redistribuées** ; le navigateur de l’utilisateur garde seulement celles déjà affichées
(cache borné, supprimable). Si Rockstar retirait ou interdisait ce service, il suffirait
de choisir le fond schématique ou des tuiles personnalisées.

## Marques

« Red Dead Redemption », « Red Dead Online » et « Rockstar Games » sont des marques de
Take-Two Interactive / Rockstar Games. Ce projet personnel n’est ni affilié ni approuvé
par Rockstar Games. Le logo de l’application (étoile-boussole) est une création originale.
