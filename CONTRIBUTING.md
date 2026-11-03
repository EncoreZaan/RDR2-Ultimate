# Contribuer

## Environnement

- Node.js ≥ 22.18 (`.nvmrc` : 22) — les scripts `scripts/*.ts` s’exécutent nativement.
- `npm ci`, puis `npm run dev`.

## Branches

| Branche | Rôle |
| --- | --- |
| `main` | Production : chaque push est déployé sur GitHub Pages. Protégée (voir DEPLOYMENT). |
| `dev` | Intégration des travaux en cours |
| `feature/…`, `fix/…` | Une évolution = une branche, PR vers `main` |
| commits `github-actions[bot]` sur `main` | Synchronisation automatique des données upstream (uniquement `upstream/`) |

## Avant d’ouvrir une PR

```bash
npm run check                    # lint + types + tests unitaires/intégration
npm run build && npm run test:e2e
```

La CI rejoue tout cela ; la PR doit être verte avant fusion.

## Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/fr/) —
  `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore(data):`, `refactor:`…
- **TypeScript strict**, pas de `any`, pas d’assertion non nécessaire (ESLint le signale).
- Logique métier pure dans `src/core` ou `src/data`, **avec tests** ; composants dans `src/ui`.
- Textes d’interface dans `src/core/i18n.ts` (FR et EN obligatoires, vérifié par test).
- Pas de nouvelle dépendance d’exécution sans justification (taille, maintenance, licence).
- Jamais de ressource extraite du jeu, de service payant, de traceur ou de secret.
- Accessibilité : nom accessible sur chaque bouton, navigation clavier, cibles tactiles ≥ 40 px.

## Données

- Ne pas éditer `upstream/` à la main : utiliser `npm run upstream:sync`.
- `public/data/` est généré (`npm run data`) et ignoré par Git.

## Publier une version

1. Mettre à jour `CHANGELOG.md` et `version` dans `package.json`.
2. PR vers `main` → fusion → déploiement automatique.
3. Optionnel : tag `vX.Y.Z`.
