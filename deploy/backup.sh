#!/bin/sh
# Sauvegarde quotidienne de NOVA : dump MySQL + archive des documents envoyés.
# Lancé par le service `backup` de docker-compose.yml. Restauration : voir docs/MISE_EN_PRODUCTION_TEST.md.
set -eu

RETENTION="${BACKUP_RETENTION_DAYS:-14}"

run_backup() {
  stamp=$(date +%Y-%m-%d_%H%M)
  # --single-transaction : copie cohérente sans bloquer l'application.
  # Contrôler le dump séparément : le statut d'un pipeline POSIX ne contrôle que gzip.
  if mysqldump -h "$DB_HOST" -uroot --single-transaction --routines --no-tablespaces "$DB_NAME" > "/backups/nova-db-$stamp.sql.tmp" &&
     test -s "/backups/nova-db-$stamp.sql.tmp" &&
     gzip -c "/backups/nova-db-$stamp.sql.tmp" > "/backups/nova-db-$stamp.sql.gz.tmp" &&
     gzip -t "/backups/nova-db-$stamp.sql.gz.tmp"; then
    mv "/backups/nova-db-$stamp.sql.gz.tmp" "/backups/nova-db-$stamp.sql.gz" || return 1
    echo "[backup] base sauvegardée : nova-db-$stamp.sql.gz"
  else
    rm -f "/backups/nova-db-$stamp.sql.gz.tmp" "/backups/nova-db-$stamp.sql.tmp"
    echo "[backup] ERREUR : échec du dump MySQL" >&2
    return 1
  fi
  rm -f "/backups/nova-db-$stamp.sql.tmp"
  if tar -czf "/backups/nova-uploads-$stamp.tar.gz.tmp" -C /uploads . &&
     gzip -t "/backups/nova-uploads-$stamp.tar.gz.tmp" &&
     mv "/backups/nova-uploads-$stamp.tar.gz.tmp" "/backups/nova-uploads-$stamp.tar.gz"; then
    echo "[backup] documents sauvegardés : nova-uploads-$stamp.tar.gz"
  else
    rm -f "/backups/nova-uploads-$stamp.tar.gz.tmp"
    echo "[backup] ERREUR : échec de l'archive des documents" >&2
    return 1
  fi
  find /backups -name 'nova-*' -mtime +"$RETENTION" -delete
}

while true; do
  run_backup || echo "[backup] Échec de sauvegarde : contrôler les journaux et le stockage" >&2
  sleep 86400
done
