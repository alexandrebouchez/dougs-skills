---
description: "Voir le détail d'un devis"
argument-hint: "<quote-id ou numéro>"
---

# Voir un devis

Lecture seule — affiche le détail d'un devis (DRAFT, PENDING ou FINALIZED). Pour les brouillons (DRAFT), le CLI bascule automatiquement sur `/quote-drafts/{uuid}` car `/quotes/{uuid}` ne les retourne pas.

## Identifier le devis

L'utilisateur peut fournir un UUID, un numéro (ex: "41"), ou une description. Si pas un UUID, lister d'abord les devis (`/dougs:list-quotes`) et trouver l'UUID correspondant.

## Exécution

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" view-quote <UUID> --pretty
```

## Affichage

Présenter de manière lisible :

```
Devis [NUMERO] — [STATUT]

Client : [LEGAL_NAME]
Adresse : [STREET], [ZIPCODE] [CITY]
Email : [EMAIL]
SIREN : [SIREN]

Objet : [SUBJECT]
Date : [DATE] | Valide jusqu'au : [EXPIRATION_DATE]

Lignes :
  1. [TITLE] — [DESCRIPTION]
     [QTY] × [UNIT_AMOUNT]€ HT ([UNIT]) | TVA [RATE]%
  2. ...

Sous-total HT : [TOTAL_NET]€
TVA : [TOTAL_VAT]€
Total TTC : [TOTAL_WITH_VAT]€

Note : [THANK_YOU_NOTE]
Conditions de paiement : [PAYMENT_TERMS]
```

Si le devis a un PDF (`file.path` non null) :

```
PDF disponible : /dougs:download-quote [UUID]
```

## Si SESSION_EXPIRED

Inviter l'utilisateur à lancer `/dougs:refresh-session`.
