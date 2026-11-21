# NOVA — Checklist de finalisation commerciale

Cette feuille de route distingue le pilote privé de la mise en production publique. Une tâche marquée **BLOQUANT** doit être terminée avant d'utiliser de vraies données médicales.

## Phase 0 — Décision d'architecture

- [ ] Conserver le backend Express actuel pour le pilote et éviter une réécriture immédiate.
- [x] Adopter une authentification médecin sans SMS : email + mot de passe fort + TOTP (application Authenticator).
- [x] Prévoir un mot de passe provisoire aléatoire remis par l'administrateur lors de la validation du médecin.
- [x] Prévoir des codes de récupération MFA hachés et utilisables une seule fois.
- [ ] Réserver `SMS_PROVIDER=demo` aux environnements locaux et de démonstration.
- [x] Interdire le démarrage public si `SEED_DEMO=true` ou `SMS_PROVIDER=demo`, sauf autorisation explicite de pilote privé.

## Phase 1 — Sécurité bloquante

- [x] **BLOQUANT** Mettre à jour les dépendances vulnérables, notamment Multer, Express, MySQL2, Morgan et `qs`.
- [x] **BLOQUANT** Relancer `npm audit --omit=dev` et obtenir zéro vulnérabilité élevée ou critique.
- [x] **BLOQUANT** Remplacer le mot de passe médecin de quatre caractères par une politique de 12 caractères minimum.
- [x] **BLOQUANT** Forcer le changement du mot de passe médecin initial à la première connexion.
- [x] **BLOQUANT** Ajouter TOTP obligatoire pour les médecins.
- [ ] Étendre mot de passe fort + TOTP aux pharmaciens et administrateurs avant leur ouverture publique.
- [x] Ajouter verrouillage temporaire après cinq échecs répétés.
- [x] Ajouter des codes de récupération sécurisés à usage unique pour le médecin.
- [x] Remplacer la blacklist JWT uniquement en mémoire par une table de révocation persistante.
- [x] Réduire la durée du jeton d'accès à 30 minutes.
- [ ] Ajouter l'écran de gestion/révocation de tous les appareils actifs.
- [ ] Vérifier la protection CSRF de toutes les mutations utilisant les cookies.
- [x] Créer un utilisateur MySQL NOVA non-root avec droits limités à la base NOVA dans Docker.
- [ ] Générer et faire tourner périodiquement tous les secrets de production.
- [ ] Protéger ou désactiver Swagger/OpenAPI en production.
- [ ] Ajouter une politique CSP stricte et vérifier les en-têtes Helmet.
- [ ] Ajouter une analyse antivirus des documents téléversés.
- [ ] Limiter le nombre de fichiers, champs multipart et requêtes volumineuses.
- [ ] Réaliser un audit des permissions pour chaque route et chaque rôle.
- [ ] Faire réaliser un test d'intrusion avant lancement.

## Phase 2 — Base de données et migrations

- [ ] **BLOQUANT** Remplacer la création/migration implicite au démarrage par des migrations versionnées.
- [ ] Ajouter une table de suivi des migrations et une procédure de retour arrière.
- [ ] Tester les migrations sur une copie anonymisée de la production.
- [ ] Uniformiser les dates en UTC avec un vrai type temporel.
- [ ] Uniformiser les colonnes JSON et leur validation.
- [ ] Ajouter les contraintes étrangères et contraintes d'unicité manquantes.
- [ ] Définir les règles de suppression logique et de conservation légale.
- [ ] Supprimer les tables, colonnes et rôles orphelins (`preparer`, `offline_queue`, etc.) ou les implémenter.
- [x] Renommer la base par défaut `sika_sante` en `nova` (prévoir une migration explicite pour toute base existante).
- [ ] Créer des index à partir de mesures réelles des requêtes lentes.

## Phase 3 — Stockage, sauvegardes et continuité

- [ ] **BLOQUANT** Chiffrer la base, les volumes, les documents et les sauvegardes au repos.
- [ ] **BLOQUANT** Mettre en place des sauvegardes automatiques chiffrées et hors serveur.
- [ ] **BLOQUANT** Tester une restauration complète et documenter le résultat.
- [ ] Définir RPO, RTO, durée de conservation et fréquence des tests de restauration.
- [ ] Migrer les documents vers un stockage objet privé compatible S3.
- [ ] Utiliser des liens temporaires et journaliser chaque téléchargement.
- [ ] Activer versionnage, réplication et règles de rétention des documents.
- [ ] Prévoir un plan de reprise après incident et un mode maintenance.

## Phase 4 — Tests et intégration continue

- [x] **BLOQUANT** Ajouter MySQL au workflow CI pour le test `workflow-security.test.js`.
- [ ] Séparer clairement tests unitaires, intégration et bout en bout.
- [ ] Créer des fixtures isolées et une base de test remise à zéro à chaque exécution.
- [ ] Tester tous les parcours : patient, médecin, pharmacien et administrateur.
- [ ] Tester refus d'accès, consentement expiré/révoqué et comptes suspendus.
- [ ] Tester création RDV, prescription, QR pharmacie, documents et messagerie.
- [ ] Tester rotation/révocation des sessions et récupération de compte.
- [ ] Tester les limites d'upload et fichiers malveillants.
- [ ] Ajouter tests navigateur mobile/desktop et principaux navigateurs.
- [ ] Ajouter tests d'accessibilité clavier, lecteur d'écran et contraste.
- [ ] Ajouter tests de charge, saturation, reprise et concurrence.
- [ ] Bloquer tout déploiement si tests, audit ou build échouent.

