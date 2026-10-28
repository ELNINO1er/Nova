> État actualisé : voir [la livraison du 28 octobre 2026](FINALISATION_2026-10-28.md). Les constats ou conclusions historiques ci-dessous doivent être lus avec ce complément.

# NOVA — Rôles, parcours et plan de mise en cohérence

État au 28/10/2026, établi à partir du code (routes, services, schéma, interfaces) et non de la documentation existante.
Légende des statuts : ✅ opérationnel · 🟡 partiel · 🎭 fictif (simulé, données en dur, non persisté) · ⛔ absent.

## 1. Matrice des fonctions par rôle

### Patient
| Fonction | Statut | Constat principal |
|---|---|---|
| Identité, coordonnées | 🟡 | Changer le téléphone du dossier ne change pas l'identifiant de connexion ; sexe, naissance et groupe sanguin sont modifiables sans contrôle. |
| Dossier (consultations, résultats, vaccins, documents) | 🟡 | Le contenu des consultations n'est pas visible ; résultats, vaccins et traitements ne sont alimentés que par le seed. |
| Déclaré vs validé | ⛔ | Profil médical en une seule ligne JSON : le patient écrase les allergies saisies par le médecin. |
| Recherche de médecins | 🟡 | Filtrage côté client ; aucun critère de disponibilité. |
| Rendez-vous | 🟡 | Le patient peut se mettre lui-même en « confirmé » ; annulation = suppression physique ; le créneau n'est pas libéré. |
| Ordonnances et délivrance | 🟡 | Statuts `partial`/`dispensed` non traduits ; pas de détail par ligne. |
| Pilulier | 🟡 | Les ordonnances ne créent pas de prises : le pilulier d'un vrai patient est vide. |
| Messagerie | 🟡 | Personne ne peut ouvrir de conversation (seed uniquement) ; boutons d'appel et de pièce jointe sans effet. |
| Consentements | 🟡 | La révocation n'est pas appliquée côté médecin. |
| Historique des accès | 🟡 | Seule la fiche patient consultée par un médecin est tracée. |
| Export | 🟡 | Le PDF fonctionne mais partiellement ; le bouton « Exporter mes données » des paramètres ne fait rien. |
| Paramètres, sécurité | 🎭 | Seules 6 clés sont enregistrées, aucune n'est appliquée ; pas de changement de mot de passe ; « Supprimer le compte » sans action. |
| Proches | 🎭 | Relation déclarative, sans délégation. |
| Documents personnels vs actes | ⛔ | Aucune provenance ; le patient supprime tout document. |
| Urgence (Pass Santé) | 🎭 | Données et QR en dur dans la fenêtre du tableau de bord. |
| Téléconsultation | 🎭 | Écran d'appel statique présenté comme actif. |
| Assistant | 🟡 | Mots-clés locaux ; promet des réponses personnelles. |
| Score santé | 🟡 | Dossier vide = 96 « Excellent ». |
| Notifications | 🟡 | Liens cassés (`consents`, `patients`). |
| Paiement, assurance, commandes | 🎭 | Données de seed ; les commandes ne sont jamais traitées par la pharmacie. |

### Médecin
| Fonction | Statut | Constat principal |
|---|---|---|
| Profil et disponibilités | 🟡 | Profil en lecture seule ; créneaux uniquement par seed. |
| Agenda, demandes | 🟡 | Aucune règle de transition ; pas de notification au patient. |
| Accès aux dossiers | 🟡 | Accès accordé par tout lien passé ; révocation ignorée ; listes « patients » et « suivi chronique » sans contrôle. |
| Allergies avant un acte | 🟡 | Visibles dans la fiche, absentes des formulaires de consultation et d'ordonnance. |
| Consultation brouillon → validée | 🟡 | Toujours créée « terminée » ; modifiable silencieusement ensuite. |
| Ordonnance structurée | 🟡 | Pas de lien avec la consultation, pas de quantité, pas d'annulation. |
| Analyses et résultats | 🎭 | Demandes jamais suivies ; aucun moyen de saisir un résultat. |
| Adressages | 🟡 | API sans interface. |
| Messagerie | 🟡 | Pas de contrôle d'accès à l'envoi. |
| Signature | 🎭 | Mentions « Conforme ANAM », « chiffrée » et « apposée automatiquement » fausses. |
| Assistant | 🎭 | Mots-clés, présenté comme « Analyse clinique intelligente ». |
| Téléconsultation | 🎭 | Idem patient. |
| Notifications | ⛔ | Créées mais jamais affichées au médecin. |

