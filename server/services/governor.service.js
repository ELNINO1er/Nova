import { pool } from '../db/database.js';

// Statistiques pour l'autorité sanitaire (rôle « gouverneur »).
// Uniquement des agrégats : aucun nom, téléphone ni donnée médicale individuelle.

async function scalar(sql, params = []) {
  const [[row]] = await pool.execute(sql, params);
  return Number(row?.total || 0);
}

// Les dates applicatives sont stockées en ISO (VARCHAR) : comparaison sur le préfixe AAAA-MM-JJ.
const since = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

export async function getGovernorStats() {
  const d30 = since(30);
  const [
    patients, doctors, pharmacies,
    consultations30, prescriptions30, dispenses30, appointments30, labRequests30,
  ] = await Promise.all([
    scalar('SELECT COUNT(*) AS total FROM nova_patients'),
    scalar('SELECT COUNT(*) AS total FROM nova_doctors'),
    scalar('SELECT COUNT(*) AS total FROM nova_pharmacies'),
    scalar('SELECT COUNT(*) AS total FROM nova_consultations WHERE LEFT(started_at, 10) >= ?', [d30]),
    scalar('SELECT COUNT(*) AS total FROM nova_prescriptions WHERE LEFT(issued_at, 10) >= ?', [d30]),
    scalar('SELECT COUNT(*) AS total FROM nova_dispenses WHERE dispensed_at >= ?', [d30]),
    scalar('SELECT COUNT(*) AS total FROM nova_appointments WHERE LEFT(starts_at, 10) >= ?', [d30]),
    scalar('SELECT COUNT(*) AS total FROM nova_lab_requests WHERE LEFT(requested_at, 10) >= ?', [d30]),
  ]);

  const [cities] = await pool.execute(
    `SELECT city, COUNT(*) AS patients FROM nova_patients
     WHERE city IS NOT NULL AND city <> ''
     GROUP BY city ORDER BY patients DESC LIMIT 10`
  );
  const [sexes] = await pool.execute(
    `SELECT COALESCE(NULLIF(sex, ''), 'NC') AS sex, COUNT(*) AS patients FROM nova_patients GROUP BY 1`
  );
  const [ageBands] = await pool.execute(
    `SELECT CASE
        WHEN age IS NULL THEN 'Non renseigné'
        WHEN age < 18 THEN '0-17 ans'
        WHEN age < 40 THEN '18-39 ans'
        WHEN age < 60 THEN '40-59 ans'
        ELSE '60 ans et +' END AS band,
        COUNT(*) AS patients
     FROM (SELECT TIMESTAMPDIFF(YEAR, STR_TO_DATE(LEFT(birth_date, 10), '%Y-%m-%d'), CURDATE()) AS age FROM nova_patients) t
     GROUP BY band ORDER BY band`
  );
  const [specialties] = await pool.execute(
    `SELECT specialty, COUNT(*) AS doctors FROM nova_doctors
     WHERE specialty IS NOT NULL AND specialty <> ''
     GROUP BY specialty ORDER BY doctors DESC LIMIT 10`
  );
  const [monthly] = await pool.execute(
    `SELECT LEFT(started_at, 7) AS month, COUNT(*) AS consultations
     FROM nova_consultations
     WHERE LEFT(started_at, 10) >= ?
     GROUP BY month ORDER BY month`,
    [since(183)]
  );

  return {
    kpis: { patients, doctors, pharmacies, consultations30, prescriptions30, dispenses30, appointments30, labRequests30 },
    cities: cities.map((r) => ({ city: r.city, patients: Number(r.patients) })),
    sexes: sexes.map((r) => ({ sex: r.sex, patients: Number(r.patients) })),
    ageBands: ageBands.map((r) => ({ band: r.band, patients: Number(r.patients) })),
    specialties: specialties.map((r) => ({ specialty: r.specialty, doctors: Number(r.doctors) })),
    monthlyConsultations: monthly.map((r) => ({ month: r.month, consultations: Number(r.consultations) })),
    generatedAt: new Date().toISOString(),
  };
}