## Phase 5 — Fonctionnalités à terminer ou retirer des offres

- [x] Remplacer la date fixe passée du formulaire de rendez-vous par une date calculée.
- [ ] Terminer le parcours transfert de patient et consentement côté interface.
- [ ] Terminer la gestion des comptes et validation des professionnels dans l'administration.
- [ ] Vérifier numéro d'ordre, identité et établissement avant activation d'un médecin.
- [ ] Ajouter suspension, réactivation et historique des changements de statut.
- [ ] Brancher un vrai service pour la vidéo ou présenter clairement la fonction comme indisponible.
- [ ] Brancher Mobile Money ou retirer le paiement des offres initiales.
- [ ] Brancher les stocks pharmacie ou indiquer que la disponibilité n'est pas temps réel.
- [ ] Implémenter les notifications réelles ou limiter le lancement aux notifications internes.
- [ ] Implémenter la synchronisation hors ligne ou retirer cette promesse.
- [ ] Remplacer toutes les données et dates fictives visibles hors environnement de démonstration.
- [ ] Ajouter un onboarding et une assistance utilisateur.

## Phase 6 — Contenu médical et IA

- [ ] **BLOQUANT** Faire valider tous les conseils et messages par un comité médical ivoirien.
- [ ] Retirer les références françaises inadaptées (HAS, RPPS) ou les remplacer par le cadre local.
- [ ] Définir précisément ce que l'assistant peut et ne peut pas faire.
- [ ] Interdire diagnostic, prescription autonome et modification de traitement.
- [ ] Ajouter sources, version et date de validation de chaque contenu médical.
- [ ] Journaliser les réponses IA sans exposer inutilement les données personnelles.
- [ ] Effectuer une analyse de risque avant de connecter un fournisseur d'IA externe.
- [ ] Obtenir l'autorisation requise avant tout transfert de données médicales vers un tiers/pays tiers.
- [ ] Prévoir arrêt d'urgence et retour vers un professionnel humain.

## Phase 7 — Conformité et contrats

- [ ] **BLOQUANT** Engager la procédure de conformité auprès de l'Autorité de protection/ARTCI.
- [ ] Identifier officiellement le responsable du traitement.
- [ ] Désigner un correspondant à la protection des données.
- [ ] Tenir un registre des traitements et réaliser une analyse d'impact.
- [ ] Définir finalités, bases légales, destinataires et durées de conservation.
- [ ] Rédiger politique de confidentialité, CGU et contrats professionnels.
- [ ] Mettre en place droits d'accès, rectification, opposition, export et effacement.
- [ ] Encadrer légalement les sous-traitants et transferts internationaux.
- [ ] Définir la procédure de violation de données et de notification.
- [ ] Définir les règles applicables aux mineurs et représentants légaux.
- [ ] Documenter le consentement, sa preuve, son expiration et sa révocation.
- [ ] Souscrire les assurances professionnelles et cyber adaptées.

## Phase 8 — Production et exploitation

- [ ] **BLOQUANT** Installer HTTPS avec renouvellement automatique et redirection HTTP stricte.
- [ ] Séparer dev, test, préproduction et production avec secrets distincts.
- [x] Ajouter la vérification DB au healthcheck API.
- [ ] Étendre le healthcheck au stockage, à Redis et aux services externes.
- [ ] Ajouter logs structurés, centralisés, filtrés et sans données médicales en clair.
- [ ] Ajouter suivi erreurs, métriques, alertes, espace disque et disponibilité.
- [ ] Définir astreinte, escalade, runbooks et responsable de chaque incident.
- [ ] Ajouter déploiement sans interruption et stratégie de retour arrière.
- [ ] Ajouter WAF, limitation globale et protection DDoS.
- [ ] Scanner images Docker et dépendances à chaque livraison.
- [ ] Fixer les versions des images et supprimer les valeurs de secours faibles.
- [ ] Vérifier que `SEED_DEMO=false` et qu'aucun compte/code démo n'existe.

## Phase 9 — Pilote médecin sans SMS

- [x] Créer les médecins depuis l'administration après vérification manuelle de leur numéro d'ordre.
- [x] Remettre un mot de passe provisoire aléatoire affiché une seule fois.
- [x] À l'activation : définir un mot de passe fort et enregistrer une application Authenticator.
- [x] Exiger mot de passe + TOTP à chaque connexion médecin.
- [x] Fournir des codes de récupération copiables, hachés en base et consommables une seule fois.
- [ ] Limiter le pilote à une liste blanche de médecins et à des données fictives/anonymisées.
- [ ] Recueillir les retours, incidents et besoins dans un registre de pilote.
- [ ] Ne passer aux données réelles qu'après validation des phases sécurité, sauvegarde et conformité.

## Critères de lancement public

- [ ] Zéro vulnérabilité élevée ou critique connue.
- [ ] Tous les tests critiques passent automatiquement.
- [ ] Restauration de sauvegarde réussie et datée.
- [ ] Audit de sécurité et audit des permissions validés.
- [ ] Validation clinique des contenus terminée.
- [ ] Formalités réglementaires et contrats terminés.
- [ ] Monitoring et procédure d'incident opérationnels.
- [ ] Aucun mode, compte, code ou contenu de démonstration en production.
- [ ] Feu vert écrit des responsables technique, médical, sécurité et conformité.
