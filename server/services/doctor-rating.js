// Note et nombre d'avis calculés à partir des avis réellement enregistrés (nova_doctor_reputation),
// jamais des colonnes figées de nova_doctors : profil, annuaire patient et page Avis donnent les mêmes chiffres.
export const ratingColumns = (alias) => `
  (SELECT ROUND(AVG(rr.rating), 1) FROM nova_doctor_reputation rr WHERE rr.doctor_id = ${alias}.id) AS real_rating,
  (SELECT COUNT(*) FROM nova_doctor_reputation rr WHERE rr.doctor_id = ${alias}.id) AS real_reviews`;

export const ratingOf = (row) => (Number(row.real_reviews) > 0 ? Number(row.real_rating) : null);
export const reviewsOf = (row) => Number(row.real_reviews) || 0;
