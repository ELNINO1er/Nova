> État actualisé : voir [la livraison du 28 octobre 2026](FINALISATION_2026-10-28.md). Les constats ou conclusions historiques ci-dessous doivent être lus avec ce complément.

# Mise en production de test : guide

Mis à jour le 27/10/2026, après la correction des bloquants techniques et le passage à la connexion par mot de passe.

## Qui crée quels comptes

**Connexion unique pour tous** : numéro à 10 chiffres (ex. 0749157741) + mot de passe. Comptes de test fictifs : voir `COMPTES_DE_TEST.md`.

| Compte | Créé par | Connexion |
|---|---|---|
| Admin | `npm run create:admin` (sur le serveur) | Numéro + mot de passe (12 caractères, symbole) |
| Médecin | Admin → Utilisateurs → Médecins | Numéro + mot de passe, puis application Authenticator |
| Pharmacien | Admin → Utilisateurs → Comptes & mots de passe | Numéro + mot de passe (8 caractères, lettre + chiffre) |
| Gouverneur | Admin → Utilisateurs → Comptes & mots de passe | Numéro + mot de passe (12 caractères, symbole). Accès : statistiques agrégées uniquement |
| Patient | Son médecin (bouton « Nouveau patient ») | Numéro + mot de passe (8 caractères, lettre + chiffre) |

- Chaque compte reçoit un **mot de passe provisoire**. Il n'est affiché qu'une fois, et l'utilisateur doit le changer à sa première connexion.
- **Mot de passe oublié ou compte bloqué** (après 5 erreurs, blocage de 15 minutes) : Admin → Comptes & mots de passe → « Réinitialiser ».
- **Le code par SMS est désactivé**, la connexion est gratuite. Pour le réactiver plus tard : `OTP_LOGIN_ENABLED=true` avec un fournisseur SMS (`twilio` ou `webhook`).

## Bloquants : statut

| # | Bloquant | Statut |
|---|---|---|
| 1 | Dépendances vulnérables | ✅ `npm audit` : 0 vulnérabilité (montée de `zod` en v4, tests OK) |
| 2 | Code non commité | ⏳ À faire : commit, puis passage de la CI |
| 3 | Code OTP visible par tous en mode démo | ✅ Remplacé par la connexion par mot de passe ; routes SMS coupées par défaut |
| 4 | HTTPS | ✅ Service `caddy` dans `docker-compose.yml` (certificat Let's Encrypt gratuit, automatique) |
| 5 | MySQL exposé | ✅ MySQL et l'API n'écoutent plus que sur `127.0.0.1` ; seul Caddy est public (80/443) |
| 6 | Sauvegardes | ✅ Service `backup` : dump MySQL et archive des documents chaque jour, conservés 14 jours dans `./backups` |
| – | Journal d'accès | ✅ `morgan` en format `combined` en production (`docker compose logs api`) |

## Déployer sur un serveur (VPS Linux avec Docker)

1. Faire pointer le nom de domaine (enregistrement A) vers l'IP du serveur, et ouvrir les ports 80 et 443.
2. Copier le projet, puis créer `.env` à partir de `.env.example` :
   - `DOMAIN=nova.mondomaine.ci`, `WEB_ORIGIN=https://nova.mondomaine.ci`, `COOKIE_SECURE=true`
   - des secrets longs et distincts pour `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` et `MFA_ENCRYPTION_KEY` (32 caractères minimum). Pour les générer : `openssl rand -base64 48`.
   - `SEED_DEMO=false`. Laisser `VITE_API_BASE_URL` vide.
3. Démarrer : `docker compose up -d --build`.
4. Créer le premier admin : `docker compose exec -e ADMIN_PHONE=07XXXXXXXX api node server/scripts/create-admin.js`. Le mot de passe provisoire s'affiche une seule fois. Pour choisir directement le mot de passe, ajouter `-e ADMIN_PASSWORD=...` : il ne sera pas affiché.
5. Se connecter en admin, puis créer les médecins, pharmaciens et gouverneurs. Les médecins créent ensuite leurs patients.
6. Vérifier : `https://<domaine>/api/health` doit répondre `{"ok":true,...}`, et `docker compose logs backup` doit montrer une première sauvegarde.

## Sauvegardes : copie hors serveur et restauration

- **Copie hors serveur** : chaque semaine au minimum, rapatrier `./backups` (avec `scp`, `rclone` ou un Google Drive gratuit). Un disque perdu fait perdre aussi les sauvegardes restées sur le serveur.
- **Restaurer la base** : `gunzip -c backups/nova-db-AAAA-MM-JJ_HHMM.sql.gz | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" nova'`
- **Restaurer les documents** : `docker compose run --rm -v "$PWD/backups:/b" --entrypoint sh api -c 'tar -xzf /b/nova-uploads-AAAA-MM-JJ_HHMM.tar.gz -C /app/data/uploads'`
- Faire un essai de restauration avant d'accueillir les premiers testeurs.

## Encore à faire

- **Commit et CI** : seul bloquant restant.
- **Parcours médecin** : le tester de bout en bout dans un navigateur, y compris le formulaire « Nouveau patient ». Il a seulement été vérifié côté serveur.
- **Sessions ouvertes** : réinitialiser un mot de passe ne ferme pas une session déjà ouverte. Elle expire au plus tard après 7 jours.
- **Correctifs P2 et P3** de `CORRECTIONS_STABILITE.md`, avant d'accueillir de vrais patients. Par exemple : un patient peut confirmer lui-même un RDV, et le retrait du consentement est ignoré.
- **Cadre légal** : la loi n° 2013-450 encadre les données de santé, avec une déclaration auprès de l'ARTCI. À traiter avant d'enregistrer de vraies données de santé.
