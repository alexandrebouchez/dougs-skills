
# Éditer un devis

Modifie un brouillon (DRAFT) ou un devis émis (PENDING). **Refuse les devis FINALIZED** (signés, verrouillés). Le PUT préserve le statut existant — pas de promotion DRAFT → PENDING déclenchée par cette commande.

## Identifier

UUID, numéro ("41"), ou description ("le devis Acme"). Si pas un UUID, lister via `/dougs list-quotes` pour trouver l'UUID correspondant.

## Étape 1 — Charger le devis

Le devis peut être un DRAFT (brouillon, accessible via `get-draft`) ou un PENDING/FINALIZED (accessible via `view-quote`). On essaie `view-quote` d'abord, on bascule sur `get-draft` si l'API répond `should not be a draft`.

```bash
if node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" view-quote "$QUOTE_UUID" > /tmp/dougs-quote.json 2>/tmp/dougs-err; then
  echo "Chargé via /quotes (PENDING ou FINALIZED)"
else
  if grep -q "should not be a draft" /tmp/dougs-err; then
    node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" get-draft "$QUOTE_UUID" > /tmp/dougs-quote.json
    echo "Chargé via /quote-drafts (DRAFT)"
  else
    cat /tmp/dougs-err >&2; exit 1
  fi
fi
```

## Étape 2 — Vérifier le statut

```bash
STATUS=$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync("/tmp/dougs-quote.json","utf8")).status)')
echo "Statut : $STATUS"
```

**Si `STATUS === FINALIZED` → REFUSER.** Message : « Ce devis est finalisé (signé) et ne peut plus être modifié. Crée un nouveau devis si besoin. »

**Si `STATUS === PENDING` → AVERTIR explicitement** avant d'éditer : « Ce devis est déjà émis. Le client peut avoir reçu la version actuelle. Toute modification réécrira la version chez Dougs. Continuer ? » Attendre un « oui » explicite.

## Étape 3 — Appliquer les modifications

Modifier l'objet en mémoire puis l'écrire dans `/tmp/dougs-payload.json`. **Ne pas toucher au champ `status`** — il sera préservé par le PUT.

- `subject` : `quote.subject = newSubject`
- Ajouter ligne : `quote.lines.push(newLine)` — champs requis : `title, description, unit, quantity, unitAmount, vatRate, discount=0, discountUnit='%', reference='', amount=qty*unitAmount, discountInEuros=0, isPriceWithVat=false`
- Supprimer ligne : `quote.lines.splice(index, 1)`
- Modifier ligne : `quote.lines[i] = { ...quote.lines[i], ...changes }`
- Client : merger dans `quote.clientData` (ne pas écraser entièrement)
- Dates : `quote.date`, `quote.expirationDate`
- **Champs immuables** (jamais toucher) : `id`, `uuid`, `companyId`, `number`, `numberPrefix`, `status`, `createdAt`, `updatedAt`, `finalizedAt`, `file`, `mailRequests`.

Exemple — ajouter une ligne :

```bash
node -e '
const fs = require("node:fs");
const q = JSON.parse(fs.readFileSync("/tmp/dougs-quote.json", "utf8"));
q.lines.push({
  title: "Nouveau service",
  description: "",
  unit: "forfait",
  quantity: 1,
  unitAmount: 500,
  vatRate: 0.2,
  discount: 0,
  discountUnit: "%",
  reference: "",
  amount: 500,
  discountInEuros: 0,
  isPriceWithVat: false
});
fs.writeFileSync("/tmp/dougs-payload.json", JSON.stringify(q));
'
```

## Étape 4 — Valider

```bash
cat /tmp/dougs-payload.json | node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-quote.mjs"
```

## Étape 5 — Diff et confirmation

```
Modifications sur devis [NUMERO] (statut : [STATUS]) :
- Sujet : "ancien" → "nouveau"
- Ligne ajoutée : [TITLE] × [QTY] @ [PRICE]€
- Total TTC : [ANCIEN]€ → [NOUVEAU]€

Confirmer ? (oui/non)
```

Si `[STATUS] === PENDING`, ajouter un rappel : « Ce devis est déjà émis chez Dougs — la version sera réécrite. »

## Étape 6 — Sauvegarder

```bash
cat /tmp/dougs-payload.json | node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" update-quote "$QUOTE_UUID"
```

## Guardrails

- JAMAIS modifier un devis FINALIZED.
- Le PUT envoie l'objet COMPLET (pas de diff partiel).
- Le `status` original est préservé (DRAFT reste DRAFT, PENDING reste PENDING).
- Confirmation utilisateur obligatoire.
- Si `SESSION_EXPIRED` → `/dougs refresh-session` puis recommencer.
