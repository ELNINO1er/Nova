# NOVA — Livraison du 28 octobre 2026

## Périmètre et décision de mise en test

Cette livraison complète progressivement le dépôt existant, sans réinitialiser les données. Elle permet un **pilote avec données fictives**, après configuration de l’hébergement. Elle ne constitue pas une validation de production avec des dossiers réels. Les contrôles listés comme non vérifiés ci-dessous restent nécessaires.

Le rôle technique `governor` est conservé pour compatibilité ; son nom visible est **Santé publique**. Son périmètre actuel est l’ensemble des agrégats NOVA autorisés à ce rôle. Aucune appartenance territoriale ou institutionnelle n’est inventée. L’administrateur technique conserve la gestion des comptes et ne reçoit pas de permission de lecture du dossier clinique.

## Matrice après corrections

| Rôle / parcours | État | Fonctionnement et limite |
|---|---|---|
| Tous : connexion, session, déconnexion | Opérationnel | Téléphone de dix chiffres ; MFA médecin conservée ; version de session serveur ; suspension effective ; rotation du refresh ; déconnexion révoquant les sessions du compte. |
| Patient : dossier et confidentialité | Opérationnel pour le périmètre décrit | Comptes rendus validés et avenants consultables ; déclarations personnelles séparées du dossier initial ; consentements et traces d’accès ; export JSON étendu et PDF résumé. La provenance des données historiques n’est pas requalifiée artificiellement. |
| Patient : soins et rendez-vous | Opérationnel | Recherche sur critères existants, réservation d’un créneau publié, demande directe, annulation, mise à jour ; verrou commun à toutes les écritures d’agenda. La vidéo est indisponible. |
| Médecin : consultation et prescription | Opérationnel | Brouillon, validation, avenant motivé sans écrasement de l’original ; quantités et unités obligatoires ; rattachement optionnel à une consultation validée ; horaires explicites alimentant le pilulier. |
| Médecin : profil et disponibilité | Opérationnel | Coordonnées professionnelles modifiables, publication/retrait de créneaux disponibles ; un créneau réservé ne peut pas être retiré. La modification d’une spécialité ou d’un numéro d’ordre reste administrative. |
| Analyses | Partiel, utilisable sans laboratoire connecté | Le prescripteur transcrit des valeurs et nomme le laboratoire d’origine ; demande et résultat sont liés ; répétition identique rejouée, remplacement silencieux refusé ; lecture détaillée par le patient et les médecins autorisés. L’identité du laboratoire et une signature externe ne sont pas certifiées. Pas d’interface de correction structurée du résultat validé. |
| Patient–médecin : messages | Opérationnel | Création de conversation sous contrôle d’accès, envoi transactionnel, notifications internes, clé de reprise et compteurs de non-lus propres au destinataire. La révocation interdit les nouveaux échanges cliniques. |
| Pharmacie : délivrance | Opérationnel | Référence QR signée fournie par le patient ; informations limitées ; reliquat serveur ; délivrance partielle/complète, refus motivé ; verrou transactionnel et clé de reprise ; auteur/officine/lignes conservés. La substitution justifiée est contrôlée par l’API, sans formulaire dédié dans cette livraison. |
| Santé publique | Partiel, réservé au pilote | Période et ville, définitions, couverture, date de calcul, petits effectifs masqués et suppression complémentaire, CSV protégé côté serveur. Aucune donnée individuelle. Une analyse de résistance aux recoupements entre requêtes reste nécessaire avant un usage avec des données réelles. |
| Proches | Annuaire personnel uniquement | Aucun accès clinique accordé par un lien familial déclaré. Représentation légale et délégation ne sont pas implémentées. |
| Services externes | Indisponibles tant qu’ils ne sont pas intégrés | Vidéo, paiement mobile/assurance et transmission des commandes en pharmacie ne produisent pas de faux succès. Stock et proximité ne sont pas présentés comme mesurés. L’assistant local reste explicitement limité. |

## Lots livrés

### 1. Sessions, permissions, consentements et sincérité des commandes

