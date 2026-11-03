# Sécurité et vie privée

## Vie privée

- **Aucune publicité, aucun traceur, aucune télémétrie, aucun cookie.** (L’original
  embarquait Google AdSense, Sentry et l’API YouTube : tous supprimés.)
- Aucune donnée personnelle ne quitte l’appareil : réglages, progression et repères sont
  dans le `localStorage` du navigateur.
- Requêtes externes possibles, toutes anonymes (`credentials: 'omit'`, `referrerPolicy: no-referrer`) :

| Hôte | Pourquoi | Désactivable |
| --- | --- | --- |
| `s.rsg.sc` | Tuiles de la carte officielle Rockstar | Oui : fond « schématique » |
| Hôte de vos tuiles personnalisées | Si vous en configurez | — |
| `pepegapi.jeanropke.net`, `rdo-dailies.com` | Collection hebdo, position de Nazar (mêmes services que l’original) | Oui : Réglages › Données en ligne |
| `raw.githubusercontent.com` | Calendrier des cycles le plus récent, si le local est incomplet | Oui (même option) |

- `<meta name="robots" content="noindex">` : le site n’est pas destiné à être indexé.

## Mesures techniques

- **Content-Security-Policy** injectée au build : `default-src 'self'`, `script-src 'self'`
  (aucun script inline ni tiers), `connect-src` limité aux hôtes ci-dessus, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'none'`. `style-src 'unsafe-inline'` est nécessaire
  à Leaflet (positionnement inline). Vérifiée par test E2E.
- **Aucun HTML non maîtrisé** : les chaînes du jeu sont nettoyées au build (balises et
  marqueurs supprimés) et rendues comme texte par Preact ; les seuls `innerHTML` sont nos
  pictogrammes SVG statiques et des libellés passés par `escapeHtml`.
- **Entrées validées** : réglages, progression, repères et fichiers de sauvegarde sont
  assainis champ par champ (types, bornes, longueurs, couleurs hexadécimales).
  Les URL de tuiles personnalisées doivent être en `https:` (ou relatives) et contenir
  `{z}`, `{x}`, `{y}`. Les liens vidéo ne sont conservés que s’ils pointent vers YouTube,
  et s’ouvrent avec `rel="noopener noreferrer"`.
- **Données upstream validées** avant intégration (voir UPSTREAM.md) : un fichier malformé
  ou malveillant est rejeté et rien n’est publié.
- **Bundle vérifié avant publication** (`scripts/verify-dist.ts`) : types de fichiers
  autorisés uniquement, pas de source maps (désactivées), pas de fichiers cachés, recherche
  de motifs de secrets (jetons GitHub, AWS, clés privées, clés API) et de chemins sources,
  CSP présente, budget de taille.
- **Dépendances** : 3 dépendances d’exécution. `npm audit --omit=dev --audit-level=high`
  bloque la CI. Dependabot (npm hebdomadaire, Actions mensuel).
  Au 2026-11-03 : **0 vulnérabilité** en production ; des alertes *moderate* existent dans
  l’outillage de développement (minimatch via ESLint, ejs via workbox-build) — sans impact
  sur le site publié, à résorber par les mises à jour Dependabot.
- **Workflows GitHub** : permissions minimales par workflow (`contents: read` par défaut),
  aucune entrée utilisateur interpolée dans un script shell (le SHA optionnel passe par une
  variable d’environnement et est validé par regex).

## Secrets

- Le projet **n’utilise aucun secret** : déploiement via le jeton éphémère `GITHUB_TOKEN`
  et OIDC de GitHub Pages ; aucune clé d’API.
- `.env*` est ignoré par Git. Ne jamais commiter de jeton ; s’il en faut un un jour,
  utiliser *Settings › Secrets and variables › Actions*.

## Dépôt privé et site public

Un site GitHub Pages issu d’un dépôt privé est **public** (sauf GitHub Enterprise Cloud
avec contrôle d’accès). Le site ne contient que le bundle statique (code minifié, données du
domaine public, icônes originales) : ni sources, ni historique Git, ni documentation, ni
secrets — ce que `verify-dist` contrôle à chaque déploiement.

## Signaler un problème

Ouvrir un ticket privé dans le dépôt (ou *Security › Report a vulnerability* si activé).
