# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · versions : [SemVer](https://semver.org/lang/fr/).
Les synchronisations automatiques de données upstream (`chore(data)`) ne sont pas listées.

## [1.0.0] — 2026-11-03

Première version : réécriture complète de RDR2CollectorsMap en application PWA personnelle.

### Ajouté
- Carte Leaflet (`CRS.Simple`) avec les 1 586 emplacements upstream, filtrés par cycle du jour.
- Fonds : officiel Rockstar, tuiles personnalisées (https), carte schématique vectorielle
  hors ligne affichée sous les tuiles en secours automatique.
- Cycles : calendrier publié, mise à jour en ligne, saisie manuelle, navigation J-7…J+1,
  compte à rebours UTC, alerte « même cycle qu’hier ».
- Collection : marquage, inventaire, remise à zéro quotidienne, filtres, actions par catégorie.
- Collection hebdomadaire et Madame Nazar (services communautaires ou choix manuel).
- Couches : trésors, légendaires, voyage rapide, routes/voies ferrées, repères personnels.
- Itinéraire optimisé (plus proche voisin + 2-opt).
- Recherche insensible aux accents (objets, catégories, lieux, repères).
- Écran Progrès (jour, objets, valeurs, collections complètes).
- Réglages : FR/EN, marqueurs, couleurs, animations, données en ligne, stockage,
  export/import, réinitialisations avec sauvegarde automatique.
- PWA installable, précache complet, mode hors ligne, invite de mise à jour, indicateur de connexion.
- Persistance versionnée et validée, conservation des données corrompues.
- Synchronisation upstream des données (validée + testée) et veille du code, via GitHub Actions.
- CI : lint, typage, 73 tests Vitest, 45 scénarios Playwright (desktop/iPad/téléphone, hors ligne), audit, vérification du bundle.
- Déploiement GitHub Pages automatisé avec test de fumée.
- Documentation complète (`docs/`).

### Supprimé par rapport à l’original
- Publicité Google AdSense, Sentry, API YouTube intégrée, jQuery/Bootstrap.
- Ressources extraites du jeu (icônes, polices, calques) remplacées par des créations originales.
