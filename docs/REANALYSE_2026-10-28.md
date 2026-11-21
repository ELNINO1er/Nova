> État actualisé : voir [la livraison du 28 octobre 2026](FINALISATION_2026-10-28.md). Les constats ou conclusions historiques ci-dessous doivent être lus avec ce complément.

# Réanalyse de NOVA — 28 octobre 2026

## Version réellement examinée

- Dossier : `C:\wamp64\www\Nova`.
- Branche : `feat/stabilite-connexion-pilote`.
- HEAD local et distant : `6e1345fc29f59ad78cdeb8725d80f742e8b78a46`.
- Aucun nouveau changement applicatif local détecté avant cet audit ; seul `.claude/` est non suivi.
- `main` distant : `0f2b9dbd29c490283eb59d7d6430eb30a3c7beb9`.
- La PR #1 est verte : contrôle `test-and-build` réussi, exécution GitHub Actions 40676323104.

L'audit porte sur cette copie et cette branche. D'éventuelles évolutions dans un autre dossier, une autre branche ou un serveur déployé ne sont pas incluses.

## Vérifications effectuées maintenant

| Vérification | Résultat | Portée |
|---|---|---|
| `npm test` | 7 fichiers, **53 tests réussis**, aucun ignoré | Après exécution hors de la restriction Windows qui bloquait les renommages des fichiers temporaires Vitest |
| `npm run build` | **Réussi** | Compilation de production ; `dist/` régénéré |
| `npm audit --omit=dev --json` | **0 vulnérabilité signalée** | Registre npm réellement interrogé ; ne garantit pas l'absence de défauts applicatifs |
| `/api/health` | HTTP 200 | API locale et base disponibles |
| Frontend local | HTTP 200 | Port 5174 |
| Connexion patient fictif | HTTP 200 | Compte de test, aucun mot de passe personnel utilisé |
| Profil, constantes, rendez-vous, ordonnances, documents, vie privée, paramètres | Aucun écran d'erreur détecté pendant le parcours | Navigateur Chrome isolé ; lecture des pages, sans nouvelle prescription, paiement ni délivrance |
| Menu de compte | Présent | Vérification de sa présence, pas de nouvelle campagne multi-onglets |
| Navigation / actualisation | Défaut confirmé | Depuis Paramètres, recharger revient à l'accueil et conserve l'URL `/` |
| Analyse des services et transactions | Réalisée | Défauts de concurrence établis par lecture du code ; pas de double délivrance déclenchée sur les données existantes |

Les 53 tests ne couvrent pas l'ensemble du parcours patient → médecin → pharmacie ni toutes les autorisations HTTP.

## Bilan par rôle

| Rôle | Ce qui fonctionne ou a progressé | Ce qui reste incomplet |
|---|---|---|
| Patient | Connexion, lecture des pages, demandes de rendez-vous, annulation conservée, documents personnels, consentements, paramètres recentrés, vrai Pass Santé | Provenance du dossier, consultation détaillée, pilulier lié aux ordonnances, création de conversation, pagination, synchronisation des données, export complet |
| Médecin | Connexion par téléphone puis Authenticator, création patient, consultation, ordonnance, demande d'examen, agenda et contrôle central d'accès sur certains endpoints | Révocation sur toutes les routes, actes validés immuables, avenants, résultats d'analyses, disponibilités administrables, notification visible |
| Pharmacien | Vérification signée par QR, données minimisées, enregistrement d'une délivrance et historique officine | Quantités prescrites, reliquat, contrôle des lignes, concurrence et nouvelles tentatives ; parcours encore insuffisant pour une délivrance réelle |
| Santé publique (`governor`) | Accès séparé et agrégats sans noms ni téléphones individuels | Petits effectifs, définition des indicateurs, périodes correctes, périmètre territorial, filtres, qualité, export |
| Administrateur technique | Comptes, création d'accès, menus d'action, réinitialisation, audit, permissions métier retirées | Véritable suspension des comptes ; séparation renforcée lors de la récupération d'accès ; validation professionnelle explicite |

## Ce qui est réellement corrigé depuis l'ancien état

