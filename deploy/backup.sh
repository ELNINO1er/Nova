#!/bin/sh
# Sauvegarde quotidienne de NOVA : dump MySQL + archive des documents envoyés.
# Lancé par le service `backup` de docker-compose.yml. Restauration : voir docs/MISE_EN_PRODUCTION_TEST.md.
set -eu

RETENTION="${BACKUP_RETENTION_DAYS:-14}"

run_backup() {
  stamp=$(date +%Y-%m-%d_%H%M)
  # --single-transaction : copie cohérente sans bloquer l'application.
  if mysqldump -h "$DB_HOST" -uroot --single-transaction --routines --no-tablespaces "$DB_NAME" | gzip > "/backups/nova-db-$stamp.sql.gz.tmp"; then
    mv "/backups/nova-db-$stamp.sql.gz.tmp" "/backups/nova-db-$stamp.sql.gz"
    echo "[backup] base sauvegardée : nova-db-$stamp.sql.gz"
  else
    rm -f "/backups/nova-db-$stamp.sql.gz.tmp"
    echo "[backup] ERREUR : échec du dump MySQL" >&2
  fi
  tar -czf "/backups/nova-uploads-$stamp.tar.gz" -C /uploads . && echo "[backup] documents sauvegardés : nova-uploads-$stamp.tar.gz"
  find /backups -name 'nova-*' -mtime +"$RETENTION" -delete
}

while true; do
  run_backup
  sleep 86400
done
