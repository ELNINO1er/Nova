const DEMO_PATIENT_USER_ID = 'user-patient-demo';

export function requirePatient(req, _res, next) {
  // Temporary demo auth. Replace with JWT/session validation before production.
  req.user = {
    id: DEMO_PATIENT_USER_ID,
    role: 'patient',
    patientId: 'patient-demo',
  };
  next();
}
