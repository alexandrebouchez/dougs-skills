---
description: "Gestion des brouillons de devis Dougs (créer, éditer, lister, télécharger). Brouillon-only, jamais d'émission auto."
argument-hint: "[action] | [intention en langage naturel]"
---

# /dougs

Point d'entrée unique pour la gestion des brouillons de devis Dougs.

## Routing

Lire `${CLAUDE_PLUGIN_ROOT}/skills/dougs/SKILL.md` (skill principal — setup gates, doctrine brouillon-only, table des actions, règles de routing).

Selon l'argument :

- **Nom d'action explicite** (`create-quote`, `edit-quote`, `list-quotes`, `view-quote`, `download-quote`, `list-customers`, `setup`, `refresh-session`) → charger la référence correspondante via `Read` sur `${CLAUDE_PLUGIN_ROOT}/skills/dougs/references/<action>.md`
- **Intention en langage naturel** (ex: "crée un devis pour Acme", "donne-moi la liste") → inférer l'action depuis le mapping documenté dans `SKILL.md`, puis charger la référence
- **Aucun argument** → afficher le menu d'actions (table dans `SKILL.md`)

## Guardrails

Les règles absolues (jamais finalize, jamais DELETE, jamais write sur invoices, jamais modifier FINALIZED, etc.) sont dans `SKILL.md`. Les respecter inconditionnellement.
