# Comptes de test (données fictives)

Créés par `npm run seed:fictif` (script `server/scripts/seed-fictif.js`). **Toutes les personnes et données sont fictives.**

- **Connexion :** numéro à 10 chiffres + mot de passe, dans le même formulaire pour tous les rôles.
- **Mot de passe commun des comptes fictifs :** `Nova-Test-2026!`. On peut le remplacer avec la variable `SEED_FICTIF_PASSWORD` avant de lancer le script.
- **Médecins :** après le mot de passe, la première connexion demande d'activer une application Authenticator (Google ou Microsoft Authenticator). Les connexions suivantes demandent le code à 6 chiffres.
- **Super admin :** compte réel du propriétaire (`0749157741`). Son mot de passe n'est écrit nulle part dans le projet.

## Médecins

| Numéro | Nom | Spécialité | Ville |
|---|---|---|---|
| 0710000001 | Dr Awa Kouassi | Médecine générale | Abidjan - Cocody |
| 0710000002 | Dr Ibrahim Ouattara | Cardiologie | Abidjan - Plateau |
| 0710000003 | Dr Marie-Laure Yao | Pédiatrie | Abidjan - Yopougon |
| 0710000004 | Dr Seydou Diabaté | Endocrinologie | Bouaké |
| 0710000005 | Dr Christelle N'Guessan | Gynécologie-Obstétrique | Yamoussoukro |

## Pharmaciens

| Numéro | Pharmacie |
|---|---|
| 0720000001 | 1re pharmacie de la base |
| 0720000002 | 2e pharmacie de la base |
| 0720000003 | 3e pharmacie de la base |

## Gouverneur (statistiques seules)

| Numéro | Nom |
|---|---|
| 0730000001 | Direction Départementale de la Santé (fictif) |

## Patients

15 patients, numéros **0740000001** à **0740000015**, répartis entre les 5 médecins (3 par médecin, dans l'ordre : 01 → Dr Kouassi, 02 → Dr Ouattara, …, 06 → Dr Kouassi, etc.).

Chaque patient a :
- un profil médical (allergies, maladies chroniques comme l'hypertension, le diabète, l'asthme ou la drépanocytose) ;
- 8 relevés de constantes sur 30 jours, dont certains hors normes ;
- 2 consultations passées, chacune avec une ordonnance et une demande d'examen ;
- des ordonnances anciennes délivrées en pharmacie, parfois partiellement ;
- un rendez-vous à venir ;
- une conversation avec son médecin (1 message non lu) ;
- 2 vaccins, dont un à renouveler.

## Comptes de démonstration d'origine (développement)

Ces comptes existent si `SEED_DEMO=true`. Le mot de passe est celui de `DEMO_PASSWORD`, ou `Nova-Demo-2026!` par défaut en développement :

| Numéro | Rôle |
|---|---|
| 0789452311 | Patient (Kouamé Bamba) |
| 0700000001 | Admin |
| 0700000002 | Pharmacien |
| 0700000003 | Gouverneur |
| 0601234567 | Médecin (Dr Aïcha Touré, mot de passe `DEMO_DOCTOR_PASSWORD`) |

## Remettre à zéro

Pour repartir de données fictives neuves : supprimer les comptes 07100000xx, 07200000xx, 0730000001 et 07400000xx (avec leurs patients), puis relancer `npm run seed:fictif`. En production, le script refuse de s'exécuter sauf avec `ALLOW_FICTIF_SEED=true`.
