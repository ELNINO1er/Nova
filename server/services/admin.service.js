import { pool } from '../db/database.js';
import { paginatedResponse } from '../middleware/paginate.js';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { generateProvisionalPassword, STRONG_PASSWORD_ROLES } from './auth.service.js';

async function scalar(sql, params = []) {
  const [[row]] = await pool.execute(sql, params);
  return Number(Object.values(row || {})[0] || 0);
}

function likeSearch(search) {
  return `%${String(search || '').trim()}%`;
}

function applyLimit(limit, offset) {
  return `LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
}

export async function getAdminDashboard() {
  const [
    patients,
    doctors,
    pharmacies,
    users,
    consultationsToday,
    audit24h,
    access24h,
    openPharmacyOrders,
  ] = await Promise.all([
    scalar('SELECT COUNT(*) AS total FROM nova_patients'),
    scalar('SELECT COUNT(*) AS total FROM nova_doctors'),
    scalar('SELECT COUNT(*) AS total FROM nova_pharmacies'),
    scalar('SELECT COUNT(*) AS total FROM nova_users'),
    scalar('SELECT COUNT(*) AS total FROM nova_consultations WHERE LEFT(started_at, 10) = CURDATE()'),
    scalar('SELECT COUNT(*) AS total FROM nova_audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'),
    scalar('SELECT COUNT(*) AS total FROM nova_access_logs WHERE accessed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'),
    scalar("SELECT COUNT(*) AS total FROM nova_pharmacy_orders WHERE status IN ('pending','preparing')"),
  ]);

  const [recentAudit] = await pool.execute(
    `SELECT id, user_id AS userId, user_role AS userRole, action, resource_type AS resourceType,
            resource_id AS resourceId, ip_address AS ipAddress, created_at AS createdAt
     FROM nova_audit_logs
     ORDER BY created_at DESC
     LIMIT 5`
  );

  const [cities] = await pool.execute(
    `SELECT city, COUNT(*) AS patients
     FROM nova_patients
     WHERE city IS NOT NULL AND city <> ''
     GROUP BY city
     ORDER BY patients DESC
     LIMIT 8`
  );

  return {
    kpis: {
      patients,
      doctors,
      pharmacies,
      users,
      consultationsToday,
      audit24h,
      access24h,
      openPharmacyOrders,
    },
    cities,
    recentAudit,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminUsers({ type = 'doctors', search = '', limit, offset, page }) {
  const term = likeSearch(search);
  const limiter = applyLimit(limit, offset);

  if (type === 'patients') {
    const countSql = `SELECT COUNT(*) AS total FROM nova_patients
      WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR cmu_number LIKE ? OR phone LIKE ?)`;
    const dataSql = `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName, p.cmu_number AS cmuNumber,
        p.phone, p.email, p.city, p.birth_date AS birthDate, p.created_at AS createdAt,
        (SELECT u.id FROM nova_users u WHERE u.patient_id = p.id AND u.deleted_at IS NULL ORDER BY u.created_at LIMIT 1) AS userId,
        (SELECT u.phone FROM nova_users u WHERE u.patient_id = p.id AND u.deleted_at IS NULL ORDER BY u.created_at LIMIT 1) AS loginPhone
      FROM nova_patients p
      WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR cmu_number LIKE ? OR phone LIKE ?)
      ORDER BY COALESCE(created_at, updated_at) DESC
      ${limiter}`;
    const [[{ total }]] = await pool.execute(countSql, [term, term, term, term, term]);
    const [rows] = await pool.execute(dataSql, [term, term, term, term, term]);
    return paginatedResponse(rows, Number(total), { page, limit });
  }

  if (type === 'pharmacies') {
    const countSql = `SELECT COUNT(*) AS total FROM nova_pharmacies
      WHERE (? = '%%' OR name LIKE ? OR city LIKE ? OR phone LIKE ?)`;
    const dataSql = `SELECT id, name, address, city, phone, is_open AS isOpen, is_duty AS isDuty,
        opens_at AS opensAt, closes_at AS closesAt, created_at AS createdAt
      FROM nova_pharmacies
      WHERE (? = '%%' OR name LIKE ? OR city LIKE ? OR phone LIKE ?)
      ORDER BY COALESCE(created_at, name) DESC
      ${limiter}`;
    const [[{ total }]] = await pool.execute(countSql, [term, term, term, term]);
    const [rows] = await pool.execute(dataSql, [term, term, term, term]);
    return paginatedResponse(rows, Number(total), { page, limit });
  }

  if (type === 'users') {
    const countSql = `SELECT COUNT(*) AS total FROM nova_users
      WHERE (? = '%%' OR name LIKE ? OR phone LIKE ? OR role LIKE ?)`;
    const dataSql = `SELECT id, phone, role, patient_id AS patientId, doctor_id AS doctorId,
        pharmacy_id AS pharmacyId, name, avatar, created_at AS createdAt,
        (password_hash IS NOT NULL) AS hasPassword, must_change_password AS mustChangePassword,
        (locked_until IS NOT NULL AND locked_until > NOW()) AS isLocked
      FROM nova_users
      WHERE (? = '%%' OR name LIKE ? OR phone LIKE ? OR role LIKE ?)
      ORDER BY created_at DESC
      ${limiter}`;
    const [[{ total }]] = await pool.execute(countSql, [term, term, term, term]);
    const [rows] = await pool.execute(dataSql, [term, term, term, term]);
    return paginatedResponse(rows, Number(total), { page, limit });
  }

  const countSql = `SELECT COUNT(*) AS total FROM nova_doctors
    WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR specialty LIKE ? OR phone LIKE ?)`;
  const dataSql = `SELECT d.id, d.first_name AS firstName, d.last_name AS lastName, d.specialty, d.sub_specialty AS subSpecialty,
      d.city, d.address, d.phone, d.email, d.rating, d.reviews_count AS reviewsCount, d.is_available AS isAvailable,
      d.created_at AS createdAt,
      (SELECT u.id FROM nova_users u WHERE u.doctor_id = d.id AND u.deleted_at IS NULL ORDER BY u.created_at LIMIT 1) AS userId,
        (SELECT u.phone FROM nova_users u WHERE u.doctor_id = d.id AND u.deleted_at IS NULL ORDER BY u.created_at LIMIT 1) AS loginPhone
    FROM nova_doctors d
    WHERE (? = '%%' OR first_name LIKE ? OR last_name LIKE ? OR specialty LIKE ? OR phone LIKE ?)
    ORDER BY COALESCE(created_at, last_name) DESC
    ${limiter}`;
  const [[{ total }]] = await pool.execute(countSql, [term, term, term, term, term]);
  const [rows] = await pool.execute(dataSql, [term, term, term, term, term]);
  return paginatedResponse(rows, Number(total), { page, limit });
}

export async function getAdminAuditLogs({ action = '', role = '', resourceType = '', limit, offset, page }) {
  const where = [];
  const params = [];
  if (action) {
    where.push('action LIKE ?');
    params.push(likeSearch(action));
  }
  if (role) {
    where.push('user_role = ?');
    params.push(role);
  }
  if (resourceType) {
    where.push('resource_type = ?');
    params.push(resourceType);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM nova_audit_logs ${clause}`, params);
  const [rows] = await pool.execute(
    `SELECT id, user_id AS userId, user_role AS userRole, action, resource_type AS resourceType,
            resource_id AS resourceId, details, ip_address AS ipAddress, user_agent AS userAgent,
            created_at AS createdAt
     FROM nova_audit_logs
     ${clause}
     ORDER BY created_at DESC
     ${applyLimit(limit, offset)}`,
    params
  );
  return paginatedResponse(rows, Number(total), { page, limit });
}

