---
name: dougs
description: >
  Gestion des brouillons de devis Dougs (comptabilité en ligne française). Créer, éditer,
  visualiser, télécharger. Brouillon-only — l'émission et la validation restent manuelles
  dans l'UI Dougs.
  Activé quand l'utilisateur mentionne 'dougs', 'devis', 'brouillon', 'quote', 'facturation',
  'créer un devis', 'nouveau devis', 'modifier un devis', 'éditer un devis', 'télécharger un devis',
  'établir un devis', 'préparer un devis', 'devis client', 'devis pour [client]',
  'facturer un client', 'générer un PDF de devis', 'liste mes devis', 'mes clients Dougs',
  'comptabilité Dougs', ou toute action liée à la gestion de devis.
---

# Dougs — Gestion des brouillons de devis

Plugin basé sur fetch direct vers l'API interne de Dougs, avec un cookie de session extrait depuis un onglet Chrome authentifié (Google SSO). Aucun appel temps réel ne passe par Chrome MCP — uniquement l'extraction initiale du cookie.

**Principe brouillon-only** : le plugin crée et modifie uniquement des **brouillons (DRAFT)**. Les transitions `DRAFT → PENDING` (émission) et `PENDING → FINALIZED` (validation/signature) restent manuelles dans l'UI Dougs — l'utilisateur garde toujours la main sur ces étapes engageantes.

## Commandes disponibles

| Commande | Action |
|----------|--------|
| `/dougs:setup` | Config initiale (company_id, defaults) + indications session |
| `/dougs:refresh-session` | Extraire/renouveler le cookie de session |
| `/dougs:create-quote` | Créer un nouveau brouillon (DRAFT) |
| `/dougs:edit-quote` | Modifier un brouillon (DRAFT) ou un devis émis (PENDING) |
| `/dougs:list-quotes` | Lister les devis émis (DRAFT exclus de cette liste) |
| `/dougs:view-quote` | Voir le détail d'un devis |
| `/dougs:download-quote` | Télécharger le PDF d'un devis (PENDING ou FINALIZED) |
| `/dougs:list-customers` | Lister les clients |

## Hors scope

- **Émettre / Finaliser** un brouillon (`finalize()` côté Dougs) : action engageante (validation comme signé, irréversible côté FINALIZED, génération PDF). Toujours faite par l'utilisateur dans l'UI Dougs (`https://app.dougs.fr`).
- **Envoi par email** : utiliser `/dougs:download-quote` puis envoyer le PDF avec l'outil mail de votre choix.

## Statuts Dougs

L'API Dougs distingue trois statuts :

| Statut | Description | Modifiable par le plugin | PDF |
|--------|-------------|--------------------------|-----|
| `DRAFT` | Brouillon, pas encore émis | Oui | Non |
| `PENDING` | Émis, en attente de signature client | Oui, mais avec avertissement explicite — le client peut avoir déjà reçu cette version | Oui |
| `FINALIZED` | Signé/validé, verrouillé | **Non** (refus côté plugin) | Oui |

**Comportement du PUT `/quotes/{uuid}`** :

- Si le payload conserve `status: 'DRAFT'` → le brouillon reste DRAFT, données sauvées.
- Si le payload conserve `status: 'PENDING'` → le devis reste PENDING, données sauvées.
- Si on tente `DRAFT → PENDING` via PUT → l'API refuse avec `"cannot be finalized. Use finalize() method instead."` (message verbatim de Dougs). C'est volontaire : la promotion exige `finalize()`, **endpoint volontairement non exposé par le plugin**.

`create-quote` force donc `status: 'DRAFT'` dans le payload pour garantir le brouillon-only. `edit-quote` ne touche pas au champ `status` — il préserve celui du devis chargé.

## Authentification — Cookie de session

L'API Dougs n'expose pas de clé d'API. L'auth repose sur un cookie HttpOnly (Google SSO).

**Setup unique** : `/dougs:refresh-session` extrait le cookie depuis un onglet Chrome connecté à `app.dougs.fr`. Le cookie est stocké dans `~/.dougs-session` (perms 0600).

**Workflow par appel** :

