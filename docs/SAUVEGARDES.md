# Sauvegardes NOVA : chiffrement, clés et restauration

Le service `backup` (docker-compose) sauvegarde chaque jour la base MySQL et les documents envoyés dans `./backups`.

## Protection en place

| Mesure | Détail |
|---|---|
| Chiffrement | GPG par **clé publique** (`deploy/keys/backup-public.asc`). La clé privée ne va jamais sur le serveur. |
| Chiffrement obligatoire | Clé publique absente ou invalide : la tâche **échoue avant tout dump** (« clé publique de chiffrement absente » / « clé publique invalide »), code de sortie 1, aucune nouvelle sauvegarde, les précédentes sont conservées. Il n'existe aucun mode non chiffré. |
| Pas de donnée en clair | Flux `mysqldump \| gzip \| gpg` et `tar \| gpg`. Les fichiers en cours d'écriture (`.part`) ne contiennent que du chiffré, sont supprimés en cas d'échec et au passage suivant. Base et documents ne sont publiés ensemble que si les deux ont réussi. |
| Permissions | `umask 077` : fichiers `600`, dossier `700`, lisibles par root seulement sur l'hôte. |
| Compte MySQL | `nova_backup`, lecture seule (`SELECT, SHOW VIEW, TRIGGER, LOCK TABLES, EVENT, SHOW_ROUTINE`). Le mot de passe root n'est plus transmis au conteneur de sauvegarde. |
| Contrôle | Un dump interrompu ou refusé par MySQL échoue (`pipefail`) sans annoncer de succès. |
| Rotation | Seulement après une sauvegarde réussie : fichiers `nova-*` plus anciens que `BACKUP_RETENTION_DAYS` (14 jours). Les sauvegardes manuelles `predeploy-nova-*` ne sont jamais supprimées automatiquement. Les anciennes sauvegardes `.sql.gz` / `.tar.gz` sont conservées jusqu'à l'échéance de rétention. |

Sauvegarde manuelle chiffrée (ex. juste avant un déploiement) :
`docker compose run --rm -e BACKUP_RUN_ONCE=true -e BACKUP_NAME_PREFIX=predeploy-nova backup`

## Gestion des clés (à faire une fois, hors serveur)

Sur le poste du responsable des sauvegardes (jamais sur le serveur) :

```bash
gpg --quick-gen-key "NOVA sauvegardes <sauvegardes@votre-domaine>" rsa4096 encr 2y
gpg --armor --export sauvegardes@votre-domaine > backup-public.asc
gpg --armor --export-secret-keys sauvegardes@votre-domaine > nova-backup-PRIVEE.asc
```

- Protégez la clé privée par une phrase secrète forte (GPG la demande à la création).
- Conservez `nova-backup-PRIVEE.asc` et sa phrase secrète **en deux exemplaires hors ligne** (coffre, clé USB chiffrée), chez deux personnes différentes. Sans elle, les sauvegardes sont illisibles.
- Copiez **uniquement** `backup-public.asc` sur le serveur, dans `deploy/keys/` (dossier exclu de git et de l'image Docker).
- Renouvellement : avant l'expiration (2 ans), générez une nouvelle paire, remplacez la clé publique sur le serveur et **gardez l'ancienne clé privée** tant que des sauvegardes chiffrées avec elle existent.
- Perte ou compromission de la clé privée : générez une nouvelle paire, remplacez la clé publique, lancez une sauvegarde immédiate, puis supprimez les anciennes sauvegardes une fois la nouvelle vérifiée.

## Mise en place sur le serveur

```bash
# 1. Mot de passe du compte de sauvegarde dans .env (valeur aléatoire, distincte des autres)
#    BACKUP_DB_PASSWORD=...
# 2. Clé publique
cp backup-public.asc deploy/keys/backup-public.asc
# 3. Compte MySQL en lecture seule
BACKUP_DB_PASSWORD="$(grep '^BACKUP_DB_PASSWORD=' .env | cut -d= -f2-)" docker compose exec -T -e BACKUP_DB_PASSWORD db sh < deploy/create-backup-user.sh
# 4. Redémarrer le service et vérifier
docker compose up -d backup
docker compose logs --tail=20 backup     # attendu : « base sauvegardée (chiffrée) : nova-db-….sql.gz.gpg », aucune ligne « ERREUR »
ls -l backups/                           # attendu : -rw------- root
```

## Restauration (sur une base isolée d'abord)

Sur la machine qui détient la clé privée :

```bash
# Base : restaurer dans une base de contrôle, jamais directement sur « nova »
docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE nova_restore_test"'
gpg --decrypt backups/nova-db-AAAA-MM-JJ_HHMMSS.sql.gz.gpg | gunzip -c \
  | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" nova_restore_test'
# Contrôle : nombre de tables et quelques sommes de contrôle
docker compose exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"nova_restore_test\"; CHECKSUM TABLE nova_restore_test.nova_patients, nova_restore_test.nova_users"'

# Documents : vers un dossier de contrôle
mkdir restore-uploads && gpg --decrypt backups/nova-uploads-AAAA-MM-JJ_HHMMSS.tar.gz.gpg | tar -xzf - -C restore-uploads
```

Restauration réelle (incident) : arrêter l'API (`docker compose stop api`), restaurer dans `nova` avec la même commande, restaurer les documents avec
`docker compose run --rm -v "$PWD/restore-uploads:/r:ro" --entrypoint sh api -c 'cp -a /r/. /app/data/uploads/'`, puis `docker compose start api`.

Les anciennes sauvegardes non chiffrées (`.sql.gz`, `.tar.gz`) se restaurent sans l'étape `gpg --decrypt`.

## Exercices réalisés le 16/11/2026 (environnement local, base isolée `nova_test`, données fictives)

Dans le conteneur `mysql:8.0` réel, avec `deploy/backup.sh` et le compte `nova_backup` :

| Contrôle | Résultat |
|---|---|
| Clé publique absente | « clé publique de chiffrement absente », code de sortie 1, aucun fichier créé |
| Clé publique invalide | « clé publique invalide ou inutilisable pour chiffrer », aucun fichier créé |
| MySQL refuse la connexion | « échec du dump MySQL ou du chiffrement », aucun fichier créé, sauvegardes précédentes intactes |
| Sauvegarde d'avant déploiement (`predeploy-nova`) et quotidienne | fichiers `.gpg` en `600`, dossier `700` |
| Restauration de `predeploy-nova-db-….gpg` dans `nova_restore_test` | 56 tables, sommes de contrôle identiques (`nova_patients`, `nova_users`, `nova_appointments`, `nova_prescriptions`, `nova_messages`, `nova_consultations`, `nova_schema_migrations`) ; documents identiques (`diff -r`) |
| Écriture avec le compte `nova_backup` | `DELETE` refusé (erreur 1142) |

Tests automatiques (`server/__tests__/backup.test.js`, 6 tests) : clé absente ou invalide, dump interrompu après une donnée
fictive (aucun fichier ne la contient en clair), échec des documents (la base n'est pas publiée seule), chiffrement de bout en
bout, rotation (les `predeploy-nova-*` sont conservées).
À refaire sur le serveur avec la vraie clé avant d'accueillir de vrais dossiers patients, puis tous les trimestres.