- Chaque requête authentifiée vérifie le compte, son rôle, sa suspension et sa version de session.
- Changement/réinitialisation du mot de passe et suspension révoquent les sessions ; les challenges de réinitialisation sont invalidés.
- Le renouvellement prend un verrou de compte et consomme atomiquement le refresh. La déconnexion révoque le compte même si son refresh vient d’être remplacé.
- L’interface partage le renouvellement entre onglets lorsque Web Locks est disponible. Une indisponibilité réseau n’est plus présentée comme une expiration certaine.
- Les lectures cliniques et écritures sensibles du médecin contrôlent l’accès au patient ; les listes et transferts sont filtrés. Un transfert ne crée plus de rendez-vous fictif ni d’autorisation implicite.
- L’inscription d’un patient produit une **demande** de consentement. Le patient doit l’accepter ; le seed fictif accorde explicitement ses consentements de démonstration.
- Le partage proposé est le dossier clinique complet, révocable ; le produit ne promet pas de partage par rubrique. La relation de soins préexistante conserve la politique du dépôt : 90 jours pour un rendez-vous et 365 jours pour un acte, avec priorité à la révocation explicite.
- Les décisions d’accès sont ajoutées à l’historique, sérialisées et horodatées ; une ancienne demande traitée ne doit pas annuler une révocation ultérieure.
- Réinitialisation administrative du mot de passe patient désactivée : elle permettrait à un administrateur d’usurper le patient. Un parcours de récupération avec vérification d’identité reste à fournir.
- Aucun numéro CMU n’est fabriqué pour compléter un champ absent. Les nouveaux médecins ne reçoivent plus une note et une expérience fictives par défaut.

Fichiers principaux : `server/middleware/auth.js`, `server/routes/auth.routes.js`, `server/services/access.js` (politique conservée), `server/services/{auth,admin,patient,doctor,mfa}.service.js`.

### 2. Données et opérations indivisibles

- Migrations additives enregistrées dans `nova_schema_migrations`, protégées par un verrou MySQL ; les champs historiques sans quantité restent inconnus.
- Verrou de médecin partagé pour les réservations directes et celles du calendrier ; une seule réservation concurrente aboutit. Annuler libère le créneau correspondant.
- Déclarations médicales versionnées séparément ; constantes avec auteur et provenance.
- Les paramètres existants restent appliqués ; les pages patient préservent les métadonnées et commandes de pagination.
- Invalidation du cache serveur après mutation ; pages rechargées après mutation et au retour au premier plan ; diffusion de l’invalidation entre onglets ; anciennes réponses ignorées par génération.
- Le rafraîchissement des tableaux recharge aussi leurs blocs secondaires et affiche leurs erreurs.

Fichiers principaux : `server/db/migrations.js`, `server/services/workflow.js`, `server/middleware/cache.js`, `src/api/client.js`, `src/{patient,doctor}/`, `src/pharmacy/PharmacyPages.jsx`.

### 3. Continuité des soins

- États : rendez-vous `requested → confirmed/cancelled`, avec annulation depuis `confirmed` ; les créneaux publiés sont préautorisés à la réservation. Un rendez-vous annulé n’est pas rouvert.
- Consultation `draft → completed` ; ensuite seuls des avenants motivés sont ajoutés. L’original reste lisible.
- Prescription `active → partial → dispensed`, ou annulation selon les routes existantes ; la validité est contrôlée à la délivrance. Le statut délivré est calculé à partir des quantités, jamais décidé uniquement par le navigateur.
- Demande d’analyse `pending → completed` via transcription par le prescripteur ; provenance, résultats et lien de demande conservés.
- Délivrance : contrôle de toutes les lignes, quantité cumulée, substitution justifiée côté API ; le refus ne consomme rien. Même clé et même opération : même résultat ; clé réutilisée avec un autre contenu : conflit.
- Pilulier : aucune déduction à partir d’une phrase de posologie. Seuls les horaires et la durée explicitement saisis par le médecin créent un plan lié aux lignes de prescription ; les prises n’altèrent pas l’ordonnance et sont sérialisées par horaire/jour.
- Notifications internes des prescriptions, comptes rendus, analyses, messages et délivrances enregistrées dans leur transaction. Les notifications ne constituent pas une preuve d’envoi de SMS.

