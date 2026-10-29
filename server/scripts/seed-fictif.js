import jwt from 'jsonwebtoken';
// Données fictives pour tester NOVA : médecins, pharmaciens, gouverneur, patients et leur suivi
// (constantes, consultations, ordonnances, délivrances, examens, rendez-vous, messages, vaccins).
// Passe par les services de l'application pour garder des données cohérentes.
//
//   npm run seed:fictif
//
// Idempotent : ne fait rien si les comptes fictifs existent déjà.
// Mot de passe commun des comptes : SEED_FICTIF_PASSWORD, sinon celui indiqué dans docs/COMPTES_DE_TEST.md.
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { initDb, pool } from '../db/database.js';
import { createDoctorAccount, createStaffAccount } from '../services/admin.service.js';
import {
  createConsultation, createDoctorLabRequest, createDoctorPrescription, createPatientByDoctor,
} from '../services/doctor.service.js';
import { updateMedicalProfile,grantDoctorAccess } from '../services/patient.service.js';
import { dispensePrescription } from '../services/pharmacy.service.js';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FICTIF_SEED !== 'true') {
  console.error('Refusé en production (définir ALLOW_FICTIF_SEED=true pour un pilote sans vraies données).');
  process.exit(1);
}

const PASSWORD = process.env.SEED_FICTIF_PASSWORD || 'Nova-Test-2026!';

// Générateur pseudo-aléatoire déterministe : mêmes données à chaque exécution sur une base vide.
let seed = 20261027;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + rand() * (max - min);
const daysAgo = (days, hour = 9) => {
  const d = new Date(Date.now() - days * 86400000);
  d.setUTCHours(hour, Math.floor(rand() * 60), 0, 0);
  return d.toISOString();
};

const DOCTORS = [
  { firstName: 'Awa', lastName: 'Kouassi', specialty: 'Médecine générale', city: 'Abidjan - Cocody', phone: '0710000001' },
  { firstName: 'Ibrahim', lastName: 'Ouattara', specialty: 'Cardiologie', city: 'Abidjan - Plateau', phone: '0710000002' },
  { firstName: 'Marie-Laure', lastName: 'Yao', specialty: 'Pédiatrie', city: 'Abidjan - Yopougon', phone: '0710000003' },
  { firstName: 'Seydou', lastName: 'Diabaté', specialty: 'Endocrinologie', city: 'Bouaké', phone: '0710000004' },
  { firstName: 'Christelle', lastName: 'N’Guessan', specialty: 'Gynécologie-Obstétrique', city: 'Yamoussoukro', phone: '0710000005' },
];

const PATIENT_NAMES = [
  ['Kofi', 'Adjoumani', 'M'], ['Aminata', 'Coulibaly', 'F'], ['Jean-Marc', 'Gbagbo', 'M'],
  ['Fatou', 'Traoré', 'F'], ['Didier', 'Kacou', 'M'], ['Mariam', 'Sanogo', 'F'],
  ['Yves', 'Bamba', 'M'], ['Salimata', 'Koné', 'F'], ['Hervé', 'Aka', 'M'],
  ['Adjoua', 'Brou', 'F'], ['Moussa', 'Cissé', 'M'], ['Grâce', 'Ehui', 'F'],
  ['Arsène', 'Zadi', 'M'], ['Nadège', 'Kouamé', 'F'], ['Lassina', 'Fofana', 'M'],
];

const PROFILES = [
  { chronic: ['Hypertension artérielle'], allergies: ['Pénicilline'], bp: [15, 9], glucose: 1.0 },
  { chronic: ['Diabète de type 2'], allergies: [], bp: [13, 8], glucose: 1.45 },
  { chronic: [], allergies: ['Arachides'], bp: [12, 8], glucose: 0.92 },
  { chronic: ['Asthme'], allergies: ['Aspirine'], bp: [11, 7], glucose: 0.88 },
  { chronic: ['Hypertension artérielle', 'Diabète de type 2'], allergies: [], bp: [16, 10], glucose: 1.6 },
  { chronic: ['Drépanocytose'], allergies: ['Sulfamides'], bp: [12, 7], glucose: 0.95 },
];