1. Le CLI `bin/dougs.mjs` lit `~/.dougs-session`
2. Envoie un fetch HTTP avec le header `Cookie`
3. Si 401 → exit code 3, message `SESSION_EXPIRED`
4. Le skill propose alors `/dougs:refresh-session` puis retry

## Guardrails de sécurité

**RÈGLES ABSOLUES — JAMAIS DÉROGER :**

1. **JAMAIS d'écriture sur les factures.** `/sales-invoices` et `/vendor-invoices` sont blacklistés dans `lib/guardrails.mjs`.
2. **JAMAIS de DELETE.** Bloqué par le guardrail.
3. **JAMAIS de modification d'un devis FINALIZED.** Vérifier `quote.status` avant tout PUT.
4. **JAMAIS d'appel à `finalize()`.** Pas exposé dans le plugin — l'utilisateur émet/valide manuellement dans l'UI Dougs.
5. **Confirmation utilisateur obligatoire** avant tout POST ou PUT.
6. **Whitelist stricte** (`ALLOWED_WRITE_PATHS` dans `lib/config.mjs`) :
   - `POST /companies/{id}/invoicing/quote-drafts`
   - `PUT /companies/{id}/invoicing/quotes/{uuid}`

## Codes erreur du CLI

| Exit | Signification |
|------|---------------|
| 0 | Succès |
| 1 | Erreur générique (payload invalide, ressource introuvable, Dougs 4xx/5xx) |
| 2 | Mauvais usage CLI (commande inconnue, args manquants) |
| 3 | `SESSION_EXPIRED` — relancer `/dougs:refresh-session` |

## Configuration locale

`.claude/dougs.local.md` :

```yaml
---
company_id: "YOUR_DOUGS_COMPANY_ID"
default_vat_rate: 0.2
default_unit: "unité"
default_expiration_days: 30
---
```

Plus les sections markdown (`## Invoicer Name`, `## Legal Information`, `## Contact Information`, etc.) qui peuplent le pied de page des devis. Voir `.claude/dougs.local.md.template` pour la structure complète.

## API Reference (interne, reverse-engineered)

**Base URL** : `https://app.dougs.fr` | **Company ID** : depuis `.claude/dougs.local.md`

**Endpoints autorisés** :

- `GET /users/me` → ping auth
- `GET /companies/{id}/invoicing/quotes` → liste des devis émis (PENDING/FINALIZED) — les DRAFT ne ressortent pas ici
- `GET /companies/{id}/invoicing/quotes/{uuid}` → détail d'un PENDING/FINALIZED (renvoie 400 si DRAFT — utiliser `/quote-drafts/{uuid}` pour les brouillons)
- `POST /companies/{id}/invoicing/quote-drafts` (body: `{}`) → créer un brouillon
- `GET /companies/{id}/invoicing/quote-drafts/{uuid}` → détail d'un brouillon (~1.5s après POST, retry possible)
- `PUT /companies/{id}/invoicing/quotes/{uuid}` (body: objet COMPLET) → sauvegarder un DRAFT ou un PENDING — **préserve le statut**, ne promeut pas
- `GET /companies/{id}/customers` → liste clients
- Téléchargement PDF : `quote.file.path` (suit redirect)

**Endpoints volontairement non exposés** :

- `POST /companies/{id}/invoicing/quotes/{uuid}/finalize` (ou variante) — promotion DRAFT → PENDING / PENDING → FINALIZED. Trop engageant, action manuelle UI.
- `DELETE` (tous endpoints) — bloqué par guardrail.

**Flow de création (brouillon-only)** :

1. POST `quote-drafts` → DRAFT (pré-rempli avec footerData, legalData, invoicerOthers depuis votre config)
2. wait ~1.5s
3. GET `quote-drafts/{uuid}` → objet complet
4. Modifier incrémentalement, **forcer `status: 'DRAFT'`**
5. PUT `quotes/{uuid}` → 200, brouillon sauvé en DRAFT

**Structure ligne** (champs requis) :

```json
{
  "title": "", "description": "", "unit": "unité",
  "quantity": 1, "unitAmount": 100, "vatRate": 0.2,
  "discount": 0, "discountUnit": "%", "reference": "",
  "amount": 100, "discountInEuros": 0, "isPriceWithVat": false
}
```
