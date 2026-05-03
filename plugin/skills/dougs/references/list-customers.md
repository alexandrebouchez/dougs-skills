# Lister les clients

Lecture seule — affiche les clients enregistrés dans Dougs. Utilisé principalement par `/dougs create-quote` pour autocompléter le client cible.

## Exécution

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" list-customers --pretty
```

Avec filtre :

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" list-customers --search "ACME" --pretty
```

## Affichage

```
| # | Nom | SIREN | Email | Ville |
|---|-----|-------|-------|-------|
| 1 | ACME SARL | 123456789 | contact@acme.fr | PARIS |
```

## Note

Si la liste est vide (0 résultats), les clients sont probablement embarqués dans `clientData` des devis. Dans ce cas, extraire les clients uniques depuis `/dougs list-quotes`.

## Si SESSION_EXPIRED

Inviter l'utilisateur à lancer `/dougs refresh-session`.
