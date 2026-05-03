
# Refresh Dougs session cookie

Extrait le cookie de session HttpOnly depuis un onglet Chrome connecté à `app.dougs.fr` et l'écrit dans `~/.dougs-session` (perms 0600). Toutes les autres commandes Dougs utilisent ensuite ce cookie via fetch direct (rapide).

## Prérequis

- Chrome ouvert avec un onglet sur `app.dougs.fr`, **utilisateur connecté** (Google SSO)

Deux méthodes pour extraire le cookie : la méthode A (DevTools manuel) marche partout. La méthode B (Chrome MCP) est plus fluide mais nécessite que `claude-in-chrome` MCP soit installé.

## Méthode A — DevTools manuel (universelle)

Marche dans n'importe quel environnement Claude Code, aucune dépendance.

### 1. Ouvrir les DevTools sur l'onglet Dougs

Sur l'onglet `app.dougs.fr` actif, presser `Cmd+Opt+I` (macOS) ou `Ctrl+Shift+I` (Windows/Linux).

### 2. Capturer la requête `/users/me`

- Onglet **Network**
- Recharger la page si besoin (Cmd+R) — une requête `users/me` apparaît
- Cliquer dessus → onglet **Headers** → section **Request Headers**
- Copier la valeur complète du header `Cookie:` (commence souvent par `auth_session=...`, plusieurs centaines de caractères)

### 3. Coller la valeur dans la conversation

Demander à l'utilisateur de coller le cookie. **Ne jamais l'afficher en clair en réponse** — le cookie est une clé d'accès complète à Dougs.

### 4. Écrire le cookie

```bash
COOKIE='<valeur-complete-du-cookie>'
printf '%s\n' "$COOKIE" > ~/.dougs-session
chmod 600 ~/.dougs-session
```

### 5. Valider

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" me --pretty
```

Doit afficher `{"id":...,"email":"...","preferredCompanyId":<your_id>,...}`. Si erreur `SESSION_EXPIRED` → la valeur copiée est incomplète, recommencer.

## Méthode B — Chrome MCP (si claude-in-chrome installé)

Plus fluide, pas de copier-coller manuel. Nécessite le MCP `claude-in-chrome`.

### 1. Charger les tools Chrome MCP

```
ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_network_requests
```

### 2. Trouver l'onglet Dougs

Appeler `mcp__claude-in-chrome__tabs_context_mcp`. Chercher un tab dont l'URL contient `app.dougs.fr`. Si aucun → demander à l'utilisateur d'ouvrir un onglet authentifié.

### 3. Déclencher une requête API fraîche

```javascript
fetch('/users/me', { credentials: 'include' })
  .then(r => r.json())
  .then(d => { window.__dougsRefresh = JSON.stringify({ ok: true, email: d.email }); })
  .catch(e => { window.__dougsRefresh = JSON.stringify({ ok: false, error: String(e) }); });
```

Vérifier `window.__dougsRefresh` doit afficher `ok: true` + un email. Si `ok: false` ou 401 → session Chrome expirée, demander à l'utilisateur de se reconnecter.

### 4. Lire le cookie depuis le trafic réseau

Appeler `mcp__claude-in-chrome__read_network_requests` filtré sur `app.dougs.fr`. Lire le header `Cookie` de la requête `/users/me` la plus récente.

**Note** : selon la sandbox du MCP, le header `Cookie` peut ne pas être exposé. Si c'est le cas, basculer sur la méthode A (DevTools manuel).

### 5–6. Écrire et valider

Identiques à la méthode A (étapes 4–5).

## Confirmer à l'utilisateur

```
Session Dougs renouvelée — connecté en tant que [EMAIL] (company [ID]).
Cookie stocké dans ~/.dougs-session (perms 0600).
```

## Sécurité

- Le cookie est stocké en clair mais en perms 0600 (lecture seule pour l'utilisateur courant).
- Ne jamais committer `~/.dougs-session` (`.gitignore` du plugin l'exclut, mais le fichier vit hors de tout repo).
- Ne jamais l'afficher en clair dans la conversation — c'est une clé d'accès complète à Dougs.