### Pharmacien
| Fonction | Statut | Constat principal |
|---|---|---|
| Vérification par QR | ✅ | Signée ; mais la lecture et la délivrance sont aussi possibles par simple identifiant d'ordonnance. |
| Quantités et reliquat | ⛔ | Aucune quantité prescrite n'est stockée. |
| Délivrance complète ou partielle | 🟡 | Statut déclaré par le client, non contrôlé. |
| Refus, substitution | 🟡 | API sans interface ; justification non exigée. |
| Double délivrance | ⛔ | Ni verrou transactionnel ni clé d'idempotence. |
| Données exposées | ✅ | Minimisées (prénom, initiale, CMU masqué, lignes). |
| Historique | ✅ | Limité à 50 lignes, sans pagination. |
| Stock, proximité | 🎭 | `distance_km` statique. |

### Santé publique (`governor`)
| Fonction | Statut | Constat principal |
|---|---|---|
| Indicateurs agrégés | 🟡 | Comptages bruts. |
| Filtres période et zone | ⛔ | Périodes fixes. |
| Petits effectifs | ⛔ | Un effectif de 1 par ville, sexe ou âge est affiché. |
| Méthodologie, couverture | ⛔ | Seule la date de génération est affichée. |
| Export | ⛔ | Absent. |

### Administrateur technique
| Fonction | Statut | Constat principal |
|---|---|---|
| Comptes, mots de passe | ✅ | Audité. |
| Validation des professionnels | 🎭 | Un médecin créé est « vérifié » d'office. |
| Accès aux données médicales | 🟡 | Bloqué par les gardes de rôle, mais le rôle admin possède en base toutes les permissions patient et médecin. |

### Transverse (sessions)
- **Déconnexion :**
  - masquée sous 640 px ;
  - déclenchée en cliquant sur l'identité du compte ;
  - les erreurs sont ignorées.
- **Course entre renouvellement et déconnexion :** un renouvellement en cours peut recréer les cookies après la déconnexion.
- **Plusieurs onglets :** aucune synchronisation.
- **Renouvellement :** il ne revérifie pas le compte en base. Un compte suspendu garde l'accès jusqu'à 7 jours.

## 2. Parcours de soins cible

| Étape | Acteur | Données | Autorisation | États | Notification | Trace |
|---|---|---|---|---|---|---|
| Recherche de médecin | Patient | Spécialité, ville, disponibilité | Patient connecté | — | — | — |
| Demande de RDV | Patient | Créneau ou date, mode | Propriétaire du dossier | → `requested` | Médecin | Historique RDV |
| Réservation d'un créneau | Patient | Créneau `available` | Créneau verrouillé (FOR UPDATE) | Créneau `booked`, RDV `confirmed` | Médecin | Audit |
| Confirmation ou refus | Médecin | RDV | Médecin du RDV | `requested` → `confirmed` / `cancelled` | Patient | Audit |
| Annulation | Patient ou médecin | RDV | Auteur autorisé | → `cancelled` (jamais supprimé), créneau libéré | L'autre partie | Audit |
| Consultation | Médecin | Contexte, allergies | Accès au dossier (§3) | `draft` → `completed` ; correction = avenant tracé | Patient (à la validation) | Historique médical + audit |
| Ordonnance | Médecin | Lignes avec quantité | Accès au dossier | `active` → `partial` → `dispensed` ; `cancelled` par le prescripteur ; `expired` calculé | Patient | Audit |
| Demande d'analyse | Médecin | Type, motif | Accès au dossier | `pending` → `completed` / `cancelled` | Patient | Audit |
| Délivrance | Pharmacien | QR de l'ordonnance | Officine du pharmacien, QR valide | Reliquat décrémenté ; refus motivé | Patient et prescripteur | Délivrance + lignes + audit |
| Suivi | Patient | Prises | Propriétaire | `taken` / `missed` / `skipped` | — | — |
| Indicateurs | Santé publique | Agrégats | Permission `governor.stats` | — | — | Audit des exports |

## 3. Règle d'accès d'un médecin au dossier d'un patient (décision)

Un médecin accède au dossier si et seulement si **aucune révocation explicite n'est en vigueur** et que l'une des conditions suivantes est remplie :
1. un consentement `granted` non expiré existe ;
2. une relation de soins en cours existe :
   - un RDV non annulé, à venir ou datant de moins de 90 jours ;
   - ou un acte (consultation, ordonnance, analyse) de ce médecin datant de moins de 12 mois.

- **La révocation par le patient prime toujours.** Elle est appliquée dès la requête suivante.
- **Création d'un patient :** le médecin qui crée le patient reçoit un consentement `granted`.
- **Gardes :** chaque endpoint médecin qui lit ou écrit des données d'un patient passe par cette règle, y compris les listes.

## 4. Hypothèses retenues (documentées)

