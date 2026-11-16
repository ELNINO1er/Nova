#!/bin/sh
# Crée (ou met à jour) le compte MySQL de sauvegarde, en lecture seule, utilisé par le service `backup`.
# À lancer une fois dans le conteneur db, avec le mot de passe root du conteneur et BACKUP_DB_PASSWORD :
#   BACKUP_DB_PASSWORD="$(grep "^BACKUP_DB_PASSWORD=" .env | cut -d= -f2-)" docker compose exec -T -e BACKUP_DB_PASSWORD db sh < deploy/create-backup-user.sh
# Droits : lecture (SELECT), vues, déclencheurs, routines et verrous de lecture. Aucune écriture.
set -eu
: "${BACKUP_DB_PASSWORD:?BACKUP_DB_PASSWORD est requis}"
USER_NAME="${BACKUP_DB_USER:-nova_backup}"
DB="${MYSQL_DATABASE:-nova}"
case "$USER_NAME$DB" in *[!A-Za-z0-9_]*) echo "Nom de compte ou de base invalide" >&2; exit 1;; esac
ESCAPED=$(printf '%s' "$BACKUP_DB_PASSWORD" | sed "s/\\\\/\\\\\\\\/g; s/'/''/g")

MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot <<SQL
CREATE USER IF NOT EXISTS '$USER_NAME'@'%' IDENTIFIED BY '$ESCAPED';
ALTER USER '$USER_NAME'@'%' IDENTIFIED BY '$ESCAPED';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '$USER_NAME'@'%';
GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES, EVENT ON \`$DB\`.* TO '$USER_NAME'@'%';
GRANT SHOW_ROUTINE ON *.* TO '$USER_NAME'@'%';
FLUSH PRIVILEGES;
SQL
echo "Compte de sauvegarde « $USER_NAME » prêt (lecture seule sur $DB)."
