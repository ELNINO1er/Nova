// Libellés des statuts d'ordonnance (mêmes mots côté patient, médecin et pharmacie).
export const PRESCRIPTION_STATUS = {
  active: 'Active',
  partial: 'Délivrance partielle',
  dispensed: 'Délivrée',
  cancelled: 'Annulée',
  expired: 'Expirée',
};

export const prescriptionStatusLabel = (status) => PRESCRIPTION_STATUS[status] || 'Terminée';
export const prescriptionIsOpen = (status) => status === 'active' || status === 'partial';
