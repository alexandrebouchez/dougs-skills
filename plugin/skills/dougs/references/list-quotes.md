
# Lister les devis

## Exécution

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" list-quotes --pretty
```

Avec filtres :

- `--status pending` ou `--status finalized` pour filtrer
- `--limit N` pour tronquer aux N plus récents

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" list-quotes --status pending --limit 10 --pretty
```

## Note : DRAFT non listés

Cette commande appelle `GET /companies/{id}/invoicing/quotes`, qui ne retourne que les devis émis (PENDING / FINALIZED). Les **brouillons (DRAFT) n'apparaissent pas** dans cette liste — pour les retrouver, ouvrir l'UI Dougs (section *Brouillons*) ou utiliser l'UUID directement avec `/dougs edit-quote`.

## Si SESSION_EXPIRED

Si le CLI répond `SESSION_EXPIRED` (exit 3), inviter l'utilisateur à lancer `/dougs refresh-session` puis réessayer.

## Affichage

Parser la sortie JSON et présenter :

```
| # | Numéro | Client | Objet | Montant TTC | Statut | Date |
|---|--------|--------|-------|-------------|--------|------|
| 1 | 2026-05-DEV42 | ACME SARL | Audit IA | 2400€ | PENDING | 2026-05-03 |
```

Trier par date décroissante (plus récent en premier).

## Notes

- Le montant TTC est en euros (pas en centimes dans la réponse API).
- Champs utiles dans chaque devis : `numberPrefix`, `number`, `clientName`, `subject`, `totalAmountWithVat`, `status`, `date`.
