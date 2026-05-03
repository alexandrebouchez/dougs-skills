---
description: "Lister les clients Dougs"
argument-hint: "[--search NOM]"
---

# Lister les clients

## Exécution

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" list-customers --pretty
```

Avec filtre :

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" list-customers --search "SA Couleur" --pretty
```

## Affichage

```
| # | Nom | SIREN | Email | Ville |
|---|-----|-------|-------|-------|
| 1 | SA COULEUR ET CONNECTION | 389195207 | f.bertrand@... | TALUYERS |
```

## Note

Si la liste est vide (0 résultats), les clients sont probablement embarqués dans `clientData` des devis. Dans ce cas, extraire les clients uniques depuis `/dougs:list-quotes`.

## Si SESSION_EXPIRED

Inviter l'utilisateur à lancer `/dougs:refresh-session`.
