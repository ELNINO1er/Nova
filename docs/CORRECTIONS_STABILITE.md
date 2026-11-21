# Corrections de stabilité — NOVA

Audit du 27/10/2026. Méthode : tests (38/38 OK) et build OK, parcours réels dans le navigateur (patient, pharmacien, admin), appels API, relecture complète du backend et du frontend.
Le parcours médecin n'a pas été testé en vrai (la première connexion change le mot de passe et active le TOTP) : ses constats viennent de la lecture du code.

Légende : ✅ reproduit ou certain d'après le code · 🔎 suspecté

---

## P0 — À corriger immédiatement (plantages, données fausses)

> **Statut 27/10/2026 : P0 corrigés (items 1 à 8).** En plus, l'icône `X` manquait aussi dans PDoctors, PPharmacy, PVax et PVitals (crash à l'ouverture d'une fenêtre) ; c'est corrigé. Les listes du profil médical sont maintenant normalisées en texte côté serveur (`server/services/medical-profile.js`). L'item 8 (délivrance partielle) n'a été vérifié qu'à la lecture du code.

| # | Où | Problème | Correction |
|---|---|---|---|
| 1 | `server/middleware/auth.js:96` | ✅ `decodeURIComponent` hors try dans `getCookie`, appelé par des middlewares `async` dont Express 4 ignore les rejets. Un cookie malformé (`nova_access_token=%E0%A4%A`) **fait tomber toute l'API**, même sans être connecté. Casse aussi `/logout`. | try/catch dans `getCookie` (retourner `null`) ; envelopper `requirePatient/Doctor/Pharmacist/Admin/Auth` dans un try/catch → `next(err)` ; ajouter `process.on('unhandledRejection')` et `uncaughtException` (log) dans `server/index.js`. |
| 2 | `src/patient/pages/PDNA.jsx:129` | ✅ Page **ADN Médical plante** : les allergies sont des objets `{id, name, reaction, severity}` rendus tels quels. | Afficher `typeof item === 'string' ? item : item.name` (+ réaction/sévérité). |
| 3 | `src/patient/pages/PUrgence.jsx:128` | ✅ Page **SOS Urgence plante**, même cause. | Idem : `{a.name ?? a}`. |
| 4 | `src/patient/pages/PWell.jsx:2` et `:25` | ✅ Page **Bien-être plante** : `Moon` importé sous le nom `MoonIcon` mais utilisé comme `Moon`. | Utiliser `MoonIcon` ligne 25 (ou importer `Moon`). |
| 5 | `server/db/database.js` (seed des constantes, ~l.1105) | ✅ Dates générées malformées (`2026-05-21T07:00:00:30:00.000Z`, 120 lignes en base) → « **NaN jours** » sur l'accueil, « **Invalid Date** » dans Mes constantes, graphiques faux. | Construire la date proprement (`d.setUTCHours(7,30)` puis `toISOString()`), puis corriger les lignes existantes (UPDATE ou re-seed). |
| 6 | `server/services/patient.service.js:1150` | ✅ Seuils de tension en mmHg alors que la valeur est en cmHg (`12/8` → 12) → une tension normale s'affiche « **Critique** » et fausse le score santé. | Convertir (`12` → `120`) avant comparaison, ou adapter les seuils (≥16 critique, ≥14 à surveiller, ≤9 bas). |
| 7 | `server/services/doctor.service.js:474` | ✅ `safeJson` fait `JSON.parse` sur un tableau déjà désérialisé par mysql2 → retourne `[]`. **Le médecin ne voit aucune allergie ni maladie chronique** de ses patients. | Reprendre la version de `patient.service.js:710` (`if (typeof value !== 'string') return value`). |
| 8 | `server/services/pharmacy.service.js:179` | ✅ Après une délivrance partielle (statut `partial`), l'ordonnance n'est **plus jamais délivrable** (exige `active`). | Accepter `active` **et** `partial`. |

## P1 — Sessions et erreurs (le sentiment « instable »)

