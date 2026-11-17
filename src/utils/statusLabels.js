// Libellés uniques des statuts de consultation et de rendez-vous (médecin et patient).
export const CONSULTATION_STATUS = { draft: 'Brouillon', completed: 'Compte rendu validé' };
export const consultationStatusLabel = (s) => CONSULTATION_STATUS[s] || 'Consultation';

export const APPOINTMENT_STATUS = {
  requested: { label: 'Demande à confirmer', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmé',            cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Annulé',              cls: 'bg-slate-200 text-slate-700' },
  completed: { label: 'Terminé',             cls: 'bg-slate-100 text-slate-700' },
};
export const appointmentStatus = (s) => APPOINTMENT_STATUS[s] || APPOINTMENT_STATUS.requested;

// Champs d'un compte rendu, pour afficher les corrections tracées.
export const CONSULTATION_FIELDS = {
  motif: 'Motif', diagnosisMain: 'Diagnostic principal', diagnosisSecondary: 'Diagnostic secondaire',
  notes: 'Observations', recommendations: 'Recommandations',
};
