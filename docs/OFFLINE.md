# PWA et mode hors ligne

## Installation

| Plateforme | Procédure |
| --- | --- |
| iPad / iPhone (Safari) | Partager › **Sur l’écran d’accueil** |
| Android (Chrome) | Menu › **Installer l’application** (ou bouton dans Réglages) |
| Ordinateur (Chrome, Edge) | Icône d’installation dans la barre d’adresse (ou bouton dans Réglages) |

Le manifeste déclare : nom, icônes 192/512 + icône *maskable*, `display: standalone`,
couleurs du thème, `start_url`/`scope` relatifs (fonctionne sous `/RDR2-Ultimate/`).
Sur iOS, `apple-touch-icon` et les méta `apple-mobile-web-app-*` sont fournis.

## Ce qui fonctionne hors ligne (vérifié par test E2E)

Après **une première visite en ligne** (le service worker précache l’application) :

| Élément | Hors ligne | Mécanisme |
| --- | --- | --- |
| Application (HTML, JS, CSS, polices, icônes) | ✅ | Précache Workbox (≈ 1,5 Mo) |
| Toutes les données de collection, cycles connus, traductions | ✅ | Précache (`data/*.json`) |
| Carte schématique (routes, voies ferrées, villes) | ✅ | Précache (`basemap.json`), rendu canvas |
| Progression, inventaire, repères, réglages | ✅ | `localStorage` (local à l’appareil) |
| Marquer, rechercher, filtrer, itinéraire, statistiques | ✅ | 100 % local |
| Tuiles de carte **déjà consultées** | ✅ (partiel) | Cache d’exécution borné (800 tuiles, 60 jours) |
| Tuiles jamais consultées | ❌ | Non téléchargées en masse (voir limites) |
| Collection hebdo / Nazar / cycles récents en ligne | ⚠️ dernière valeur connue | Mémorisées localement ; Nazar uniquement pour le jour concerné |

Le test `e2e/pwa.spec.ts › works fully offline` vérifie : service worker actif,
passage hors ligne, rechargement, carte et marqueurs affichés, badge « Hors ligne »,
progression conservée, fichiers de données servis depuis le cache.

## Limites assumées

- **Tuiles Rockstar** : elles appartiennent à Rockstar Games. L’application ne les
  télécharge pas en masse et ne les redistribue pas ; seules les tuiles que vous avez
  affichées sont gardées dans le cache de **votre** navigateur (comme le cache HTTP).
  Bouton « Vider le cache des tuiles » dans l’onglet Carte. Hors ligne, les zones jamais
  consultées s’affichent avec la carte schématique.
- **Cycles futurs** : le calendrier upstream couvre une fenêtre glissante (~4 semaines,
  jusqu’à aujourd’hui). Hors ligne pendant plusieurs jours, la date peut sortir du
  calendrier connu : l’application l’indique et propose la saisie manuelle des cycles.
- **Synchronisation** : il n’y a pas de serveur ; la progression reste **sur l’appareil**.
  Pour la transférer : Réglages › Exporter / Importer.
- **Stockage** : l’application demande le stockage persistant (`navigator.storage.persist`).
  Si le navigateur le refuse (Safari peut purger les données d’un site non visité depuis
  longtemps), exportez régulièrement une sauvegarde. Une PWA installée sur l’écran
  d’accueil est mieux protégée sur iPadOS.

## Retour de la connexion

À l’événement `online` :
1. badge « En ligne », message de confirmation ;
2. rafraîchissement des données en ligne (hebdo, Nazar, cycles si le calendrier est incomplet) ;
3. vérification d’une nouvelle version du service worker (aussi toutes les heures).

## Mises à jour de l’application

Stratégie `prompt` : une nouvelle version est téléchargée en arrière-plan, puis un message
« Nouvelle version disponible — Recharger » s’affiche. Rien n’est rechargé de force
(pas de perte de saisie). Les anciens caches sont nettoyés automatiquement.

## Gestion du cache

| Cache | Contenu | Politique |
| --- | --- | --- |
| `workbox-precache-*` | Application + données | Versionné par empreinte, remplacé à chaque déploiement |
| `rdr2u-tiles` | Images cross-origin (tuiles) | CacheFirst, 800 entrées max, 60 jours, purge si quota dépassé |

Les requêtes vers les services communautaires ne passent par aucun cache du service
worker (`no-store`) ; leurs résultats sont mémorisés dans `localStorage`.
