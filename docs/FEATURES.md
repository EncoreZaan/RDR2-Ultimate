# Fonctionnalités

## Utilisation

| Action | Comment |
| --- | --- |
| Ouvrir/fermer le menu | bouton ☰ ou touche `M` |
| Rechercher | champ en haut ou touche `/` ; ↑ ↓ Entrée ; Échap pour fermer |
| Voir un emplacement | toucher/cliquer un marqueur → fiche détail |
| Marquer récupéré | bouton de la fiche, case dans la liste de la catégorie, ou « Tout marquer » |
| Poser un repère | appui long (tactile) ou clic droit sur la carte |
| Partager un emplacement | bouton lien de la fiche (`…#m=<id>` ouvre directement le marqueur) |
| Changer de jour | flèches ‹ › du panneau Collection (J-7 à J+1, marquage désactivé hors aujourd’hui) |

## Détail par domaine

### Carte
- 3 fonds : **officiel Rockstar Games** (tuiles publiques chargées depuis le site de Rockstar,
  non redistribuées), **tuiles personnalisées** (modèle d’URL https au format Leaflet, par
  exemple des tuiles auto-hébergées selon les instructions du projet RDOMap),
  **schématique** (réseau routier/ferré vectoriel, noms des régions et villes, 100 % hors ligne).
- La carte schématique est **toujours dessinée sous les tuiles** : si elles ne chargent pas
  (hors ligne, fournisseur indisponible), la carte reste exploitable ; un message prévient.
- Marqueurs en forme d’épingle avec pictogramme par catégorie, badges « pelle / détecteur »
  et « en hauteur / en contrebas », halo doré pour les objets de la collection hebdo,
  estompés ou masqués une fois récupérés.
- Couches : voyage rapide, Madame Nazar, cartes au trésor (zone + coffres possibles),
  animaux légendaires (zones), routes et voies ferrées au-dessus des tuiles, repères.
- Contrôles tactiles : pincer/zoomer, boutons +/− et recentrage de 44 px.

### Cycles et collection
- Cycles du jour pour les 10 groupes, source affichée (calendrier publié, mise à jour en
  ligne, manuel, inconnu), alerte si un groupe garde le même cycle que la veille.
- Saisie manuelle des cycles (remplace le calendrier) et retour au calendrier en un clic.
- Liste des 17 catégories : visibilité, cycle, compteur du jour, barre de progression,
  emplacements du jour (cases à cocher + localisation), inventaire par objet (+/−).
- Filtres : tous, collection hebdomadaire, objets manquants (inventaire à 0 + emplacements
  aléatoires).
- Remise à zéro quotidienne (minuit UTC) des emplacements récupérés — désactivable.
- Inventaire mis à jour automatiquement lors du marquage (désactivable), plafond réglable (1–99).

### Hebdo, Nazar, progression
- Collection hebdomadaire : détectée en ligne ou choisie parmi les 46 collections ;
  objets possédés, localisation de ceux présents aujourd’hui, valeur.
- Madame Nazar : position du jour détectée en ligne ou choisie (désignée par la ville la
  plus proche), localisation sur la carte.
- Progression : emplacements du jour, objets possédés / 184, valeur de l’inventaire,
  valeur des collections complètes, progression des 17 collections.

### Personnalisation et données
- Langue FR/EN (interface + noms et descriptions du jeu issus des traductions upstream).
- Taille et opacité des marqueurs, couleur de chaque catégorie, badges d’outils, animations réduites.
- Export/import JSON de tout (réglages, progression, repères) ; sauvegarde automatique
  téléchargée avant chaque réinitialisation ; réinitialisations séparées (jour, inventaire, tout).
- État du stockage (persistant ou non, espace utilisé), version des données upstream.
- Bouton d’installation (Chrome/Edge/Android) ou instructions (iPad/iPhone).

## Comparaison avec RDR2CollectorsMap

| Fonction de l’original | Ici | Remarque |
| --- | --- | --- |
| Marqueurs par cycle, 17 catégories | ✅ | Mêmes données |
| Calendrier des cycles, navigation jours, cycles personnalisés | ✅ | + alerte « même cycle » |
| Marquer récupéré, remise à zéro quotidienne | ✅ | Sémantique simplifiée (par emplacement) |
| Inventaire, taille de pile | ✅ | |
| Collection hebdo, Madame Nazar (API communautaires) | ✅ | Désactivable |
| Trésors, légendaires, voyage rapide | ✅ | |
| Repères personnels, export/import | ✅ | Sauvegarde unique (réglages + progression + repères) |
| Recherche | ✅ | Insensible aux accents, lieux et repères |
| Générateur d’itinéraire | ✅ (simplifié) | 2-opt à vol d’oiseau, sans graphe routier |
| Couleurs des marqueurs | ✅ | Par catégorie |
| Valeurs / collections complètes | ✅ | Écran Progrès |
| 34 langues (Crowdin) | ⚠️ FR + EN | Autres langues ajoutables (fichiers upstream) |
| Tables de butin, événements libres (FME), import d’inventaire RDO | ❌ | Non prioritaires ; voir UPSTREAM pour les réintégrer |
| Fonds « détaillé / sombre / noir » | ❌ | Hébergés sur le CDN payant du mainteneur : non utilisés ; remplaçables par « tuiles personnalisées » |
| Publicité AdSense, Sentry, API YouTube intégrée | 🚫 supprimés | Vidéos ouvertes en lien externe |
| Icônes, polices et images extraites du jeu | 🚫 remplacées | Pictogrammes et thème originaux |
| Fonctionnement hors ligne | ➕ nouveau | Précache complet + carte schématique |