- Le menu de compte donne une action de déconnexion explicite, y compris sur mobile.
- La déconnexion attend la réponse du serveur et remonte une erreur réseau.
- La coordination locale entre refresh et déconnexion et la diffusion inter-onglets existent.
- Le refresh relit l'utilisateur et son rôle en base.
- La fiche patient, certaines listes et la création d'actes passent par `services/access.js` ; une révocation coupe ces accès.
- Le patient ne peut plus confirmer lui-même sa demande de rendez-vous.
- L'annulation conserve le rendez-vous et cherche à libérer son créneau.
- Le QR est requis par les routes pharmacie de lecture et de délivrance.
- L'admin ne possède plus automatiquement les permissions médicales en base.
- La fausse téléconsultation est remplacée par une explication d'indisponibilité.
- Le Pass Santé utilise les données du patient connecté ; son QR contient du texte lisible.
- Les assistants et la signature ont des libellés plus honnêtes.
- Le score renvoie « Données insuffisantes » avec trop peu de constantes récentes.
- Les paramètres non appliqués ont été retirés ou recentrés.

Ces corrections ne rendent pas pour autant tous les contrôles exhaustifs : les limites ci-dessous ont été revérifiées dans le code actuel.

## Priorité 1 — bloque un usage réel fiable

### 1. Révocation d'accès non appliquée à toutes les lectures et modifications médicales

**Sources :** `server/services/doctor.service.js:166`, `:329`, `:502`, `:1019`.

La fiche patient vérifie le consentement, mais la liste des consultations, le détail d'une ordonnance, la lecture d'une conversation et la modification d'une consultation vérifient principalement le médecin propriétaire. La règle centrale n'est pas appelée partout. Certaines lectures d'agenda, du tableau de bord et de demandes d'examen exposent aussi des données sans filtrage par accès courant.

**Conséquence :** retirer un accès ne signifie pas encore que toutes les données deviennent inaccessibles. L'affirmation antérieure « appliquée aux fiches, listes, actes et messages » était trop générale.

**Correction :** définir les actes que le médecin doit légalement conserver en tant qu'auteur, les distinguer du dossier partagé, puis appliquer cette règle sur chaque ressource et chaque liste. Ajouter des tests HTTP après révocation, pas seulement le test de la fiche.

### 2. Consultations validées modifiables sans avenant

**Sources :** `server/services/doctor.service.js:329`, `src/doctor/pages/DCons.jsx:143`.

Le PATCH écrase les champs cliniques et permet de repasser de `completed` à `draft`. Le contenu précédent n'est pas conservé ; `completed_at` et l'historique médical ne suivent pas correctement la correction. La route de modification n'a pas de journal d'avenant.

**Correction :** validation explicite, version finale immuable, correction avec raison, auteur, date et lien à la version précédente.

### 3. Ordonnance sans quantité prescrite ni calcul du reliquat

**Sources :** `server/db/database.js:344`, `server/services/pharmacy.service.js:228`.

Les lignes stockent médicament, dosage, fréquence et durée, mais aucune quantité délivrable structurée. Le serveur ne compare pas les quantités demandées à un total autorisé. Le client choisit `full` ou `partial`.

**Conséquence :** des délivrances partielles répétées peuvent dépasser la prescription ; une seule ligne peut faire clôturer toute l'ordonnance.

**Correction :** quantité et unité prescrites, somme des délivrances, reliquat par ligne et statut calculé côté serveur.

### 4. Double délivrance et lignes étrangères possibles

**Sources :** `server/services/pharmacy.service.js:193`, `:217`, `:228`, `:244`.

Le statut est contrôlé avant la transaction. La relecture ne verrouille pas l'ordonnance. Deux appels peuvent passer le contrôle ensemble. La boucle n'établit pas que chaque ligne appartient à l'ordonnance ni qu'elle apparaît une seule fois. Une clé d'idempotence manque. Des lectures après le commit peuvent produire une erreur alors que la délivrance a déjà été enregistrée.

**Correction :** verrou sur ordonnance et lignes, validation d'appartenance, calcul des reliquats dans la transaction, clé d'idempotence unique, réponse rejouable et notifications hors du résultat critique.

### 5. Rendez-vous : protection insuffisante contre les doubles réservations

**Sources :** `server/services/workflow.js:35`, `server/services/patient.service.js:229`, `:609`, `server/services/doctor.service.js:134`.

Le contrôle de disponibilité puis l'insertion sont deux opérations séparées. Le test actuel couvre une deuxième réservation séquentielle, pas deux réservations simultanées. Le chemin `bookSlot` verrouille un créneau mais ne vérifie pas tous les rendez-vous déjà saisis ; l'autre chemin ne réserve pas ce créneau. Les déplacements n'assurent pas partout la cohérence des deux tables.

**Correction :** un mécanisme transactionnel unique pour tous les points d'entrée, lien rendez-vous–réservation, dates normalisées et exclusivité imposée par la base.

### 6. « Suspendre le médecin » ne suspend pas son compte

**Sources :** `src/admin/AdminPages.jsx:317`, `server/services/admin.service.js:227`, `server/services/auth.service.js:235`.

