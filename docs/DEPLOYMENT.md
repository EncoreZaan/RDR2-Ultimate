# Déploiement

L’application est un site **100 % statique** (`dist/`, ≈ 1,5 Mo). N’importe quel hébergeur
statique en HTTPS convient (HTTPS obligatoire pour le service worker et l’installation PWA).

## Option 1 — GitHub Pages (workflow `deploy.yml`)

Déclenché à chaque push sur `main`, manuellement, et après chaque synchronisation upstream.

1. `npm ci` puis `npm run build` avec `BASE_PATH=/<nom du dépôt>/` (le site est servi sous
   `https://encorezaan.github.io/RDR2-Ultimate/`).
2. `npm run verify:dist` : refuse de publier si le bundle contient des source maps, des
   fichiers inattendus, des motifs de secrets ou des chemins sources.
3. `actions/upload-pages-artifact` + `actions/deploy-pages` (OIDC, aucun secret).
4. Test de fumée : la page, le manifeste, `data/cycles.json` et `sw.js` doivent répondre.

### Condition de forfait (vérifiée)

GitHub Pages n’est disponible pour un **dépôt privé** qu’avec GitHub **Pro, Team ou
Enterprise**. Avec GitHub Free, Pages ne fonctionne que pour les dépôts publics.
L’état constaté pour ce dépôt est consigné dans la section *État actuel* ci-dessous.

### Activer Pages (action humaine, une seule fois)

*Settings › Pages › Build and deployment › Source : **GitHub Actions***, puis relancer
*Actions › Deploy (GitHub Pages) › Run workflow*. Le jeton `GITHUB_TOKEN` d’un workflow ne
peut pas activer Pages lui-même (droit administrateur requis).

> Rappel : un site Pages issu d’un dépôt privé est **public** (sauf Enterprise Cloud avec
> visibilité privée). Il ne publie que le bundle statique — voir docs/SECURITY.md.
> Ne rendez jamais le dépôt public pour contourner la limite de forfait.

## Option 2 — Cloudflare Pages (gratuit, compatible dépôt privé) — workflow `deploy-cloudflare.yml`

Inactif tant que les secrets ne sont pas définis (le job se termine en « skip »).

1. Créer un compte Cloudflare gratuit.
2. *My Profile › API Tokens › Create Token* : modèle personnalisé, permission
   **Account › Cloudflare Pages › Edit**.
3. Dans GitHub : *Settings › Secrets and variables › Actions* → ajouter
   `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` (identifiant visible sur le tableau de bord
   Cloudflare). **Ne jamais coller ces valeurs dans un ticket ou un chat.**
4. *Actions › Deploy (Cloudflare Pages — optional) › Run workflow*. Le projet
   `rdr2-ultimate` est créé au premier passage ; l’URL est `https://rdr2-ultimate.pages.dev`.
5. Optionnel : **Cloudflare Zero Trust › Access** (gratuit jusqu’à 50 utilisateurs) pour
   réserver le site à votre adresse e-mail.

Autres hébergeurs gratuits compatibles avec un dépôt privé (compte requis) : Netlify,
Vercel (Hobby). Construire avec `BASE_PATH=/` et publier `dist/`.

## Option 3 — Local / réseau domestique

```bash
npm ci && npm run build && npm run preview -- --host
```

Le service worker et l’installation nécessitent HTTPS (ou `localhost`).

## Mises à jour en production

- Chaque déploiement produit un nouveau service worker ; les utilisateurs voient
  « Nouvelle version disponible — Recharger ».
- Les données upstream sont synchronisées 2×/jour (voir UPSTREAM.md) puis redéployées.

## Protection de la branche `main` (action humaine recommandée)

*Settings › Branches › Add rule* (ou *Rulesets*) pour `main` :
- exiger une pull request avant fusion ;
- exiger les contrôles **CI / Lint · Types · Unit tests · Build** et
  **CI / End-to-end** ;
- interdire les force-push et la suppression.

Pour que la synchronisation automatique puisse continuer à pousser sur `main`, ajouter
**GitHub Actions** (ou l’app `github-actions`) à la liste de contournement du ruleset.
Sur un dépôt privé avec GitHub Free, les règles de protection de branche ne sont pas
disponibles (fonctionnalité Pro/Team) : la CI reste exécutée sur chaque PR.

## État actuel

_Renseigné après la mise en production — voir ci-dessous._