Fichiers principaux : `server/services/{clinical,messaging,professional,doctor,patient,pharmacy,notification}.service.js`, routes associées et écrans des trois rôles.

### 4. Santé publique

Les indicateurs portent sur les données NOVA disponibles, pas sur la population ivoirienne. Les données nulles masquées ne sont pas affichées comme zéro. Les exports utilisent les mêmes restrictions serveur que l’écran. Le seuil courant est cinq ; une cellule complémentaire est masquée lorsqu’une seule cellule d’un tableau l’est initialement. Cela ne constitue pas une preuve d’anonymisation contre tous les recoupements.

Fichiers principaux : `server/services/governor.service.js`, `server/routes/governor.routes.js`, `src/governor/GovernorPages.jsx`.

### 5. Navigation et accessibilité

URL par rôle/page, restauration après actualisation et historique du navigateur ; menu patient regroupé autour du dossier, des traitements, des soins, des messages et du compte. Notifications médecin accessibles. Saisie protégée sur les consultations, prescriptions, transcriptions et profil professionnel ; avertissement de navigation et de fermeture. Piège de focus et Échap sur les fenêtres cliniques modifiées ; libellés de champs améliorés. Ce travail ne vaut pas audit complet d’accessibilité de toutes les pages historiques.

Fichiers principaux : `src/main.jsx`, `src/navigation.js`, `src/App.jsx`, `src/unsaved.js`, `src/components/useDialogFocus.js`, `src/layout/Sidebar.jsx`.

### 6. Vérification et exploitation

- Compilation Vite : réussie. Avertissement non bloquant : données Browserslist anciennes.
- Suite finale : **64 tests, 8 fichiers** sur MySQL local. Nouveau test de messagerie ajouté après la première vérification de la base vide.
- Initialisation sur une base MySQL temporaire vide : **63 tests réussis** au premier passage, puis **64 tests réussis** après l’ajout du test de messagerie et les dernières migrations. La base temporaire a été supprimée après vérification.
- Tests critiques : révocation puis nouvel accord ; isolation ; session suspendue/version modifiée ; réservation concurrente ; acte validé immuable et avenant ; délivrance partielle, reprise, ligne étrangère, excès et concurrence ; plan de prises et concurrence ; résultat de laboratoire et non-écrasement ; petits effectifs gouvernementaux ; messages idempotents et compteurs ; échecs de sauvegarde.
- Chrome : connexion patient et export JSON ; historique patient sur mobile 390 × 844 sans débordement ; connexion santé publique, rapport et refus de l’API patient ; pharmacie et refus de l’API patient ; médecin temporaire avec activation Authenticator, API des pages principales, profil sauvegardé, publication/doublon/retrait d’un créneau ; refus d’une navigation conservant le brouillon sur ordinateur 1440 × 1000. Le médecin temporaire et ses autorisations sont nettoyés après les essais.
- Sauvegardes : tests avec commandes de dump contrôlées, archive gzip vérifiée, absence de faux succès. **Restauration d’une sauvegarde réelle non effectuée.**
- CI avant publication : `test-and-build` vert sur `6e1345f`. Le résultat du nouveau commit dépend de la CI déclenchée par la publication ; ne pas confondre ces deux états.

## Limites avant données réelles

Récupération d’un compte patient après perte du mot de passe ; délégation aux proches ; correction structurée des résultats déjà validés ; certification/signature externe ; intégrations vidéo/SMS/paiements/stocks ; périmètres institutionnels de santé publique et analyse de réidentification ; restauration réelle, charge et audit exhaustif mobile/clavier/multi-onglets. Les vaccinations historiques ne sont pas déclarées validées par un professionnel sans provenance correspondante. Les notifications de quelques anciens parcours secondaires restent hors transaction.

Les contrôles de cette livraison n’établissent pas qu’un hébergement est configuré en HTTPS, que ses secrets sont corrects, ni qu’il est supervisé. Ne pas exposer les comptes fictifs et leurs mots de passe de démonstration sur une instance contenant des données réelles.
