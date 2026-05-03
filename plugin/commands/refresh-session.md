---
description: "Extraire/renouveler le cookie de session Dougs depuis un onglet Chrome authentifié"
argument-hint: ""
---

# Refresh Dougs session cookie

Extrait le cookie de session HttpOnly depuis un onglet Chrome connecté à `app.dougs.fr` et l'écrit dans `~/.dougs-session` (perms 600). Toutes les commandes Dougs utilisent ensuite ce cookie via fetch direct (rapide).

## Prérequis

- Chrome ouvert avec un onglet sur `app.dougs.fr`, **utilisateur connecté** (Google SSO)
- Outils Chrome MCP disponibles (`mcp__claude-in-chrome__*`) — utilisés **uniquement** par cette commande pour l'extraction du cookie. Toutes les autres commandes Dougs utilisent fetch direct via le CLI Node.

## Étapes

### 1. Charger les tools Chrome MCP

Les tools MCP sont chargés à la demande. Avant tout appel, invoquer `ToolSearch` :

```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_network_requests
```

### 2. Trouver l'onglet Dougs

Appeler `mcp__claude-in-chrome__tabs_context_mcp`. Chercher un tab dont l'URL contient `app.dougs.fr`.

Si aucun onglet trouvé → demander à l'utilisateur de se connecter sur `app.dougs.fr` (Google SSO) puis relancer la commande.

### 3. Déclencher une requête API fraîche

Dans l'onglet Dougs, exécuter via `mcp__claude-in-chrome__javascript_tool` :

```javascript
fetch('/users/me', { credentials: 'include' })
  .then(r => r.json())
  .then(d => { window.__dougsRefresh = JSON.stringify({ ok: true, email: d.email }); })
  .catch(e => { window.__dougsRefresh = JSON.stringify({ ok: false, error: String(e) }); });
```

Vérifier `window.__dougsRefresh` (un second `javascript_tool` appel : `window.__dougsRefresh`) — doit montrer une string JSON avec `ok: true` et un email. Si `ok: false` ou statut 401 → session Chrome expirée, demander à l'utilisateur de se reconnecter.

### 4. Extraire le cookie depuis le trafic réseau

Appeler `mcp__claude-in-chrome__read_network_requests` filtré sur `app.dougs.fr`. Chercher la requête `GET /users/me` la plus récente. Lire le header `Cookie` de la requête.

Si le tool n'expose pas le header `Cookie` (selon la sandbox Chrome MCP) :

**Fallback manuel** : demander à l'utilisateur d'ouvrir DevTools (Cmd+Opt+I) → onglet Network → cliquer sur la requête `users/me` → onglet Headers → section Request Headers → copier la valeur complète du header `Cookie` et la coller dans la conversation.

### 5. Écrire le cookie

Via Bash :

```bash
COOKIE='<valeur-complete-du-cookie>'
printf '%s\n' "$COOKIE" > ~/.dougs-session
chmod 600 ~/.dougs-session
```

### 6. Valider

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" me --pretty
```

Doit afficher `{"id":...,"email":"...","preferredCompanyId":<your_id>,...}`. Si erreur `SESSION_EXPIRED` → la valeur copiée est incomplète, recommencer.

### 7. Confirmer à l'utilisateur

```
Session Dougs renouvelée — connecté en tant que [EMAIL] (company [ID]).
Cookie stocké dans ~/.dougs-session (perms 600).
```

## Sécurité

- Le cookie est stocké en plain text mais en perms 600 (lecture seule pour l'utilisateur).
- Ne jamais committer `~/.dougs-session` (hors de tout repo de toute façon).
- Ne jamais l'afficher en clair dans la conversation (c'est une clé d'accès complète à Dougs).
