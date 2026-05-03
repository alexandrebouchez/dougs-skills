---
description: "Télécharger le PDF d'un devis"
argument-hint: "<quote-id ou numéro> [--out /chemin/sortie.pdf]"
---

# Télécharger un devis PDF

## Prérequis

Le devis doit avoir un PDF généré (`quote.file` non null). Le PDF est disponible dès qu'un brouillon a été émis (statut PENDING ou FINALIZED). Sur un brouillon (DRAFT), pas encore de PDF — L'utilisateur doit d'abord émettre le devis manuellement dans l'UI Dougs.

## Exécution

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" download-quote "$QUOTE_UUID" --out "$OUT_PATH"
```

Si `--out` n'est pas fourni par l'utilisateur, proposer un défaut basé sur le numéro de devis : `~/Downloads/devis-[NUMERO].pdf`.

## Output

```
PDF téléchargé : [FILENAME] ([SIZE] octets)
Emplacement : [OUT_PATH]
```

## Si pas de PDF

Le CLI répond `ERROR: Pas de PDF disponible (devis non finalisé ?)`. Le devis est probablement encore en DRAFT (brouillon). Expliquer à l'utilisateur qu'il faut d'abord émettre le brouillon depuis l'UI Dougs (`https://app.dougs.fr`) — l'émission/validation reste une action manuelle (cf `skill.md` guardrails).

## Si SESSION_EXPIRED

Inviter l'utilisateur à lancer `/dougs:refresh-session`.