L'action modifie `nova_doctors.is_available`. La connexion ne contrôle pas ce champ. Elle retire essentiellement une possibilité de prise de rendez-vous ; elle ne désactive pas l'utilisateur et ne révoque pas ses sessions.

**Correction :** séparer disponibilité de l'agenda, validation professionnelle et état du compte ; un état de compte suspendu doit être vérifié par l'authentification et provoquer une révocation.

### 7. Réinitialiser un mot de passe laisse les anciennes sessions valides

**Sources :** `server/services/admin.service.js:305`, `server/services/auth.service.js:285`, `server/routes/auth.routes.js:205`, `server/middleware/auth.js:66`.

Ni le reset ni le changement volontaire n'invalident les jetons déjà remis. Le refresh ne compare pas une version de session ou une date de changement du mot de passe.

**Conséquence :** une personne disposant d'anciens jetons peut rester connectée et renouveler son accès après le reset. Il ne faut pas promettre une déconnexion générale au bout de 30 minutes.

**Correction :** version de session ou sessions persistées, incrémentée/révoquée lors des actions sensibles ; contrôle au refresh et sur les requêtes protégées selon la politique choisie.

### 8. Pas de distinction entre information déclarée et validée

**Sources :** `server/services/patient.service.js:544`, `:758`, `server/services/doctor.service.js:987`, `server/services/medical-profile.js`.

Les constantes et le profil médical ne portent pas de provenance exploitable. Le patient et le médecin utilisent des structures communes ; une modification peut écraser des allergies ou maladies sans attribution ni historique. La normalisation des anciens objets perd certains détails structurés, dont la sévérité.

**Correction :** auteur, origine, date d'observation, statut de validation et conservation des versions ; distinguer les déclarations du patient des observations professionnelles.

### 9. Sauvegarde pouvant annoncer un succès après un échec du dump

**Source :** `deploy/backup.sh:11`.

Le test porte sur le pipeline `mysqldump | gzip`. Avec le shell utilisé, son statut est celui de la dernière commande ; `set -e` ne suffit pas à détecter l'échec de `mysqldump` dans ce pipeline. Si le dump échoue et gzip réussit, une archive vide ou incomplète peut être renommée comme sauvegarde réussie.

**Correction :** contrôler séparément le statut du dump et la compression, ou employer explicitement un shell avec propagation d'erreur du pipeline ; vérifier l'archive et tester sa restauration.

## Priorité 2 — parcours, informations et expérience incomplets