> **Statut 27/10/2026 : P1 corrigés (items 9 à 17).** Le client API (`src/api/client.js`) ne rafraîchit la session que sur les 401 de session, partage un seul refresh, gère FormData, les réponses vides et un délai de 30 s. Les erreurs serveur passent par `middleware/errors.js` (Zod → 422, multer → 413/415, MySQL de saisie → 4xx, codes techniques masqués). Composants partagés : `src/components/PageError.jsx` et `src/components/ErrorBoundary.jsx`. Les items 18 (Urgences médecin) et 25 (bannière d'erreur patient par page) ont été corrigés au passage.

| # | Où | Problème | Correction |
|---|---|---|---|
| 9 | `src/App.jsx:84`, `src/api/authApi.js:3` | ✅ Au chargement, `/auth/me` n'essaie jamais le refresh. Jeton d'accès = 30 min → après une pause, **un rechargement renvoie à l'écran de connexion** alors que le refresh (7 j) est valide. | Sur 401 de `/auth/me` : appeler `/auth/refresh` une fois puis réessayer (ou passer par `request` de `client.js`). |
| 10 | `src/api/client.js:29` | ✅ Tout 401 est traité comme « session expirée », y compris les 401 métier (QR d'ordonnance invalide → `pharmacy.service.js:56`). Un mauvais scan peut **déconnecter le pharmacien**. | Ne rafraîchir que sur `invalid_token`/`unauthorized` ; côté serveur, renvoyer 400/422 pour un QR invalide. |
| 11 | `src/api/patientApi.js:78`, `doctorApi.js:66` | ✅ `uploadDocument` contourne `client.js` → pas de refresh : upload après 30 min = échec 401. | Mutualiser la logique refresh/retry. |
| 12 | `server/routes/auth.routes.js` (tous les `.parse()`) | ✅ Une saisie invalide (`POST /otp/send {}`) renvoie **500 « Erreur interne »**. | `safeParse`/`validateBody`, ou mapper `ZodError` → 422 dans `middleware/errors.js`. |
| 13 | `server/middleware/upload.js:64` + `errors.js` | ✅ Fichier refusé ou trop gros → 500. | Statut 415/413, gérer `MulterError` dans le handler d'erreurs. |
| 14 | `server/middleware/errors.js:12` | ✅ Codes MySQL bruts renvoyés au client (`ER_NO_REFERENCED_ROW_2`…) ; les 4xx sont étiquetés `server_error` ; pas de garde `res.headersSent`. | Liste blanche de codes applicatifs, garde `headersSent`. |
| 15 | `src/doctor/DoctorPages.jsx:34-58`, `PharmacyPages.jsx:29-32`, `DDash.jsx:6`, `PDocs.jsx:78` | ✅ En cas d'erreur de chargement : simple toast puis **squelette de chargement infini**, sans bouton réessayer. | État d'erreur par page + bouton « Réessayer ». |
| 16 | `src/App.jsx:217-219`, `src/main.jsx` | ✅ Modales, Sidebar et en-tête hors ErrorBoundary : un crash à cet endroit **blanchit toute l'app**. | ErrorBoundary racine dans `main.jsx`. |
| 17 | `src/patient/pages/PMsg.jsx:40,58,60` | ✅ `onConversationsChange` appelé dans un updater de `setState` (warning React « Cannot update a component while rendering », vu en vrai). `prev.messages` sur `null` → crash si la conversation n'a pas chargé. 🔎 Pas de garde contre les réponses tardives : un clic rapide peut afficher la mauvaise conversation. | Appeler le callback hors updater ; `prev?.messages` ; ignorer les réponses obsolètes (ref d'id de requête). |

## P2 — Fonctionnalités cassées ou trompeuses

| # | Où | Problème | Correction |
|---|---|---|---|
| 18 | `src/doctor/DoctorPages.jsx:34-52`, `DUrgences.jsx` | ✅ Pas de loader pour `urgences` : « Urgences & Alertes » affiche toujours 0 alerte. | Ajouter `urgences: doctorApi.alerts`. |
| 19 | `src/admin/AdminPages.jsx:53`, `SettingsPage.jsx:59-73` | ✅ Paramètres admin appellent l'API patient → 403, rejet non géré, interrupteur affiché dans un faux état. | Page de paramètres admin dédiée (ou masquer) ; try/catch + retour arrière dans `upd`. |
| 20 | `src/patient/pages/PDocs.jsx:203` | ✅ URL de téléchargement patient codée en dur → le médecin obtient 403 sur « Ouvrir ». | `api.downloadUrl(id)` + route de téléchargement côté médecin. |
| 21 | `src/modals/index.jsx:36-48`, `DDash.jsx:20-21` | ✅ Données cliniques factices : le QR d'urgence affiche « Kouamé Bamba, O+, Pénicilline » pour tout le monde avec un QR aléatoire ; fausses alertes « Tension critique » sur le cockpit médecin. | Brancher sur `/emergency-card/qr` et sur les vraies alertes. |
| 22 | `server/services/patient.service.js:253` + updateAppointment | ✅ Annuler/supprimer un RDV réservé sur un créneau ne libère jamais le créneau. | Remettre le slot `available`, `patient_id = NULL`. |
| 23 | `src/auth/Login.jsx:105` + `:84-89` | ✅ Pharmacien/admin doivent deviner qu'il faut utiliser l'onglet « Téléphone ». La saisie du code chiffre par chiffre perd des chiffres si on tape vite ; pas de collage ni d'auto-remplissage SMS. | Libellé « Patient, pharmacien, admin » ; gérer `onPaste` + `autoComplete="one-time-code"`. |
| 24 | `src/patient/pages/PRDV.jsx:59,71` | ✅ Décalage horaire possible (UTC lu comme local) ; date vide → exception avant le try. | Conversion explicite + validation avant envoi. |
| 25 | `src/patient/PatientPages.jsx` | ✅ Une seule bannière d'erreur pour toutes les pages, qui reste affichée après navigation. | Erreur par page, réinitialisée à la navigation. |
| 26 | Pharmacie / médecin | ✅ Listes en cache jamais rafraîchies après délivrance/création ; badge messages médecin jamais rempli (`App.jsx:128`). | Recharger (`force`) après mutation ; brancher le badge médecin. |
| 27 | Données de démo | ✅ Les données de démo sont figées en avril–mai 2026 : tout paraît « ancien ». | Dates relatives à aujourd'hui dans le seed. |

## P3 — Sécurité et intégrité des données

| # | Où | Problème | Correction |
|---|---|---|---|
| 28 | `patient.routes.js:187,195` | ✅ Un patient peut créer ou modifier son RDV en `confirmed` sans le médecin. | Côté patient, n'autoriser que `requested` / `cancelled`. |
| 29 | `patient.service.js:1247` | ✅ Commande pharmacie : pharmacie inconnue → 500 ; `prescriptionId` d'un autre patient accepté. | Vérifier l'existence (404) et `WHERE id=? AND patient_id=?`. |
| 30 | `auth.service.js:24,96` + `verifyRefreshToken` | ✅ Compte désactivé (`deleted_at`) : peut encore se connecter par OTP et rafraîchir 7 jours. | Filtrer `deleted_at IS NULL` ; revérifier l'utilisateur au refresh. |
| 31 | `auth.service.js:73` | 🔎 Compteur de tentatives OTP non atomique + rate-limiter désactivé hors production → limite de 3 essais contournable sur un code à 4 chiffres. | `UPDATE … SET attempts=attempts+1 WHERE id=? AND attempts<max_attempts` puis tester `affectedRows`. |
| 32 | QR tokens (`getPrescriptionQR`, `patient.routes.js:394`) | ✅ Signés avec `JWT_SECRET` → acceptés comme Bearer ; `/auth/me` plante (500) faute de `id`/`role`. | Secret ou `audience` distincts ; rejeter les payloads sans `id`/`role`. |
| 33 | `doctor.service.js:272-294` | ✅ Retirer son consentement ne change rien : l'accès médecin est accordé par tout historique (RDV, ordonnance…). | Le consentement révoqué doit primer. |
| 34 | `pharmacy.service.js:167-218` | 🔎 Contrôle hors transaction (pas de `FOR UPDATE`) → double délivrance possible ; `prescriptionItemId` non vérifié ; notifications après `commit()` dans le même try → 500 alors que la délivrance est enregistrée. | `SELECT … FOR UPDATE` dans la transaction, valider les items, sortir le post-commit du try. |
| 35 | Admin | ✅ L'admin se connecte avec un simple OTP SMS, sans double authentification (alors que le médecin a un TOTP). | Imposer le TOTP aux admins (le service `mfa.service.js` existe déjà). |
| 36 | `DPrescriptions.jsx:190` | ✅ Noms de médicaments insérés sans échappement dans la vue d'impression (injection HTML). | Échapper le HTML. |

## P4 — Robustesse et dette technique

- `patient.service.js:1385` ✅ : une date invalide (famille) donne une 500 ; la date de naissance du profil (varchar) accepte n'importe quoi. Valider avec `z.string().date()`.
- `patient.service.js:236,780` ✅ : PATCH sur un id inconnu → `200 null` ; DELETE sur un id inconnu → 204. Renvoyer 404.
- `database.js:1460` 🔎 : une ligne orpheline (erreur FK 1452) empêche l'API de démarrer.
- `admin.service.js:242` 🔎 : une connexion du pool est prise avant le bcrypt (fuite si exception). Hacher d'abord.
- `client.js:52` 🔎 : `response.json()` sur un 200 vide ; pas de timeout (`AbortController`). `client.js:33` 🔎 : course possible sur `refreshPromise` (le remettre à `null` dans `.finally`).
- `DSignature.jsx:20` ✅ : `canvasRef.current` non vérifié après démontage. `DAssistantIA.jsx:25,29` 🔎 : `chronicDiseases[0]` sans garde.
- Tables `nova_otp` / `nova_revoked_tokens` jamais purgées ; liste noire et cache en mémoire (non partagés entre instances) ; cache du tableau de bord (30 s) non invalidé après modification.
- Téléphones : seuls les espaces sont retirés (`+225 07…` ≠ `07…`) ; l'expiration des OTP suppose une session MySQL en UTC (option `timezone` du pool non fixée).
- Clés React = index de tableau dans plusieurs listes.
- **Tests** : les 38 tests ne couvrent que des utilitaires serveur. Ajouter des tests d'intégration des routes (supertest) et un test de fumée Playwright qui ouvre chaque page de chaque rôle : il aurait détecté les items 2 à 5.

---

## Ordre conseillé

1. **Item 1** (une seule requête fait tomber l'API).
2. **Items 2 à 8** : corrections courtes, effet immédiat sur ce qu'on voit.
3. **Items 9 à 17** : sessions et messages d'erreur.
4. Puis P2, P3 (avant toute mise en production), P4.
