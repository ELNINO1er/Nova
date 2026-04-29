# Patient API

Base URL locale:

```txt
http://localhost:4001/api
```

Les routes Patient utilisent volontairement `/patient/me`. Le backend déduit le patient depuis l'utilisateur connecté, au lieu de faire confiance à un `patientId` envoyé par le navigateur.

## Dashboard

```http
GET /api/patient/me/dashboard
```

Retourne un résumé pour l'accueil patient: profil, score santé, constantes, prochain rendez-vous, médicaments du jour, messages non lus et documents.

## Profil

```http
GET /api/patient/me/profile
PATCH /api/patient/me/profile
```

Champs modifiables actuellement:

```json
{
  "firstName": "Kouamé",
  "lastName": "Bamba",
  "phone": "0789452311",
  "email": "k.bamba@example.ci",
  "address": "Cocody",
  "city": "Abidjan",
  "weightKg": 78,
  "heightCm": 175
}
```

## Santé

```http
GET /api/patient/me/vitals
GET /api/patient/me/vitals?type=blood_pressure
GET /api/patient/me/treatments
GET /api/patient/me/medications/today
POST /api/patient/me/medications/{scheduleId}/intakes
```

Exemple prise médicament:

```json
{
  "status": "taken",
  "takenAt": "2026-04-28T08:00:00.000Z"
}
```

## Rendez-Vous, Vaccins, Historique

```http
GET /api/patient/me/appointments
GET /api/patient/me/vaccinations
GET /api/patient/me/history
```

## Documents Et Messages

```http
GET /api/patient/me/documents
GET /api/patient/me/documents?category=prescription
GET /api/patient/me/conversations
```

## Notes

```http
GET /api/patient/me/notes
POST /api/patient/me/notes
PATCH /api/patient/me/notes/{id}
DELETE /api/patient/me/notes/{id}
```

## Paramètres

```http
GET /api/patient/me/settings
PATCH /api/patient/me/settings
```

## Base De Données

Le schéma PostgreSQL initial est dans:

```txt
db/patient-schema.sql
```
