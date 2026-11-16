# Déploiement des correctifs du 16/11/2026 sur Hostinger

**Hébergement :** Hostinger Cloud Startup, application Node.js gérée (Express, Node 22.x), site `nova.mhtechconsulting.com`.
**Mise en ligne :** déploiement automatique (« Auto-deployment ») de la branche `feat/stabilite-connexion-pilote` à chaque push.
**En ligne au 16/11/2026 :** `09f873e`, déployé le 14/11/2026 17:31 (capture hPanel du tableau de bord).
**Version à déployer :** le commit de la branche `release/audit-2026-11-16` qui contient ce fichier.

Les étapes ⛔ modifient la production : elles attendent un feu vert explicite. ⚠️ = critère d'arrêt de la bascule.
La section 9 sépare ce qui a été vérifié de ce qui reste à confirmer.
Variante VPS / Docker Compose (sans objet ici) : `docs/SAUVEGARDES.md` et `deploy/docker-compose.rollback.yml`.

## 0. Ce qui change avec cette version

| Sujet | Changement | Impact Hostinger |
|---|---|---|
| Documents | Dossier configurable `UPLOAD_DIR` ; `/api/health` indique `uploads` (inscriptible ?) et `uploadsStorage` (`app` = dans le code, `external` = hors du code) | ⛔ à configurer (§4) : sinon les documents restent dans le dossier du code, exposé aux redéploiements |
| Base | Migration `20261116_14_patient_activation` : 3 colonnes **nullables**, aucune donnée modifiée | automatique au premier démarrage |
| Accès dossier | Partage donné en réservant : 90 jours à compter du partage | aucune action |
| Comptes démo | Plus de mot de passe par défaut ; mots de passe publiés refusés | ⛔ désactivation (§6) |
| Activation patients | Code serveur à usage unique, 72 h ; fiche en main propre ou SMS | ⛔ anciens comptes en attente (§6) |
| Variables | Aucune nouvelle variable obligatoire ; `UPLOAD_DIR` (recommandée), `PATIENT_ACTIVATION_HOURS` (facultative) | §3 |

## 1. Contrôles en lecture seule (avant décision)