- **Rôle `governor` :**
  - correspond à une autorité de santé publique en lecture seule ;
  - le code technique est conservé pour ne pas casser les comptes, et l'interface l'affiche comme « Santé publique » ;
  - il n'existe pas de notion de zone autorisée dans le modèle actuel ; le filtre de zone porte sur la ville du patient.
- **Résultats d'analyses :** il n'existe pas de rôle laboratoire. Les résultats sont saisis par le médecin prescripteur, avec la provenance déclarée (nom du laboratoire). Aucun rôle laboratoire n'est créé implicitement.
- **Téléconsultation, paiement, SMS :** aucun service n'est intégré. Les fonctions sont présentées comme « non disponibles » et non simulées.
- **Assistant :** il reste local (aucune donnée médicale envoyée à l'extérieur). Il est présenté comme une aide à la navigation et une source d'informations générales.
- **Score santé :** indicateur interne non clinique. « Données insuffisantes » s'affiche si moins de 2 types de constantes ont été mesurés dans les 90 derniers jours.

## 5. Plan priorisé (lots)

1. **Sessions, permissions, consentements, comportements trompeurs :**
   - menu de compte et déconnexion fiables, synchronisation entre onglets ;
   - renouvellement qui revérifie le compte ;
   - règle d'accès §3 ;
   - transitions des RDV côté patient ;
   - QR obligatoire en pharmacie ;
   - permissions de l'admin ;
   - honnêteté de la téléconsultation, de l'assistant, de la signature, du Pass Santé et du score ;
   - paramètres persistés ou retirés ;
   - liens de notification.
2. **Données :** transitions validées côté serveur, transactions, pagination conservée, invalidation des données après modification, anti-doubles soumissions.
3. **Parcours de soins :** consultation brouillon → validation → avenant ; ordonnance avec quantités et lien à la consultation ; délivrance avec reliquat, idempotence et verrou ; résultats d'analyses ; notifications du médecin.
4. **Santé publique :** filtres, seuil de petits effectifs, méthodologie, export agrégé.
5. **Navigation et accessibilité :** menus par tâches, routage par URL.
6. **Documentation et vérification globale.**

## 6. Avancement

### Lot 1 — terminé (28/10/2026)
- **Accès aux dossiers :**
  - règle §3 centralisée dans `server/services/access.js` et appliquée à la fiche, aux listes (patients, suivi chronique, compteurs), aux actes et à la messagerie ;
  - la révocation est effective à la requête suivante ;
  - le médecin qui crée un patient reçoit un consentement explicite.
- **Équipe de soins côté patient :**
  - onglet « Qui a accès » (Vie privée) : origine de chaque accès, révocation ou rétablissement ;
  - API `/patient/me/care-team`, auditée ;
  - décisions de consentement horodatées à la milliseconde : la plus récente fait foi.
- **Sessions :**
  - menu de compte sur tous les écrans ;
  - déconnexion confirmée par le serveur, avec message d'erreur et nouvel essai en cas d'échec ;
  - aucun renouvellement pendant une déconnexion ;
  - synchronisation entre onglets ;
  - remise à zéro de l'état au changement de compte ;
  - le renouvellement relit le compte en base.
- **Rendez-vous** (`server/services/workflow.js`) :
  - transitions validées côté serveur ; le patient ne peut que demander, déplacer ou annuler ;
  - annulation conservée et idempotente, créneau libéré ;
  - double réservation et date passée refusées ;
  - l'autre partie est notifiée.
- **Pharmacie :** le QR de l'ordonnance est exigé pour la lire et la délivrer.
- **Admin :** permissions limitées au module d'administration, aussi sur les bases existantes.
- **Comportements trompeurs retirés :**
  - téléconsultation simulée ;
  - Pass Santé en dur (désormais vraies données et QR lisible, conforme au réglage du patient) ;
  - mentions de signature « certifiée » et identités codées en dur ;
  - assistants présentés comme une « IA clinique » ;
  - score favorable sur dossier vide (« Données insuffisantes ») ;
  - paramètres non appliqués et boutons sans action ;
  - numéros d'urgence français (désormais SAMU 185, pompiers 180, police 170) ;
  - liens de notification cassés.
- **Tests :** 53/53, dont des tests d'intégration sur la base (accès, révocation, rendez-vous, QR) ; fichiers de test exécutés en séquence.
- **Limites restantes (lots suivants) :**
  - quantités et reliquat de délivrance, idempotence et verrou ;
  - consultation brouillon et avenant ;
  - résultats d'analyses ;
  - notifications côté médecin ;
  - pagination et invalidation côté client ;
  - indicateurs de santé publique ;
  - routage par URL.