const VISITS = [
  { motif: 'Céphalées et vertiges', diag: 'Hypertension artérielle mal contrôlée', reco: 'Réduire le sel, contrôle tensionnel quotidien',
    meds: [['Amlodipine', '5 mg', '1 fois par jour', '3 mois'], ['Hydrochlorothiazide', '12,5 mg', '1 fois par jour', '3 mois']], lab: ['blood', 'Ionogramme et créatinine'] },
  { motif: 'Fatigue, soif intense', diag: 'Diabète de type 2 déséquilibré', reco: 'Régime adapté, activité physique 30 min/jour',
    meds: [['Metformine', '850 mg', '2 fois par jour', '3 mois']], lab: ['blood', 'HbA1c et glycémie à jeun'] },
  { motif: 'Fièvre et frissons depuis 3 jours', diag: 'Paludisme simple', reco: 'Repos, hydratation, moustiquaire imprégnée',
    meds: [['Artéméther-Luméfantrine', '80/480 mg', '2 fois par jour', '3 jours'], ['Paracétamol', '1 g', '3 fois par jour', '5 jours']], lab: ['micro', 'Goutte épaisse / TDR paludisme'] },
  { motif: 'Toux persistante', diag: 'Bronchite aiguë', reco: 'Hydratation, arrêt du tabac',
    meds: [['Amoxicilline', '1 g', '2 fois par jour', '7 jours']], lab: ['imaging', 'Radiographie thoracique'] },
  { motif: 'Contrôle de routine', diag: 'Bilan de santé normal', reco: 'Bilan annuel',
    meds: [['Vitamine D3', '100 000 UI', '1 ampoule', 'Dose unique']], lab: ['blood', 'Numération formule sanguine'] },
  { motif: 'Douleurs abdominales', diag: 'Gastrite', reco: 'Éviter épices et AINS, repas fractionnés',
    meds: [['Oméprazole', '20 mg', '1 fois par jour', '4 semaines']], lab: ['micro', 'Recherche Helicobacter pylori'] },
];

async function setTestPassword(conn, userId) {
  await conn.execute(
    'UPDATE nova_users SET password_hash = ?, must_change_password = 0, failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
    [await bcrypt.hash(PASSWORD, 12), userId]
  );
}

async function userIdByPhone(phone) {
  const [[row]] = await pool.execute('SELECT id FROM nova_users WHERE phone = ?', [phone]);
  return row?.id;
}

async function addVitals(patientId, profile) {
  const rows = [];
  for (let day = 28; day >= 0; day -= 4) {
    const sys = Math.round(profile.bp[0] + between(-1, 1));
    const dia = Math.round(profile.bp[1] + between(-1, 1));
    rows.push(['blood_pressure', 'Tension artérielle', `${sys}/${dia}`, 'mmHg', daysAgo(day, 7)]);
    rows.push(['blood_glucose', 'Glycémie', (profile.glucose + between(-0.12, 0.12)).toFixed(2), 'g/L', daysAgo(day, 7)]);
    rows.push(['heart_rate', 'Fréquence cardiaque', String(Math.round(between(62, 88))), 'bpm', daysAgo(day, 7)]);
    rows.push(['temperature', 'Température', between(36.4, 37.3).toFixed(1), '°C', daysAgo(day, 7)]);
  }
  for (const [type, label, value, unit, at] of rows) {
    await pool.execute(
      'INSERT INTO nova_vitals (id, patient_id, type, label, value, unit, measured_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), patientId, type, label, value, unit, at]
    );
  }
}

