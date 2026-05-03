
# Setup Dougs

## Recommandé : wizard npx

Depuis la racine de ton projet :

```bash
npx @drivenlabs/dougs
```

Le wizard te demande tes infos d'entreprise (company_id, mentions légales, contact) et écrit `.claude/dougs.local.md` pour toi.

## Setup manuel

Si tu préfères config manuelle, copier le template :

```bash
mkdir -p .claude
cp "${CLAUDE_PLUGIN_ROOT}/.claude/dougs.local.md.template" .claude/dougs.local.md
```

Puis éditer `.claude/dougs.local.md` et remplir `company_id`, infos légales et contact. Le `company_id` se trouve dans l'URL Dougs : `app.dougs.fr/app/c/<ID>/...`.

## Initialiser la session

Une fois la config en place, lancer `/dougs refresh-session` pour extraire le cookie de session depuis l'onglet Chrome authentifié sur `app.dougs.fr`.

## Vérifier

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" me --pretty
```

Doit afficher l'email connecté et `preferredCompanyId`. Si `SESSION_EXPIRED` → lancer `/dougs refresh-session`.

## Confirmer

```
Dougs configuré : [EMAIL] | Company [ID]
Plugin prêt — utilise /dougs list-quotes, /dougs create-quote, etc.
```