1. **Consentements par périmètre non appliqués.** `access.js:30` vérifie l'accord global mais pas le contenu de `scope`. Un accord limité au profil ne limite pas les données rendues par la fiche. Enforcer les scopes ou proposer honnêtement un accord sur tout le dossier.
2. **Récupération de compte et séparation admin/médical.** `admin.service.js:305` remet un mot de passe utilisable par l'admin pour un compte patient. Les gardes de rôle ne suffisent pas à empêcher cette prise de contrôle. Définir un mécanisme de récupération ou d'assistance exceptionnel, justifié et audité.
3. **Résultats d'analyses : parcours absent.** Les demandes existent, mais pas de chaîne aboutie de saisie/import, provenance, validation et lecture par le patient. Aucun laboratoire n'est implicitement intégré.
4. **Messagerie amorcée par les données fictives.** Pas de parcours complet pour ouvrir une nouvelle conversation autorisée. Les notifications médecin ont un chargeur, mais pas de page rendue ni de navigation correspondante dans `DoctorPages.jsx`.
5. **Pilulier et prescription décorrélés.** Les prises d'un nouveau traitement ne sont pas générées par une ordonnance structurée ; les données fictives donnent une impression de continuité supérieure au parcours réel.
6. **Pagination perdue.** `src/patient/PatientPages.jsx:82` extrait `raw.data` et abandonne `raw.pagination`. Certaines listes restent limitées à 50 lignes sans parcours vers la suite.
7. **Actualisation incomplète.** `PDash.jsx:27` charge rendez-vous et historique une seule fois et masque leurs erreurs. « Actualiser » recharge l'endpoint principal mais pas ces blocs ; `PatientPages.jsx:74` réutilise les données déjà chargées. Le cache serveur du dashboard n'est pas invalidé après toutes les mutations pertinentes.
8. **Documents médecin : téléchargement cassé.** L'écran réutilise une URL de téléchargement réservée au patient. Le fichier médecin stocké sous `uploads/shared` est supprimé via un autre chemin ; l'erreur de suppression est ignorée (`doctor.service.js:1079`, `PDocs.jsx:203`).
9. **Export patient partiel et accents perdus.** `export.service.js:3` exporte surtout cinq rendez-vous et cinq ordonnances, sans dossier complet ; `:72` remplace les caractères non ASCII. Les identités accentuées sont déformées.
10. **Paiement déclaratif pouvant devenir « payé ».** `billing.service.js:73` enregistre directement `paid` si le patient déclare `method: cash`, via l'API patient. Une déclaration du patient ne constitue pas une confirmation de paiement par le professionnel.
11. **Distances pharmacie statiques.** `PPharmacy.jsx:125` affiche `distanceKm` comme une distance réelle sans géolocalisation vérifiée. La commande pharmacie n'a pas de boucle de traitement complète côté officine.
12. **Santé publique : petits effectifs visibles.** `governor.service.js:30` expose les effectifs exacts par ville, sexe et âge sans seuil ni suppression complémentaire. L'agrégation ne suffit pas à garantir l'anonymat.
13. **Santé publique : période mal bornée et statuts mélangés.** `governor.service.js:23` filtre par borne inférieure seule : les rendez-vous futurs sont inclus dans « 30 jours », et certains comptages ne distinguent pas brouillons, annulations et suppressions. Les mois sans événement ne sont pas explicitement renvoyés.
14. **Santé publique : filtres, méthodologie, couverture et export absents.** Le rôle conserve un périmètre national implicite, sans rattachement territorial ni définitions versionnées des indicateurs.
15. **Routage toujours en mémoire.** `App.jsx:91` conserve la page dans `useState`. Actualiser perd la sous-page ; Retour ne reflète pas les changements de menu. Vérifié dans le navigateur.
16. **Migrations non versionnées.** Les DDL restent dans `createTables()` au démarrage, sans registre de versions exécutées. Le correctif CI a réparé un ordre d'exécution, pas établi un mécanisme de migration versionné.
17. **Audit incomplet.** Le middleware intercepte `res.json`, ignore les échecs d'écriture et ne couvre pas uniformément les réponses 204/PDF. Il ne constitue pas à lui seul une trace complète, durable et indivisible avec l'acte.
18. **Documentation contradictoire.** Le guide `MISE_EN_PRODUCTION_TEST.md` mentionne encore « commit et CI : seul bloquant restant » et des défauts déjà corrigés ; la matrice initiale d'`ARCHITECTURE_ROLES.md` doit être lue avec son avancement, pas comme un état courant unique.

## Sessions : améliorations utiles, garanties encore limitées

- Le verrou de refresh est local au module JavaScript d'un onglet. Il n'exclut pas la rotation simultanée des jetons entre plusieurs onglets.
- La déconnexion attend un refresh local déjà commencé, mais n'établit pas une famille de sessions révoquées côté serveur.
- `verifyToken` ne relit pas l'état du compte à chaque accès ; une suppression en base peut laisser un access token actif jusqu'à son expiration.
- Le renouvellement des cookies repose sur plusieurs opérations séparées, sans consommation atomique unique de l'ancien refresh token.

Ces points méritent une campagne de tests sessions HTTP + multi-onglets dédiée.

## Ordre de correction conseillé

1. **Autorisations et comptes :** couverture exhaustive de la révocation, vraie suspension, version des sessions, récupération de compte clairement séparée de l'accès clinique.
2. **Actes et pharmacie :** consultation validée immuable, quantités prescrites, reliquats, transactions avec verrou, appartenance des lignes et idempotence.
3. **Agenda :** unifier réservation et rendez-vous, tester la concurrence réelle.
4. **Continuité du soin :** provenance, analyses, pilulier et conversations réellement utilisables hors seed.
5. **Données à jour et navigation :** pagination conservée, invalidation centralisée, erreurs explicites des blocs, URL et historique navigateur.
6. **Santé publique et exploitation :** petits effectifs, périodes et statuts corrects, méthode et export, sauvegardes contrôlées et restauration, migrations versionnées.
7. **Documentation et validation :** mettre les guides au niveau exact des fonctions vérifiées, compléter les tests critiques manquants et les parcours mobiles.

## Verdict

NOVA est présentable pour une démonstration privée avec des données fictives. L'interface et la base technique ont progressé, et les vérifications de compilation/tests/dépendances sont positives.

La continuité et les contrôles métier ne permettent pas encore de considérer la plateforme prête pour un usage réel avec des dossiers médicaux et des délivrances effectives. La CI verte ne couvre pas ces garanties manquantes.

Cet audit n'a modifié aucun fichier applicatif ni déployé de correction. Il ajoute uniquement ce rapport ; les tests existants peuvent initialiser la base de démonstration et créer puis nettoyer leurs données de test conformément à leur code.
