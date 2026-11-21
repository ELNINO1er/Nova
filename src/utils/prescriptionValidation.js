// Match the creation endpoint without silently dropping incomplete lines.
export function validatePrescriptionDraft(form, items) {
  if (!form.patientId) return 'Sélectionnez un patient.';
  const days = Number(form.validDays);
  if (!Number.isInteger(days) || days < 1 || days > 365) return 'La validité doit être comprise entre 1 et 365 jours.';
  if (!items.length) return 'Ajoutez au moins un médicament.';
  for (const [index, item] of items.entries()) {
    const prefix = `Médicament ${index + 1} : `;
    if (!item.name?.trim()) return `${prefix}le nom est obligatoire. Supprimez les lignes inutilisées.`;
    const quantity = Number(item.quantityPrescribed);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return `${prefix}indiquez une quantité entière entre 1 et 100 000.`;
    if (!item.quantityUnit?.trim() || item.quantityUnit.trim().length > 40) return `${prefix}indiquez une unité de 1 à 40 caractères.`;
  }
  return null;
}
