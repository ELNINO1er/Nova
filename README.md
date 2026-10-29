# 🏥 NOVA — Carnet de Santé Numérique Ivoirien

> Plateforme e-santé qui numérise le parcours de soins en Côte d'Ivoire et relie sur une seule
> application le **patient**, le **médecin**, le **pharmacien** et l'**administrateur**.

NOVA est construite autour du **dossier médical du patient**, que les professionnels de santé
peuvent consulter **uniquement avec son consentement**. L'application est pensée pour le contexte
local : numéro **CMU**, monnaie **XOF (Franc CFA)**, paiement **Mobile Money**, pharmacies de garde,
villes ivoiriennes.

---

## 📑 Sommaire

- [Aperçu des rôles](#-aperçu-des-rôles)
- [Fonctionnalités par espace](#-fonctionnalités-par-espace)
- [Sécurité & Authentification](#-sécurité--authentification)
- [Architecture technique](#-architecture-technique)
- [Installation & démarrage](#-installation--démarrage)
- [Scripts disponibles](#-scripts-disponibles)
- [Structure du projet](#-structure-du-projet)
- [Base de données](#-base-de-données)
- [API & Documentation](#-api--documentation)
- [État d'avancement](#-état-davancement)
- [Reste à faire (roadmap)](#-reste-à-faire-roadmap)

---

## 👥 Aperçu des rôles

| Rôle | Espace | Rôle principal |
|------|--------|----------------|
| 🧑 **Patient** | Espace patient | Gérer tout son dossier santé personnel |
| 🩺 **Médecin** | Espace docteur | Suivre ses patients, prescrire, facturer |
| 💊 **Pharmacien** | Espace pharmacie | Scanner et délivrer les ordonnances |
| 🛡️ **Administrateur** | Espace admin | Superviser utilisateurs et plateforme |

L'interface change intégralement selon le rôle connecté (chargée à la demande via *lazy loading*).

---

## ✨ Fonctionnalités par espace

### 🧑 Espace Patient

**Suivi médical**
- **Mes constantes** — tension, glycémie, fréquence cardiaque, température (avec historique/graphiques)
- **Pilulier** — prises quotidiennes (matin/midi/soir), suivi « pris/oublié », alertes d'interactions
- **Traitements** — maladies suivies, stade, progression (%), prochain contrôle
- **Rendez-vous** — prise / modification / annulation (présentiel ou téléconsultation vidéo)
- **Vaccinations** — carnet vaccinal + rappels
- **ADN Médical** — allergies, maladies chroniques, antécédents familiaux et chirurgicaux
- **Résultats labo** — valeurs comparées aux normes (code couleur normal/anormal)
- **Historique** — journal médical chronologique

**Communication**
- **Notifications** croisées (RDV, ordonnances, demandes d'accès…)
- **Messagerie** sécurisée avec les médecins (chat, pièces jointes, non-lus)
- **Ordonnances** numériques imprimables + **QR code sécurisé** (jeton signé, valable 15 min)
- **Documents** — upload réel (glisser-déposer PDF/images), classés par catégorie
- **Bloc-notes** personnel

**Soins & Bien-être**
- **Trouver un médecin** (annuaire par spécialité/ville, notes, tarifs, CMU) + réservation de créneau
- **Pharmacie** (proximité / garde, envoi d'ordonnance)
- **SOS Urgence** — fiche vitale accessible par QR code
- **Assistant IA Nova** — chatbot santé (bouton flottant)
- **Bien-être** — objectifs (pas, eau, sport…) avec progression
- **Assurance** — cartes, taux de remboursement, **paiements** (cash, Mobile Money, assurance)

**Famille & Vie privée**
- **Ma famille** — dossiers des proches rattachés
- **Vie privée** — gestion des **consentements** + **journal des accès** (qui a consulté quoi)
- **Paramètres** + **export PDF** du dossier complet

### 🩺 Espace Médecin

- **Tableau de bord** & **Mes patients** (création, fiche détaillée tracée)
- **Agenda RDV** (confirmer / déplacer / annuler)
- **Consultations** (motif, diagnostics, notes, recommandations) + **modèles réutilisables**
- **Ordonnances** électroniques multi-médicaments + templates + **signature électronique**
- **Demandes labo**, **Statistiques**, **Suivi chroniques**
- **Urgences & Alertes** (info / warning / critique)
- **Assistant IA Nova**, **Finances** (paiements/revenus), **Réputation & Avis**
- **Transferts** vers spécialiste (referrals, partage de données ciblé)
- **Messages** & **Documents** partagés

### 💊 Espace Pharmacien

- **Scanner une ordonnance** (vérification du QR code signé)
- **Délivrance** totale / partielle / refus, ligne par ligne, avec **substitutions**
- **Historique des délivrances** (traçabilité complète)
- **Tableau de bord** pharmacie

### 🛡️ Espace Administrateur

- **Tour de contrôle** — statistiques globales
- **Utilisateurs** — gestion, création médecins & patients
- **Journal d'audit** — actions sensibles (qui, quoi, quand, IP)
- **Système** — supervision, activation/désactivation médecins & pharmacies

---

## 🔐 Sécurité & Authentification

- **Connexion téléphone + OTP** (code 4 chiffres, tentatives limitées, expiration).
  Les médecins ont en plus un login **email + mot de passe** (bcrypt) suivi d'un OTP.
- **JWT** : access token (30 min) + refresh token (7 j) avec rotation, révocation persistante et cookies `httpOnly`.
- **RBAC** — rôles & permissions granulaires (`nova_roles`, `nova_permissions`) ; chaque route vérifie
  une permission précise (ex. `doctor.prescriptions`, `pharmacy.dispense`).
- **Consentements** — un médecin demande l'accès au dossier ; le patient accorde/révoque.
- **Journaux d'audit & d'accès** — chaque consultation de dossier est tracée.
- Protections HTTP : **Helmet**, **CORS**, **rate-limiting** (10 tentatives / 15 min sur l'auth),
  vérification du vrai type des fichiers uploadés.

---

## ⚙️ Architecture technique

Application **full-stack JavaScript** en deux parties découplées.

| Couche | Technologies |
|--------|-------------|
| **Frontend** (port `5174`) | React 19, Vite, Tailwind CSS 3, Lucide, lazy loading par rôle, dark mode persistant, `ErrorBoundary`, PWA |
| **Backend / API** (port `4001`) | Node.js, Express 4, architecture **routes → services → DB**, validation **Zod**, middlewares compression / cache / pagination / audit |
| **Base de données** | MySQL 8 (`nova`), ~40 tables préfixées `nova_*`, migrations idempotentes au démarrage, données de démo optionnelles |
| **Qualité & Ops** | **Swagger/OpenAPI** (`/api/docs`), tests **Vitest**, **Docker** + **CI/CD** (GitHub Actions) |

---

## 🚀 Installation & démarrage

### Prérequis
- **Node.js** ≥ 18
- **MySQL 8** (via WAMP ou natif) — une base `nova` accessible

### 1. Cloner & installer
```bash
git clone <url-du-repo> Nova
cd Nova
npm install
```

### 2. Configurer l'environnement
Copier `.env.example` en `.env` et adapter les valeurs :
```env
API_PORT=4001
WEB_ORIGIN=http://localhost:5174
VITE_API_BASE_URL=http://localhost:4001/api

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=nova_app
DB_PASSWORD=change-me-to-a-strong-app-database-password
DB_NAME=nova

JWT_SECRET=change-me-to-a-random-string   # ⚠️ obligatoire
```
> Le serveur **refuse de démarrer** sans `JWT_SECRET`. Les tables et les données de démo sont
> créées automatiquement au premier lancement (`initDb()`).

### 3. Lancer
```bash
# Frontend + API en parallèle
npm run dev:all

# …ou séparément
npm run dev        # Frontend Vite  → http://localhost:5174
npm run dev:api    # API Express     → http://localhost:4001
```

### 4. (Optionnel) Docker
```bash
docker-compose up --build
```

---

## 📜 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le frontend Vite (port 5174) |
| `npm run dev:api` | Démarre l'API Express avec nodemon |
| `npm run dev:all` | Frontend + API en parallèle |
| `npm start` | Démarre l'API en production |
| `npm run build` | Build de production du frontend |
| `npm run preview` | Prévisualise le build |
| `npm test` | Lance les tests (Vitest) |
| `npm run test:watch` | Tests en mode watch |

---

## 📁 Structure du projet

```
Nova/
├── server/                     # Backend Express
│   ├── index.js                # Point d'entrée : middlewares, routes, initDb()
│   ├── db/database.js          # Pool MySQL, création tables, seed
│   ├── routes/                 # patient / doctor / pharmacy / admin / auth
│   ├── services/               # Logique métier (1 service par domaine)
│   ├── middleware/             # auth (JWT/RBAC), upload, cache, audit, errors…
│   ├── openapi.js              # Spécification OpenAPI
│   └── __tests__/              # Tests Vitest
├── src/                        # Frontend React
│   ├── App.jsx                 # Shell : header, sidebar, routing par rôle
│   ├── auth/                   # Écran de connexion
│   ├── layout/Sidebar.jsx      # Navigation par rôle
│   ├── patient/                # Pages patient (PatientPages + pages/)
│   ├── doctor/                 # Pages médecin
│   ├── pharmacy/               # Pages pharmacien
│   ├── admin/                  # Pages admin
│   ├── api/                    # Clients fetch (patientApi, doctorApi, authApi…)
│   ├── components/ • modals/   # Composants & modales partagés
│   └── context/                # ThemeContext (dark mode)
├── data/uploads/               # Fichiers uploadés (multer)
├── Dockerfile • docker-compose.yml
└── .github/workflows/ci.yml    # CI/CD
```

### Conventions de code
- **Service** : `const [[row]] = await pool.execute(sql, [params])` pour une ligne unique
- **Routes** : `wrap(async (req, res) => {})` + `validateBody(zodSchema)`
- **Seed** : `INSERT IGNORE` (idempotence), upsert via `ON DUPLICATE KEY UPDATE`
- **Frontend** : `loadPage()` mappe une clé de page → appel API

---

## 🗄️ Base de données

MySQL 8, base `nova`, ~40 tables préfixées `nova_*`. Principaux domaines :

- **Patient** : `patients`, `vitals`, `treatments`, `medications`, `medication_schedules`,
  `medication_intakes`, `appointments`, `vaccinations`, `documents`, `lab_results`,
  `lab_result_items`, `medical_profile`, `medical_history`, `notes`, `wellness_goals`,
  `patient_settings`, `insurance`, `family_members`
- **Communication** : `conversations`, `messages`, `notifications`, `prescriptions`, `prescription_items`
- **Médecin** : `doctors`, `doctor_slots`, `consultations`, `lab_requests`, `doctor_reputation`,
  `doctor_alerts`, `consultation_templates`, `prescription_templates`, `referrals`
- **Pharmacie** : `pharmacies`, `pharmacy_orders`, `pharmacy_users`, `dispenses`, `dispense_items`
- **Sécurité & Ops** : `users`, `otp`, `roles`, `permissions`, `role_permissions`, `consents`,
  `audit_logs`, `access_logs`, `payments`, `offline_queue`

> Les migrations sont **idempotentes** : `CREATE TABLE IF NOT EXISTS` et `ALTER TABLE … .catch(() => {})`
> permettent de faire évoluer le schéma sans casser l'existant.

---

## 📚 API & Documentation

- **Documentation interactive** : http://localhost:4001/api/docs (Swagger UI)
- **Spécification brute** : http://localhost:4001/api/openapi.json
- **Health check** : http://localhost:4001/api/health

Préfixes de routes :
| Préfixe | Espace |
|---------|--------|
| `/api/auth` | Authentification (OTP, login, refresh, logout, me) |
| `/api/patient/me` | Espace patient |
| `/api/doctor/me` | Espace médecin |
| `/api/pharmacy/me` | Espace pharmacien |
| `/api/admin/me` | Espace administrateur |

---

## 📊 État d'avancement

- ✅ **Phase 1 — terminée** : messagerie, ordonnances numériques, résultats labo, ADN médical, upload documents
- 🔧 **Phase 2 — en cours** : graphiques constantes, recherche médecins, RDV avancés, notifications, bien-être
- ➕ **Modules déjà bâtis** : espace médecin complet, espace pharmacien, espace admin,
  authentification OTP/JWT, RBAC, consentements, paiements, dossier familial, signature électronique,
  QR sécurisés, audit/access logs, Docker & CI/CD, documentation OpenAPI

---

## 🛣️ Reste à faire (roadmap)

Pistes pour finaliser l'application :

**Fonctionnel**
- [ ] Assistant IA Nova : brancher un vrai moteur (actuellement réponses simulées)
- [ ] Téléconsultation vidéo réelle (WebRTC) — aujourd'hui modale de démo
- [ ] Paiement Mobile Money réel (intégration opérateur : Orange/MTN/Wave)
- [ ] Pharmacie connectée : stock, disponibilité des médicaments en temps réel
- [ ] Notifications push (web push / SMS réel via provider)
- [ ] Synchronisation hors-ligne (`offline_queue` déjà en base, à exploiter côté client)

**Technique & production**
- [ ] Remplacer la blacklist de tokens en mémoire par **Redis**
- [ ] Élargir la couverture de **tests** (unitaires + end-to-end)
- [ ] Stockage des fichiers en cloud (S3/GCS) plutôt que disque local
- [ ] Durcissement sécurité : audit des permissions, chiffrement des données sensibles au repos
- [ ] Internationalisation (i18n) si extension hors zone francophone
- [ ] Monitoring / logs centralisés en production

**Qualité & UX**
- [ ] Accessibilité (a11y) complète
- [ ] Optimisation des performances (Core Web Vitals)
- [ ] Onboarding / tutoriel au premier lancement

---

> 🎯 **En une phrase** : NOVA, c'est le *dossier de santé numérique* de la Côte d'Ivoire — le patient
> garde toute sa santé dans sa poche, son médecin le suit et prescrit en ligne, le pharmacien délivre
> en scannant un QR code, le tout de façon sécurisée, tracée et avec son consentement.
</content>
</invoke>