export async function getAdminAccessLogs({ patientId = '', accessorRole = '', limit, offset, page }) {
  const where = [];
  const params = [];
  if (patientId) {
    where.push('al.patient_id = ?');
    params.push(patientId);
  }
  if (accessorRole) {
    where.push('al.accessor_role = ?');
    params.push(accessorRole);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM nova_access_logs al ${clause}`, params);
  const [rows] = await pool.execute(
    `SELECT al.id, al.patient_id AS patientId, al.accessor_id AS accessorId,
            al.accessor_role AS accessorRole, al.data_accessed AS dataAccessed,
            al.accessed_at AS accessedAt,
            CONCAT(p.first_name, ' ', p.last_name) AS patientName
     FROM nova_access_logs al
     LEFT JOIN nova_patients p ON p.id = al.patient_id
     ${clause}
     ORDER BY al.accessed_at DESC
     ${applyLimit(limit, offset)}`,
    params
  );
  return paginatedResponse(rows, Number(total), { page, limit });
}

export async function getAdminSystem() {
  const [roles] = await pool.execute(
    `SELECT r.name, COUNT(rp.permission_id) AS permissions
     FROM nova_roles r
     LEFT JOIN nova_role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id, r.name
     ORDER BY r.name`
  );

  return {
    api: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    security: {
      roles,
      permissions: await scalar('SELECT COUNT(*) AS total FROM nova_permissions'),
      auditLogs: await scalar('SELECT COUNT(*) AS total FROM nova_audit_logs'),
      accessLogs: await scalar('SELECT COUNT(*) AS total FROM nova_access_logs'),
    },
    database: {
      patients: await scalar('SELECT COUNT(*) AS total FROM nova_patients'),
      doctors: await scalar('SELECT COUNT(*) AS total FROM nova_doctors'),
      pharmacies: await scalar('SELECT COUNT(*) AS total FROM nova_pharmacies'),
    },
  };
}

export async function setDoctorAvailability(id, isAvailable) {
  const [result] = await pool.execute('UPDATE nova_doctors SET is_available = ? WHERE id = ?', [isAvailable ? 1 : 0, id]);
  if (!result.affectedRows) return null;
  const [[doctor]] = await pool.execute(
    `SELECT id, first_name AS firstName, last_name AS lastName, is_available AS isAvailable
     FROM nova_doctors WHERE id = ?`,
    [id]
  );
  return doctor;
}

function provisionalPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(18);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export async function createDoctorAccount(payload) {
  const connection = await pool.getConnection();
  const doctorId = randomUUID();
  const userId = randomUUID();
  const password = provisionalPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const unusableLegacyHash = await bcrypt.hash(randomUUID(), 12);
  const initials = `${payload.firstName[0] || ''}${payload.lastName[0] || ''}`.toUpperCase();
  const now = new Date().toISOString();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO nova_doctors
       (id, first_name, last_name, specialty, city, address, phone, email,
        avatar_initials, license_number, is_available, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?, ?)`,
      [doctorId, payload.firstName, payload.lastName, payload.specialty, payload.city || 'Abidjan',
       payload.address || null, payload.phone, payload.email.toLowerCase(), initials,
       payload.licenseNumber, now, now]
    );
    await connection.execute(
      `INSERT INTO nova_users
       (id, phone, code_hash, password_hash, role, doctor_id, name, avatar,
        must_change_password, mfa_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'doctor', ?, ?, ?, 1, 0, ?, ?)`,
      [userId, payload.phone, unusableLegacyHash, passwordHash, doctorId,
       `Dr. ${payload.firstName} ${payload.lastName}`, initials, now, now]
    );
    await connection.commit();
    return {
      doctor: { id: doctorId, firstName: payload.firstName, lastName: payload.lastName, email: payload.email, phone: payload.phone },
      provisionalPassword: password,
      message: 'Compte créé. Transmettez le mot de passe provisoire par un canal sécurisé.',
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      throw Object.assign(new Error('Email, téléphone ou numéro d’ordre déjà utilisé.'), { status: 409 });
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function setPharmacyOpen(id, isOpen) {
  const [result] = await pool.execute('UPDATE nova_pharmacies SET is_open = ? WHERE id = ?', [isOpen ? 1 : 0, id]);
  if (!result.affectedRows) return null;
  const [[pharmacy]] = await pool.execute(
    `SELECT id, name, is_open AS isOpen, is_duty AS isDuty
     FROM nova_pharmacies WHERE id = ?`,
    [id]
  );
  return pharmacy;
}

/**
 * Génère un nouveau mot de passe provisoire (à changer à la prochaine connexion)
 * et débloque le compte. Le mot de passe n'est renvoyé qu'une seule fois.
 */
export async function resetUserPassword(userId) {
  const [[user]] = await pool.execute(
    'SELECT id, role, name, phone FROM nova_users WHERE id = ? AND deleted_at IS NULL', [userId]
  );
  if (!user) return null;
  const password = provisionalFor(user.role);
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    `UPDATE nova_users
     SET password_hash = ?, must_change_password = 1, failed_login_attempts = 0, locked_until = NULL
     WHERE id = ?`,
    [passwordHash, user.id]
  );
  return { user: { id: user.id, role: user.role, name: user.name, phone: user.phone }, provisionalPassword: password };
}

// Médecins, admins, gouverneurs : règles fortes (12 caractères, symbole) ; les autres : lisible.
function provisionalFor(role) {
  return STRONG_PASSWORD_ROLES.includes(role) ? `${generateProvisionalPassword(11)}!` : generateProvisionalPassword();
}

/** Comptes créés par l'admin : pharmacien (rattaché à une pharmacie) ou gouverneur. */
/** Crée l'accès de connexion d'un médecin déjà enregistré qui n'en a pas (ex. annuaire importé). */
export async function createDoctorLogin(doctorId, phone) {
  const [[doctor]] = await pool.execute('SELECT id, first_name, last_name, avatar_initials FROM nova_doctors WHERE id = ?', [doctorId]);
  if (!doctor) return null;
  const [[existing]] = await pool.execute('SELECT id FROM nova_users WHERE doctor_id = ? AND deleted_at IS NULL', [doctorId]);
  if (existing) throw Object.assign(new Error('Ce médecin a déjà un compte de connexion.'), { status: 409 });
  const password = provisionalFor('doctor');
  const id = randomUUID();
  const name = `Dr. ${doctor.first_name} ${doctor.last_name}`;
  const now = new Date().toISOString();
  try {
    await pool.execute(
      `INSERT INTO nova_users (id, phone, code_hash, password_hash, role, doctor_id, name, avatar, must_change_password, mfa_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'doctor', ?, ?, ?, 1, 0, ?, ?)`,
      [id, phone, await bcrypt.hash(randomUUID(), 10), await bcrypt.hash(password, 12), doctor.id, name,
       doctor.avatar_initials || `${doctor.first_name[0] || ''}${doctor.last_name[0] || ''}`.toUpperCase(), now, now]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw Object.assign(new Error('Ce numéro est déjà utilisé.'), { status: 409 });
    throw error;
  }
  return { user: { id, role: 'doctor', name, phone }, provisionalPassword: password };
}

export async function createStaffAccount(payload) {
  let pharmacy = null;
  if (payload.role === 'pharmacist') {
    [[pharmacy]] = await pool.execute('SELECT id, name FROM nova_pharmacies WHERE id = ?', [payload.pharmacyId || '']);
    if (!pharmacy) throw Object.assign(new Error('Pharmacie introuvable.'), { status: 404 });
  }
  const password = provisionalFor(payload.role);
  const passwordHash = await bcrypt.hash(password, 12);
  const unusableLegacyHash = await bcrypt.hash(randomUUID(), 10);
  const initials = payload.name.split(/\s+/).map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();
  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    await pool.execute(
      `INSERT INTO nova_users (id, phone, code_hash, password_hash, must_change_password, role, pharmacy_id, name, avatar, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [id, payload.phone, unusableLegacyHash, passwordHash, payload.role, pharmacy?.id || null, payload.name, initials, now, now]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw Object.assign(new Error('Ce numéro est déjà utilisé.'), { status: 409 });
    throw error;
  }
  return {
    user: { id, role: payload.role, name: payload.name, phone: payload.phone, pharmacy: pharmacy?.name || null },
    provisionalPassword: password,
    message: 'Compte créé. Transmettez le mot de passe provisoire par un canal sécurisé.',
  };
}
