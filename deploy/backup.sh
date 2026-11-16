#!/bin/bash
# Sauvegarde de NOVA : dump MySQL + archive des documents envoyés, TOUJOURS chiffrés.
# Lancé chaque jour par le service `backup` de docker-compose.yml, ou une fois (BACKUP_RUN_ONCE=true),
# par exemple pour la sauvegarde manuelle d'avant déploiement. Restauration : docs/SAUVEGARDES.md.
#
# Garanties :
#   - chiffrement GPG obligatoire avec la clé PUBLIQUE (BACKUP_GPG_RECIPIENT_FILE). Clé absente ou invalide :
#     la tâche échoue avant tout dump, avec un message explicite, et les sauvegardes existantes sont conservées ;
#   - aucune donnée en clair sur disque : flux mysqldump | gzip | gpg et tar | gpg. Un fichier partiel (.part)
#     ne contient que du chiffré et il est supprimé en cas d'échec ou au passage suivant ;
#   - umask 077 : fichiers 600, dossier 700 ;
#   - compte MySQL dédié en lecture seule (BACKUP_DB_USER, deploy/create-backup-user.sh), jamais root ;
#   - rotation seulement après une sauvegarde complète réussie.
set -eu
set -o pipefail
umask 077

RETENTION="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-/uploads}"
DB_USER="${BACKUP_DB_USER:-nova_backup}"
RECIPIENT_FILE="${BACKUP_GPG_RECIPIENT_FILE:-/keys/backup-public.asc}"
# Préfixe des fichiers. « nova » est soumis à la rotation ; un autre préfixe (ex. predeploy-nova) ne l'est pas.
PREFIX="${BACKUP_NAME_PREFIX:-nova}"
case "$PREFIX" in ''|*[!A-Za-z0-9_-]*) echo "[backup] ERREUR : BACKUP_NAME_PREFIX invalide" >&2; exit 2;; esac

fail() {
  echo "[backup] ERREUR : $*" >&2
  echo "[backup] Aucune nouvelle sauvegarde ; les sauvegardes existantes sont conservées." >&2
  return 1
}

# Vérifie que la clé publique existe et permet de chiffrer (test sur un contenu factice).
check_key() {
  [ -s "$RECIPIENT_FILE" ] || { fail "clé publique de chiffrement absente ($RECIPIENT_FILE). Voir docs/SAUVEGARDES.md."; return 1; }
  if ! printf 'controle' | GNUPGHOME="$GPG_HOME" gpg --batch --quiet --no-tty --trust-model always \
       --recipient-file "$RECIPIENT_FILE" --encrypt --output /dev/null 2>/dev/null; then
    fail "clé publique invalide ou inutilisable pour chiffrer ($RECIPIENT_FILE)."
    return 1
  fi
}

seal() {
  GNUPGHOME="$GPG_HOME" gpg --batch --quiet --yes --no-tty --trust-model always \
    --recipient-file "$RECIPIENT_FILE" --encrypt --output "$1"
}

run_backup() {
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR" 2>/dev/null || true
  GPG_HOME=$(mktemp -d)
  trap 'rm -rf "$GPG_HOME"' RETURN
  # Restes chiffrés d'un passage interrompu (arrêt du conteneur, coupure).
  find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.part' -delete
  check_key || return 1

  stamp=$(date +%Y-%m-%d_%H%M%S)
  db_file="$BACKUP_DIR/$PREFIX-db-$stamp.sql.gz.gpg"
  up_file="$BACKUP_DIR/$PREFIX-uploads-$stamp.tar.gz.gpg"

  # --single-transaction : copie cohérente sans bloquer l'application. pipefail : un dump interrompu échoue.
  if ! mysqldump -h "$DB_HOST" -u"$DB_USER" --single-transaction --routines --no-tablespaces --set-gtid-purged=OFF "$DB_NAME" \
       | gzip -c | seal "$db_file.part" || ! test -s "$db_file.part"; then
    rm -f "$db_file.part"
    fail "échec du dump MySQL ou du chiffrement."
    return 1
  fi

  if ! test -d "$UPLOADS_DIR" || ! tar -czf - -C "$UPLOADS_DIR" . | seal "$up_file.part" || ! test -s "$up_file.part"; then
    rm -f "$db_file.part" "$up_file.part"
    fail "échec de l'archive des documents ou du chiffrement."
    return 1
  fi

  # Les deux fichiers sont publiés ensemble, seulement quand tout a réussi.
  mv "$db_file.part" "$db_file"
  mv "$up_file.part" "$up_file"
  echo "[backup] base sauvegardée (chiffrée) : $(basename "$db_file")"
  echo "[backup] documents sauvegardés (chiffrés) : $(basename "$up_file")"
  # Rotation : uniquement les sauvegardes quotidiennes « nova-* » plus anciennes que la rétention.
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'nova-*' -mtime +"$RETENTION" -delete
}

if [ "${BACKUP_RUN_ONCE:-false}" = "true" ]; then
  run_backup
  exit $?
fi

while true; do
  run_backup || echo "[backup] Échec de sauvegarde : contrôler les journaux, la clé et le stockage" >&2
  sleep 86400
done