async function main() {
  await initDb();
  if (await userIdByPhone(DOCTORS[0].phone)) {
    console.log('Données fictives déjà présentes : rien à faire.');
    return;
  }
  const conn = await pool.getConnection();
  try {
    // ── Médecins (créés comme par l'admin) ──
    const doctors = [];
    for (const [i, d] of DOCTORS.entries()) {
      const res = await createDoctorAccount({
        ...d,
        email: `${d.firstName}.${d.lastName}`.toLowerCase().normalize('NFD').replace(/[^a-z.]/g, '') + '@fictif.nova.ci',
        licenseNumber: `CI-OMCI-FICTIF-${1000 + i}`,
        address: `Centre médical ${d.city}`,
      });
      await setTestPassword(conn, await userIdByPhone(d.phone));
      doctors.push({ id: res.doctor.id, ...d });
    }

    // ── Pharmaciens (rattachés aux premières pharmacies) et gouverneur ──
    const [pharmacies] = await pool.execute('SELECT id, name FROM nova_pharmacies ORDER BY id LIMIT 3');
    const pharmacists = [];
    for (const [i, ph] of pharmacies.entries()) {
      const phone = `072000000${i + 1}`;
      await createStaffAccount({ role: 'pharmacist', name: `Pharmacien ${ph.name}`, phone, pharmacyId: ph.id });
      const userId = await userIdByPhone(phone);
      await setTestPassword(conn, userId);
      pharmacists.push({ userId, pharmacyId: ph.id });
    }
    await createStaffAccount({ role: 'governor', name: 'Direction Départementale de la Santé (fictif)', phone: '0730000001' });
    await setTestPassword(conn, await userIdByPhone('0730000001'));

    // ── Patients (créés par leur médecin) et leur suivi ──
    let n = 0;
    for (const [i, [firstName, lastName, sex]] of PATIENT_NAMES.entries()) {
      const doctor = doctors[i % doctors.length];
      const profile = PROFILES[i % PROFILES.length];
      const phone = `07400000${String(i + 1).padStart(2, '0')}`;
      const birthYear = doctor.specialty === 'Pédiatrie' ? 2014 + (i % 8) : 1950 + Math.floor(rand() * 50);
      const created = await createPatientByDoctor(doctor.id, {
        firstName, lastName, sex, phone, password: PASSWORD,
        birthDate: `${birthYear}-0${1 + (i % 9)}-1${i % 9}`,
        bloodType: pick(['O+', 'O+', 'A+', 'B+', 'AB+', 'O-']),
        city: doctor.city.split(' - ')[0], address: `Quartier ${pick(['Riviera', 'Angré', 'Marcory', 'Koumassi', 'Treichville', 'Abobo'])}`,
        emergencyName: `${pick(['Paul', 'Awa', 'Issa', 'Rose'])} ${lastName}`, emergencyRelationship: pick(['Conjoint(e)', 'Frère', 'Sœur', 'Parent']),
        emergencyPhone: `0750000${String(i + 1).padStart(3, '0')}`,
      });
      const patientId = created.patientId;
      await grantDoctorAccess(patientId,doctor.id); // Consentement fictif, uniquement pour le jeu de démonstration.
      await setTestPassword(conn, created.userId);
      await updateMedicalProfile(patientId, {
        allergies: profile.allergies, chronicDiseases: profile.chronic,
        familyHistory: rand() > 0.5 ? ['Père : hypertension artérielle'] : [], surgicalHistory: rand() > 0.7 ? ['Appendicectomie (2012)'] : [],
      });
      await addVitals(patientId, profile);

      // Deux consultations passées, avec ordonnance et examen.
      for (const ago of [Math.floor(between(60, 150)), Math.floor(between(3, 25))]) {
        const visit = pick(VISITS);
        const cons = await createConsultation(doctor.id, {
          patientId, motif: visit.motif, diagnosisMain: visit.diag, recommendations: visit.reco, notes: 'Examen clinique réalisé.',
        });
        await pool.execute('UPDATE nova_consultations SET started_at = ?, completed_at = ? WHERE id = ?', [daysAgo(ago, 10), daysAgo(ago, 11), cons.id]);

        const rx = await createDoctorPrescription(doctor.id, {
          patientId, validDays: 180, notes: visit.reco,
          items: visit.meds.map(([name, dosage, frequency, duration]) => ({ name, dosage, frequency, duration, quantityPrescribed:2,quantityUnit:'unité', instructions: 'Pendant les repas' })),
        });
        await pool.execute('UPDATE nova_prescriptions SET issued_at = ?, valid_until = ? WHERE id = ?',
          [daysAgo(ago, 11), new Date(Date.now() + (180 - ago) * 86400000).toISOString().slice(0, 10), rx.id]);

        await createDoctorLabRequest(doctor.id, { patientId, consultationId: cons.id, type: visit.lab[0], title: visit.lab[1] });

        // Les ordonnances anciennes sont délivrées en pharmacie (parfois partiellement).
        if (ago > 30 && pharmacists.length) {
          const ph = pharmacists[n % pharmacists.length];
          const [items] = await pool.execute('SELECT id FROM nova_prescription_items WHERE prescription_id = ?', [rx.id]);
          const status = rand() > 0.3 ? 'full' : 'partial';
          await dispensePrescription(ph.pharmacyId, ph.userId, {
            prescriptionId: rx.id, qrToken:jwt.sign({type:'prescription',prescriptionId:rx.id},process.env.JWT_SECRET),requestKey:`demo-${rx.id}`, status, notes: status === 'partial' ? 'Rupture partielle de stock' : null,
            items: items.map((it) => ({ prescriptionItemId: it.id, quantityDispensed: status === 'full' ? 2 : 1 })),
          });
        }
        n += 1;
      }

      // Rendez-vous à venir.
      const next = new Date(Date.now() + Math.floor(between(2, 30)) * 86400000);
      next.setUTCHours(8 + Math.floor(rand() * 8), 0, 0, 0);
      await pool.execute(
        `INSERT INTO nova_appointments (id, patient_id, starts_at, doctor_name, specialty, location, mode, status, doctor_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), patientId, next.toISOString(), `Dr. ${doctor.firstName} ${doctor.lastName}`, doctor.specialty,
         `Centre médical ${doctor.city}`, rand() > 0.7 ? 'video' : 'onsite', pick(['confirmed', 'confirmed', 'requested']), doctor.id, new Date().toISOString()]
      );

      // Conversation patient ↔ médecin.
      const convId = randomUUID();
      const reply = 'Bien reçu. Continuez le traitement et prenez votre tension chaque matin.';
      await pool.execute(
        `INSERT INTO nova_conversations (id, patient_id, doctor_id, doctor_name, doctor_specialty, unread_count, last_message, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [convId, patientId, doctor.id, `Dr. ${doctor.firstName} ${doctor.lastName}`, doctor.specialty, reply, daysAgo(1, 15)]
      );
      for (const [role, body, at, read] of [
        ['patient', 'Bonjour docteur, j’ai bien commencé le traitement. Est-ce normal d’avoir un peu de fatigue ?', daysAgo(2, 18), 1],
        ['doctor', reply, daysAgo(1, 15), 0],
      ]) {
        await pool.execute(
          'INSERT INTO nova_messages (id, conversation_id, sender_role, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), convId, role, body, read, at]
        );
      }

      // Vaccins.
      for (const [name, injected, status, due] of [
        ['Fièvre jaune', '2019-03-12', 'up_to_date', null],
        ['Tétanos', '2017-06-01', 'due_soon', new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10)],
      ]) {
        await pool.execute(
          'INSERT INTO nova_vaccinations (id, patient_id, name, injected_at, status, next_due_at) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), patientId, name, injected, status, due]
        );
      }
    }

    console.log(`Données fictives créées : ${doctors.length} médecins, ${pharmacists.length} pharmaciens, 1 gouverneur, ${PATIENT_NAMES.length} patients, ${n} consultations.`);
    console.log('Identifiants : voir docs/COMPTES_DE_TEST.md');
  } finally {
    conn.release();
  }
}

main()
  .catch((error) => { console.error('Échec :', error.message); process.exitCode = 1; })
  .finally(() => pool.end());
