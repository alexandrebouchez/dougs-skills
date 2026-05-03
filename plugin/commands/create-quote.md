---
description: "Créer un brouillon de devis Dougs"
argument-hint: "[client] [--subject OBJET] [--lines JSON]"
---

# Créer un brouillon de devis

Cette commande crée un **brouillon (DRAFT)** dans Dougs. Le brouillon apparaît dans la section *Brouillons* de l'UI Dougs et reste modifiable. **Le plugin n'émet jamais le devis automatiquement** — c'est à l'utilisateur de cliquer sur « Émettre » / « Finaliser » dans l'UI quand il est prêt à l'envoyer au client.

## Pourquoi brouillon-only

L'API Dougs distingue trois statuts :

- `DRAFT` — brouillon, modifiable, pas de PDF officiel
- `PENDING` — émis, modifiable, PDF généré
- `FINALIZED` — signé/validé, verrouillé (irréversible)

La transition `DRAFT → PENDING` (et `PENDING → FINALIZED`) passe par un endpoint Dougs `finalize()`. Côté UI, ce bouton « valide le devis comme signé », ce qui est **une action métier engageante**. Pour éviter toute promotion accidentelle, le plugin v1.1+ s'arrête toujours au DRAFT.

## Collecte

Si arguments incomplets, demander :

1. **Client** : nom ou SIREN. `/dougs:list-customers` pour autocompléter.
2. **Objet** : description courte.
3. **Lignes** : titre, description, quantité (1), unité ("unité"), prix unitaire HT, taux TVA (0.2).
4. **Date** : aujourd'hui par défaut.
5. **Validité** : 30 jours par défaut.

## Étape 1 — Créer le brouillon vide

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" create-draft > /tmp/dougs-draft-stub.json
DRAFT_ID=$(node -e 'console.log(require("/tmp/dougs-draft-stub.json").id)')
echo "Draft créé : $DRAFT_ID"
```

## Étape 2 — Récupérer le draft pré-rempli (avec retry)

Le serveur Dougs propage le draft de manière asynchrone (~1.5s). Polling avec retry :

```bash
for i in 1 2 3; do
  sleep 1.5
  if node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" get-draft "$DRAFT_ID" > /tmp/dougs-draft-full.json 2>/tmp/dougs-err; then
    break
  fi
  echo "Tentative $i échouée, retry..."
done
```

`/tmp/dougs-draft-full.json` contient l'objet complet (footerData, legalData, invoicerOthers pré-remplis par Dougs).

## Étape 3 — Construire le payload

Composer le payload via `scripts/build-quote-payload.mjs` à partir des inputs utilisateur, puis merger avec `/tmp/dougs-draft-full.json` pour conserver les sous-objets pré-remplis.

```bash
cat <<'EOF' | node "${CLAUDE_PLUGIN_ROOT}/scripts/build-quote-payload.mjs" > /tmp/dougs-input.json
{
  "subject": "OBJET DU DEVIS",
  "date": "YYYY-MM-DDT00:00:00.000Z",
  "expirationDate": "YYYY-MM-DDT00:00:00.000Z",
  "clientData": {
    "legalName": "NOM CLIENT",
    "address": { "street": "", "city": "", "zipCode": "", "country": "France" },
    "isBToB": true,
    "email": "client@email.com"
  },
  "lines": [
    {
      "title": "Prestation",
      "description": "...",
      "unit": "forfait",
      "quantity": 1,
      "unitAmount": 2500,
      "vatRate": 0.2
    }
  ]
}
EOF
```

Merger draft pré-rempli + input utilisateur. **Important** : forcer `status: 'DRAFT'` pour garantir le brouillon-only et conserver les sous-objets (footerData, legalData, invoicerOthers) du draft.

```bash
node -e '
const fs = require("fs");
const draft = JSON.parse(fs.readFileSync("/tmp/dougs-draft-full.json"));
const input = JSON.parse(fs.readFileSync("/tmp/dougs-input.json"));
const merged = {
  ...draft,
  ...input,
  status: "DRAFT",
  clientData: { ...draft.clientData, ...input.clientData },
};
delete merged._computed;
fs.writeFileSync("/tmp/dougs-payload.json", JSON.stringify(merged));
console.log("Payload mergé : " + merged.lines.length + " ligne(s), status=" + merged.status);
'
```

## Étape 4 — Valider

```bash
cat /tmp/dougs-payload.json | node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-quote.mjs"
```

Doit afficher `Valid`. Sinon corriger les erreurs (lire stderr).

## Étape 5 — Confirmer avec l'utilisateur

```
Nouveau brouillon pour [CLIENT]
Objet : [SUBJECT]
Lignes :
  - [TITLE] × [QTY] @ [PRICE]€ HT (TVA [RATE]%)
Total HT : [X]€ | TVA : [Y]€ | TTC : [Z]€
Valide jusqu'au : [DATE]

(Le devis sera créé en brouillon — à émettre manuellement dans Dougs UI quand prêt.)

Confirmer la création du brouillon ? (oui/non)
```

**Attendre confirmation explicite avant le PUT.**

## Étape 6 — Sauvegarder (PUT — le brouillon reste DRAFT)

```bash
cat /tmp/dougs-payload.json | node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" update-quote "$DRAFT_ID"
```

Le PUT sur `/quotes/{uuid}` sauvegarde les données mais **conserve le statut DRAFT** (tant que `status: 'DRAFT'` est bien dans le payload).

## Étape 7 — Confirmer succès

```
Brouillon créé : [NUMERO] — [CLIENT] — [MONTANT TTC]€
Statut : DRAFT (brouillon)
Lien : https://app.dougs.fr/app/c/[COMPANY_ID]/invoicing/quote?quoteId=[UUID]

Pour émettre ou finaliser : action manuelle dans l'UI Dougs.
```

## Guardrails

- Le CLI bloque DELETE et toute écriture hors quote-drafts/quotes (`lib/guardrails.mjs`).
- Validation stricte avant PUT (`scripts/validate-quote.mjs`).
- Confirmation utilisateur obligatoire.
- `status: 'DRAFT'` forcé dans le payload — empêche toute promotion accidentelle.
- Si `SESSION_EXPIRED` (exit 3) → `/dougs:refresh-session` puis recommencer.