### 1.1 hPanel (Sites web → `nova.mhtechconsulting.com`)
| Écran | Contrôle | Attendu | ⚠️ Arrêt si |
|---|---|---|---|
| Tableau de bord → « Last deployment » | source, commit, branche, état | `ELNINO1er`, `09f873e`, `feat/stabilite-connexion-pilote`, « Completed » | autre commit ou état en échec : la production n'est pas celle décrite ici |
| Tableau de bord → « Auto-deployment » (menu) | branche suivie | **uniquement** `feat/stabilite-connexion-pilote` | plusieurs branches ou « toutes » : un push sur `release/…` déclencherait une mise en ligne |
| Deployments | historique, possibilité de redéployer un ancien déploiement | `09f873e` listé avec une action de redéploiement | aucune façon de redéployer un ancien commit : prévoir le retour arrière par Git (§8) |
| Environment variables | noms des variables (sans afficher les valeurs) | `NODE_ENV=production`, `SEED_DEMO=false`, `ALLOW_INSECURE_DEMO=false`, `ENABLE_API_DOCS=false`, `COOKIE_SECURE=true`, `OTP_LOGIN_ENABLED` absent/false, `SMS_PROVIDER` ≠ `demo`, aucune valeur pour `DEMO_PASSWORD`/`DEMO_DOCTOR_PASSWORD`, `WEB_ORIGIN=https://…`, `DB_*`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MFA_ENCRYPTION_KEY` présents | mode démo actif, secret absent |
| Databases | où est MySQL | base MySQL hPanel (nom, hôte) ou hôte externe ; le tableau de bord affiche « Database : None » | base introuvable : impossible de sauvegarder (§2) |
| Backups (hébergement) | sauvegardes automatiques de la base et des fichiers | fréquence, rétention, dernière date | aucune sauvegarde de la base : créer la sauvegarde manuelle avant tout (§2) |
| Advanced → SSH Access | SSH disponible | hôte, port, utilisateur | SSH indisponible : utiliser les requêtes SQL de `deploy/hostinger/` dans phpMyAdmin |
| Runtime logs | erreurs récentes | aucune erreur répétée | erreurs de base ou de démarrage en boucle |
| Hosting plan → ressources | marge disque et mémoire | ≥ 1 Go libre (sauvegarde + build) | disque presque plein |

### 1.2 Depuis n'importe quel poste
```bash
curl -sS https://nova.mhtechconsulting.com/api/health
```
Attendu (09f873e) : `{"ok":true,"service":"nova-api","database":"up"}`. **Vérifié le 16/11/2026 : identique.**

### 1.3 Par SSH, si disponible (dans le dossier de NOVA sur le serveur)
```bash
node deploy/verif-lecture-seule.mjs "$PWD"      # après déploiement ; avant, copier le fichier dans /tmp puis : node /tmp/verif-lecture-seule.mjs <dossier NOVA>
```
Lecture seule (session MySQL en `READ ONLY`). Affiche : Node et utilisateur, fichiers présents (indique 09f873e ou la nouvelle version), configuration non secrète, dossier des documents (propriétaire, inscriptible, nombre de fichiers), migrations, comptes de démo, administrateurs réels, patients en attente.
Sans SSH : phpMyAdmin → onglet SQL → contenu de `deploy/hostinger/01-verif-lecture-seule.sql` (mêmes contrôles côté base).

⚠️ Arrêt si : compte de démo utilisable (`mdp=1, désactivé=0`) **et** aucun administrateur réel (`admins_reels_actifs = 0`) — créer d'abord un administrateur réel ; dernière migration ≠ `20261113_13_admin_email`.

## 2. ⛔ Sauvegarde avant bascule et validation de restauration

1. hPanel → Databases → base de NOVA → phpMyAdmin → Exporter (méthode rapide, SQL), ou Backups → base → « Générer / Télécharger ».
2. Documents : par SSH `tar -czf ~/nova-uploads-avant.tar.gz -C <dossier des documents> .` ; sans SSH, Gestionnaire de fichiers → dossier `data/uploads` de l'application → Compresser → Télécharger.
3. Sur le poste, **chiffrer immédiatement** puis supprimer les copies en clair :
   `gpg -e -r <clé sauvegardes> export.sql.gz && gpg -e -r <clé sauvegardes> nova-uploads-avant.tar.gz` (clé : `docs/SAUVEGARDES.md`). Supprimer aussi l'archive temporaire sur le serveur.
4. Validation dans la base isolée locale :
   `bash deploy/hostinger/valider-restauration.sh export.sql.gz.gpg nova-uploads-avant.tar.gz.gpg`
   Attendu : `import : OK`, nombre de tables `nova_*`, dernière migration `20261113_13_admin_email`, compteurs cohérents avec §1.3, « absents de l'archive : 0 », « Sauvegarde validée ».
   ⚠️ Arrêt si l'import échoue ou si un document référencé manque à l'archive.

## 3. Préproduction (obligatoire pour la persistance des documents)

1. ⛔ hPanel → créer un second site Node.js (ex. sous-domaine `preprod.nova.mhtechconsulting.com`), source GitHub `ELNINO1er/Nova`, branche `release/audit-2026-11-16`, **base de données distincte** (copie de test ou vide), variables identiques à la production sauf `DB_*`, `WEB_ORIGIN`, secrets propres à la préproduction, `SEED_DEMO=false`.
2. Noter le chemin du dossier de l'application (SSH : `pwd` dans le dossier ; Gestionnaire de fichiers).
3. **Test sans `UPLOAD_DIR`** : se connecter avec un compte de test, envoyer un **document fictif**, vérifier qu'il se télécharge ; dans hPanel cliquer « Redeploy » ; retélécharger le document.
   - Toujours présent → le dossier du code est conservé par Hostinger (persistance à confirmer aussi sur un nouveau commit).
   - Introuvable (404/erreur) → le dossier du code est remplacé : `UPLOAD_DIR` est **indispensable**.
4. **Test avec `UPLOAD_DIR`** : créer un dossier hors du code (SSH : `mkdir -p ~/nova-preprod-data/uploads && chmod 700 ~/nova-preprod-data`), définir `UPLOAD_DIR=<chemin absolu>` dans Environment variables, redéployer, vérifier `/api/health` → `"uploads":"writable","uploadsStorage":"external"`, renvoyer un document fictif, redéployer, le retélécharger : il doit être présent.
5. Contrôles fonctionnels de préproduction : §7.

## 4. ⛔ Stockage persistant des documents en production

Chemin utilisé aujourd'hui par 09f873e : `<dossier de l'application>/data/uploads` (codé en dur).
1. Créer le dossier persistant hors du code : `mkdir -p ~/nova-data/uploads && chmod 700 ~/nova-data ~/nova-data/uploads`.
2. Copier les documents existants **avant** la bascule (vérification sha256, rien n'est supprimé ni écrasé) :
   `node /tmp/copy-uploads.js --from <dossier de l'application>/data/uploads --to ~/nova-data/uploads` (simulation), puis `--apply`.
   Attendu : `copiés et vérifiés (sha256) : N ; manquants à destination : 0`, conflits : 0. ⚠️ Arrêt sinon.
3. Ajouter `UPLOAD_DIR=<chemin absolu de ~/nova-data/uploads>` dans Environment variables (sans redéployer si hPanel le permet ; sinon le faire au moment du §5).
4. Après la bascule, relancer la copie (`--apply`) pour rattraper les documents envoyés entre l'étape 2 et la mise en ligne : attendu `à copier : 0` ou quelques fichiers, `manquants : 0`.

## 5. ⛔ Bascule

1. hPanel → Auto-deployment : confirmer la branche suivie (§1.1).
2. Publier sur la branche suivie (depuis le poste) : `git push origin release/audit-2026-11-16:feat/stabilite-connexion-pilote` (avance rapide depuis `09f873e`, sans forçage).
3. hPanel → Deployments : suivre le déploiement. ⚠️ Arrêt (retour arrière §8) si l'état n'est pas « Completed » ou si les Runtime logs montrent une erreur de démarrage ou de migration.

## 6. ⛔ Comptes existants (après la bascule, feux verts séparés)

| Action | Par SSH | Sans SSH (phpMyAdmin → SQL) | Attendu |
|---|---|---|---|
| Comptes de démo | `node server/scripts/disable-demo-accounts.js` puis `--apply` | `deploy/hostinger/11-desactivation-demo.sql` (prévisualisation puis transaction) | seuls les identifiants du seed **et** leur numéro d'origine ; N lignes modifiées = N prévisualisées |
| Anciens patients en attente | `node server/scripts/patient-activations.js legacy` puis `--days 7 --apply` | `deploy/hostinger/12-activations-anciennes.sql` | échéance +7 j, médecin créateur retrouvé ; patients activés jamais modifiés |

Mots de passe publiés chez des comptes légitimes : `PUBLISHED_PASSWORDS` saisi sans écho, `disable-demo-accounts.js --scan-passwords` (SSH uniquement).

Remise du code d'activation :
- **Fiche en main propre (par défaut)** : affichée une fois au médecin, remise en personne après vérification d'identité, usage unique, 72 h, « Nouveau code » si perdu. Risque résiduel : le médecin a vu le code.
- **SMS** : `SMS_PROVIDER=twilio` (+ `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`) ou `webhook` (+ `SMS_WEBHOOK_URL`, `SMS_WEBHOOK_TOKEN`) ; jamais `demo`. Essai uniquement vers un numéro de test autorisé, en préproduction d'abord. Non testé à ce jour.

## 7. Vérifications après mise en ligne

| Contrôle | Attendu | ⚠️ Arrêt / retour arrière si |
|---|---|---|
| `curl -sS https://nova.mhtechconsulting.com/api/health` | `{"ok":true,"service":"nova-api","database":"up","uploads":"writable","uploadsStorage":"external"}` | HTTP ≠ 200, `database` ≠ `up`, `uploads` = `read-only` |
| Deployments | dernier déploiement = commit de `release/audit-2026-11-16`, « Completed » | échec |
| Runtime logs | aucune erreur ; aucune ligne `[seed]` | erreurs en boucle, migration en échec |
| phpMyAdmin : `SELECT MAX(version) FROM nova_schema_migrations` | `20261116_14_patient_activation` | migration absente |
| Connexion médecin + Authenticator, « Alertes » | 185, 180, 100, 170 | connexion impossible |
| Document existant (patient de test) | se télécharge | 404 : documents non retrouvés → §4 étape 4 ou retour arrière |
| Nouveau document fictif | envoi puis téléchargement OK | échec d'écriture |
| « Nouveau patient » fictif | fiche d'activation (+72 h) ; connexion avec le code → choix du mot de passe ; code refusé ensuite | erreur |
| Onglet ouvert > 30 min | session renouvelée sans erreur | déconnexions répétées |

## 8. ⛔ Retour arrière vers 09f873e

1. **Neutraliser d'abord les codes d'activation en attente** (09f873e ignore leur échéance) :
   SSH : `node server/scripts/patient-activations.js pre-rollback` puis `--apply` ; sans SSH : `deploy/hostinger/10-pre-rollback.sql`.
   Attendu : N codes neutralisés = N prévisualisés ; patients activés non modifiés.
2. **Documents envoyés depuis la bascule** : 09f873e lit `<application>/data/uploads` et ignore `UPLOAD_DIR`. Recopier :
   `node /tmp/copy-uploads.js --from ~/nova-data/uploads --to <application>/data/uploads --apply` (sans écraser).
3. Relancer 09f873e : hPanel → Deployments → redéployer le déploiement `09f873e` (si proposé). Sinon, depuis le poste et après accord :
   `git push origin 09f873e:refs/heads/feat/stabilite-connexion-pilote --force-with-lease=feat/stabilite-connexion-pilote:<commit déployé>` (déclenche le déploiement automatique). Le prochain push sur la branche suivie remettra la nouvelle version.
4. Vérifier `/api/health` → `{"ok":true,...,"database":"up"}` (sans champ `uploads`).
5. Base : aucune restauration nécessaire (colonnes ajoutées nullables, ignorées par 09f873e). Restaurer la sauvegarde du §2 seulement en cas de corruption, après accord (les saisies postérieures seraient perdues).
6. **Reprise** (retour à cette version) : redéployer le commit `release/audit-2026-11-16` ; les comptes neutralisés apparaissent « Code expiré » dans « Activations en attente », le médecin clique « Nouveau code ».

## 9. État des vérifications

### Vérifié (environnement isolé : base `nova_test`, données fictives, Docker local)
| Domaine | Résultat |
|---|---|
| Production, accès public | `/api/health` 200 `database: up` (09f873e) ; `/api/docs` 404 ; `/uploads/` renvoie l'application (pas de fichiers) ; HSTS, CSP présents |
| Version à publier | suite complète **sous Node 22 et Node 24**, build de production ; dépôt propre recloné |
| Stockage | `UPLOAD_DIR` hors du code signalé `external` ; copie vérifiée sha256 sans écrasement ni suppression (tests) |
| Sauvegarde / restauration | export SQL chiffré (format phpMyAdmin/mysqldump) restauré dans `nova_restore_test` : 56 tables, compteurs ; document manquant détecté (code 1) |
| Requêtes `deploy/hostinger/*.sql` | 01 : lecture seule ; 10 : 3 codes neutralisés, puis **l'image 09f873e refuse** codes expiré/remplacé/valable et accepte le patient activé ; 11 : 6 comptes démo exacts ; 12 : ancien compte → +168 h, médecin créateur retrouvé |
| Retour arrière applicatif | image 09f873e démarre sur la base migrée ; lit et écrit des documents écrits par la nouvelle version |

### À confirmer dans hPanel / sur le serveur
- Commit et état du dernier déploiement, branche(s) suivie(s) par Auto-deployment, possibilité de redéployer `09f873e`.
- Variables d'environnement (noms et valeurs non secrètes), emplacement de MySQL, sauvegardes Hostinger (base et fichiers).
- Disponibilité de SSH et chemin du dossier de l'application ; Node réellement utilisé (22.x affiché).
- **Persistance des documents** au redéploiement (préproduction §3) — inconnue à ce jour.
- Envoi SMS (si retenu) vers un numéro de test autorisé.
