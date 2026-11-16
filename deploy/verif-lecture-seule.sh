#!/bin/bash
# Contrôles EN LECTURE SEULE du serveur NOVA avant le déploiement de f92ccba
# (docs/DEPLOIEMENT_2026-11-16.md, §1, plus les prérequis de faisabilité).
#
#   cd /chemin/vers/nova && bash verif-lecture-seule.sh 2>&1 | tee /tmp/nova-verif.txt
#
# N'écrit rien : ni fichier du dépôt, ni conteneur, ni base (uniquement SELECT, ls, df, git status/ls-remote).
# N'affiche aucun secret (valeurs de mots de passe, jetons, clés) ni donnée patient (noms, numéros) :
# seulement des identifiants techniques, des rôles, des compteurs et des valeurs booléennes de configuration.
set -u
TARGET=f92ccba
n=0
section() { n=$((n + 1)); printf '\n[%02d] %s\n' "$n" "$1"; }
# Requête SQL en lecture seule, mot de passe root lu dans le conteneur (jamais affiché).
sql() { docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -N -B "${MYSQL_DATABASE:-nova}" -e "$1"' sh "$1" 2>&1 | grep -v 'Using a password'; }
envval() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2-; }

[ -f docker-compose.yml ] && [ -f .env ] || { echo "Lancer depuis le dossier NOVA du serveur (docker-compose.yml et .env introuvables)."; exit 1; }
echo "NOVA — contrôles en lecture seule — $(date -u +%Y-%m-%dT%H:%MZ)"

section "Version du dépôt sur le serveur"
echo "branche : $(git rev-parse --abbrev-ref HEAD 2>&1)"
echo "commit  : $(git log -1 --format='%h %s' 2>/dev/null)"
echo "fichiers suivis modifiés : $(git status --porcelain --untracked-files=no 2>/dev/null | wc -l)"
git status --porcelain --untracked-files=no 2>/dev/null | awk '{print "  - " $2}'
if git cat-file -e "$TARGET^{commit}" 2>/dev/null; then echo "$TARGET présent localement : oui"; else echo "$TARGET présent localement : non"; fi
echo "branche distante feat/stabilite-connexion-pilote : $(git ls-remote origin refs/heads/feat/stabilite-connexion-pilote 2>&1 | cut -c1-7)"

section "Conteneurs"
docker compose ps --format 'table {{.Service}}\t{{.State}}\t{{.Status}}' 2>&1

section "Image API en service"
docker compose images api 2>&1 | tail -n +1
docker compose exec -T api sh -c 'echo "node $(node -v) / utilisateur $(whoami)"' 2>&1

section "Santé publique"
dom=$(envval DOMAIN)
if [ -n "$dom" ]; then curl -sS -m 10 -w '  HTTP %{http_code}\n' "https://$dom/api/health" 2>&1; else echo "DOMAIN non défini dans .env"; fi

section "Configuration (valeurs non secrètes uniquement)"
for k in NODE_ENV SEED_DEMO ALLOW_INSECURE_DEMO ALLOW_FICTIF_SEED OTP_LOGIN_ENABLED ENABLE_API_DOCS COOKIE_SECURE SMS_PROVIDER BACKUP_RETENTION_DAYS; do
  v=$(envval "$k")
  if [ -z "$v" ]; then v='(non défini)'
  elif ! printf '%s' "$v" | grep -qE '^(true|false|[0-9]+|twilio|webhook|demo|production|development)$'; then v='<valeur inattendue>'; fi
  printf '  %-22s %s\n' "$k" "$v"
done
printf '  %-22s %s\n' "WEB_ORIGIN https" "$(envval WEB_ORIGIN | grep -q '^https://' && echo oui || echo NON)"

section "Mots de passe de démonstration dans .env (nombre de valeurs non vides)"
grep -cE '^(DEMO_PASSWORD|DEMO_DOCTOR_PASSWORD)=.+' .env

section "Comptes de démonstration en base (id, rôle, mdp défini, changement imposé, désactivé)"
sql "SELECT id, role, password_hash IS NOT NULL, must_change_password, disabled_at IS NOT NULL FROM nova_users WHERE id IN ('user-001','user-002','user-doc-001','user-ph-001','user-admin-001','user-gov-001') AND deleted_at IS NULL"
echo "(aucune ligne = aucun compte de démo)"

section "Administrateurs réels actifs (hors compte de démo)"
sql "SELECT COUNT(*) FROM nova_users WHERE role='admin' AND deleted_at IS NULL AND disabled_at IS NULL AND id<>'user-admin-001'"

section "Patients en attente d'activation (mot de passe provisoire jamais changé)"
sql "SELECT COUNT(*) FROM nova_users WHERE role='patient' AND must_change_password=1 AND password_hash IS NOT NULL AND deleted_at IS NULL"

section "Volume des documents (propriétaire numérique, nombre de fichiers, taille)"
docker compose exec -T api sh -c 'ls -lnd /app/data/uploads | awk "{print \"dossier uid=\" \$3}"; echo "fichiers: $(find /app/data/uploads -type f | wc -l)"; echo "non root: $(find /app/data/uploads ! -user 0 | wc -l)"; du -sh /app/data/uploads | cut -f1' 2>&1

section "Sauvegardes existantes et espace disque"
ls -l backups/ 2>&1 | tail -6
echo "nombre de fichiers : $(ls backups 2>/dev/null | wc -l) (dont .gpg : $(ls backups 2>/dev/null | grep -c '\.gpg$'))"
df -h . | tail -1
docker system df 2>&1 | head -4

section "Base : version MySQL et dernière migration appliquée"
sql "SELECT VERSION()"
sql "SELECT version FROM nova_schema_migrations ORDER BY version DESC LIMIT 2"
echo "(attendu avant déploiement : 20261113_13_admin_email ; après : 20261116_14_patient_activation)"

section "Prérequis du déploiement de $TARGET"
cv=$(docker compose version --short 2>/dev/null)
echo "docker compose : ${cv:-introuvable} (2.24 minimum pour deploy/docker-compose.rollback.yml)"
echo "BACKUP_DB_PASSWORD défini dans .env : $(grep -qE '^BACKUP_DB_PASSWORD=.+' .env && echo oui || echo non)"
echo "clé publique deploy/keys/backup-public.asc : $([ -s deploy/keys/backup-public.asc ] && echo présente || echo absente)"
echo "compte MySQL nova_backup : $(sql "SELECT COUNT(*) FROM mysql.user WHERE user='nova_backup'")"
echo "image de retour arrière nova-api:avant-20261116 : $(docker image inspect nova-api:avant-20261116 >/dev/null 2>&1 && echo présente || echo absente)"

echo
echo "Fin des contrôles (aucune modification effectuée)."
