#!/bin/bash
# Valide une sauvegarde de NOVA téléchargée depuis hPanel en la restaurant dans une base ISOLÉE locale
# (conteneur MySQL Docker du poste, base nova_restore_test). Ne touche jamais à la production.
#
#   bash deploy/hostinger/valider-restauration.sh <export base .sql | .sql.gz | .sql.gz.gpg> [archive documents .tar.gz | .tar.gz.gpg | .zip]
#
# Prérequis : conteneur MySQL local démarré (docker compose up -d db), gpg avec la clé privée si fichiers .gpg.
# Sortie : compteurs et versions uniquement (aucune donnée patient).
set -eu
set -o pipefail
DUMP="${1:?export de la base attendu}"
UPLOADS="${2:-}"
DB_CONTAINER="${DB_CONTAINER:-nova-db-1}"
TARGET_DB="nova_restore_test"
mysql_root() { docker exec -i "$DB_CONTAINER" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$@"' sh "$@"; }

decode() {
  case "$1" in
    *.gpg) gpg --batch --quiet --decrypt "$1" | decode_plain "${1%.gpg}" ;;
    *) decode_plain "$1" < "$1" ;;
  esac
}
decode_plain() { case "$1" in *.gz) gzip -dc ;; *) cat ;; esac; }

echo "== Restauration isolée dans $TARGET_DB (conteneur $DB_CONTAINER)"
mysql_root -e "DROP DATABASE IF EXISTS $TARGET_DB; CREATE DATABASE $TARGET_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
# Un export hPanel/phpMyAdmin peut contenir « USE `base` » ou CREATE DATABASE : neutralisés pour rester dans la base isolée.
decode "$DUMP" | sed -E '/^(USE|CREATE DATABASE) /Id' | mysql_root "$TARGET_DB"
echo "import : OK"

echo "== Contrôles"
mysql_root -N "$TARGET_DB" -e "
SELECT CONCAT('tables nova_* : ', COUNT(*)) FROM information_schema.tables WHERE table_schema='$TARGET_DB' AND table_name LIKE 'nova\_%';
SELECT CONCAT('dernière migration : ', MAX(version)) FROM nova_schema_migrations;
SELECT CONCAT('comptes : ', COUNT(*)) FROM nova_users;
SELECT CONCAT('patients : ', COUNT(*)) FROM nova_patients;
SELECT CONCAT('rendez-vous : ', COUNT(*)) FROM nova_appointments;
SELECT CONCAT('ordonnances : ', COUNT(*)) FROM nova_prescriptions;
SELECT CONCAT('documents référencés : ', COUNT(*)) FROM nova_documents WHERE file_path IS NOT NULL;"

if [ -n "$UPLOADS" ]; then
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT
  case "$UPLOADS" in
    *.zip) unzip -q "$UPLOADS" -d "$work" ;;
    *.gpg) gpg --batch --quiet --decrypt "$UPLOADS" | tar -xzf - -C "$work" ;;
    *) tar -xzf "$UPLOADS" -C "$work" ;;
  esac
  echo "documents dans l'archive : $(find "$work" -type f | wc -l)"
  # Chaque document référencé en base doit exister dans l'archive.
  missing=0; total=0
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    total=$((total + 1))
    if [ -z "$(find "$work" -path "*/$rel" -type f -print -quit)" ]; then missing=$((missing + 1)); fi
  done < <(mysql_root -N "$TARGET_DB" -e "SELECT file_path FROM nova_documents WHERE file_path IS NOT NULL UNION SELECT photo_path FROM nova_patients WHERE photo_path IS NOT NULL")
  echo "fichiers référencés en base : $total ; absents de l'archive : $missing"
  [ "$missing" -eq 0 ] || { echo "ÉCHEC : documents manquants dans la sauvegarde"; exit 1; }
fi
echo "== Sauvegarde validée (base isolée $TARGET_DB conservée pour inspection ; la supprimer ensuite)"
