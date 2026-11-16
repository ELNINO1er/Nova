import { isPublicPassword, publicPasswordAllowedAtLogin } from './public-passwords.js';
import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID, randomInt } from 'node:crypto';
import { pool } from '../db/database.js';
import { sendSms } from './sms.provider.js';
import { normalizePhone } from './phone.js';
import {
  consumePasswordChangeChallenge,
  createPasswordChangeChallenge,
  getPasswordChangeChallenge,
  startTotpEnrollment,
  startTotpLogin,
} from './mfa.service.js';

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;

/**
 * Send OTP to a phone number.
 * In production, integrate with SMS provider (Twilio / Orange CI).
 * For dev, the OTP is returned in the response.
 */
export async function sendOtp(phone) {
  const cleaned = phone.replace(/\s/g, '');

  // Check if user exists
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE phone = ?', [cleaned]);
  if (!user) return null;

  // Invalidate any previous OTP for this phone
  await pool.execute(
    'UPDATE nova_otp SET verified = 1 WHERE phone = ? AND verified = 0',
    [cleaned]
  );

  // Generate 4-digit OTP
  const code = String(randomInt(1000, 9999));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');

  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_otp (id, phone, code_hash, attempts, max_attempts, expires_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
    [id, cleaned, codeHash, OTP_MAX_ATTEMPTS, expiresAt]
  );

  await sendSms(cleaned, `Votre code NOVA : ${code}. Il expire dans ${OTP_EXPIRY_MINUTES} minutes.`);

  // Le code est renvoyé à l'écran en dev ET en mode démo (SMS_PROVIDER=demo),
  // pour permettre la validation sans infrastructure SMS. Jamais exposé avec un vrai fournisseur.
  const exposeCode = process.env.NODE_ENV !== 'production'
    || (process.env.SMS_PROVIDER || '').toLowerCase() === 'demo';
  return { otpId: id, expiresIn: OTP_EXPIRY_MINUTES * 60, ...(exposeCode ? { devCode: code } : {}) };
}

/**
 * Verify OTP code and return user if valid.
 */
export async function verifyOtp(phone, code) {
  const cleaned = phone.replace(/\s/g, '');

  // Find latest non-verified, non-expired OTP
  const [[otp]] = await pool.execute(
    `SELECT * FROM nova_otp
     WHERE phone = ? AND verified = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [cleaned]
  );

  if (!otp) {
    return { error: 'otp_expired', message: 'Code expiré ou invalide. Demandez un nouveau code.' };
  }

  if (otp.attempts >= otp.max_attempts) {
    await pool.execute('UPDATE nova_otp SET verified = 1 WHERE id = ?', [otp.id]);
    return { error: 'otp_max_attempts', message: 'Trop de tentatives. Demandez un nouveau code.' };
  }

  const valid = await bcrypt.compare(code, otp.code_hash);

  if (!valid) {
    await pool.execute(
      'UPDATE nova_otp SET attempts = attempts + 1 WHERE id = ?',
      [otp.id]
    );
    const remaining = otp.max_attempts - otp.attempts - 1;
    return {
      error: 'otp_invalid',
      message: `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`,
    };
  }

  // Mark OTP as verified
  await pool.execute('UPDATE nova_otp SET verified = 1 WHERE id = ?', [otp.id]);

  // Get user
  const [[user]] = await pool.execute('SELECT * FROM nova_users WHERE phone = ?', [cleaned]);
  if (!user) return { error: 'user_not_found', message: 'Utilisateur introuvable.' };

  return {
    user: {
      id: user.id,
      role: user.role,
      patientId: user.patient_id || null,
      doctorId: user.doctor_id || null,
      pharmacyId: user.pharmacy_id || null,
      name: user.name,
      avatar: user.avatar,
    },
  };
}

export async function startDoctorPasswordLogin(email, password) {
  const cleaned = String(email || '').trim().toLowerCase();
  if (password === '0000') {
    return { error: 'invalid_credentials', message: 'Ce mot de passe provisoire obsolète est désactivé. Contactez l’administrateur.' };
  }
  const [[user]] = await pool.execute(
    `SELECT u.*, d.email AS doctor_email
     FROM nova_users u
     JOIN nova_doctors d ON d.id = u.doctor_id
     WHERE u.role = 'doctor' AND u.deleted_at IS NULL AND LOWER(d.email) = ?
     LIMIT 1`,
    [cleaned]
  );
  if (!user) return { error: 'invalid_credentials', message: 'Identifiants médecin invalides.' };

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { error: 'account_locked', message: 'Compte temporairement verrouillé. Réessayez plus tard.' };
  }

  const valid = await bcrypt.compare(password, user.password_hash || user.code_hash);
  if (!valid) {
    await pool.execute(
      `UPDATE nova_users
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE WHEN failed_login_attempts >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE NULL END
       WHERE id = ?`,
      [user.id]
    );
    return { error: 'invalid_credentials', message: 'Identifiants médecin invalides.' };
  }

  if (isPublicPassword(password) && !publicPasswordAllowedAtLogin()) {
    // Mot de passe de démonstration publié : aucune session ni enrôlement MFA possible avec lui.
    return { error: 'compromised_password', message: 'Ce mot de passe n’est plus accepté. Contactez l’administrateur pour obtenir un nouvel accès.' };
  }

  if (user.must_change_password && user.activation_expires_at && new Date(user.activation_expires_at).getTime() <= Date.now()) {
    return { error: 'activation_expired', message: 'Ce code d’activation a expiré. Demandez un nouveau code à votre médecin.' };
  }

  await pool.execute('UPDATE nova_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

  if (user.must_change_password) {
    return {
      nextAction: 'change_password',
      challengeId: await createPasswordChangeChallenge(user.id),
      expiresIn: 600,
    };
  }

  if (!user.mfa_enabled || !user.mfa_secret_enc) return startTotpEnrollment(user);
  return startTotpLogin(user.id);
}

export async function changeInitialDoctorPassword(challengeId, newPassword) {
  const row = await consumePasswordChangeChallenge(challengeId);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.execute(
    `UPDATE nova_users
     SET password_hash = ?, must_change_password = 0, password_changed_at = NOW(),
         failed_login_attempts = 0, locked_until = NULL
     WHERE id = ?`,
    [passwordHash, row.user_id]
  );
  const [[user]] = await pool.execute(
    `SELECT u.*, d.email AS doctor_email FROM nova_users u
     JOIN nova_doctors d ON d.id = u.doctor_id WHERE u.id = ?`,
    [row.user_id]
  );
  if (!user) throw Object.assign(new Error('Demande invalide.'), { status: 400, code: 'invalid_challenge' });
  return startTotpEnrollment(user);
}

/* ─── Connexion unique : numéro à 10 chiffres + mot de passe (tous les rôles) ───
   Les médecins enchaînent ensuite avec l'application Authenticator (TOTP). */

/** Mot de passe provisoire lisible (sans 0/O, 1/l/I), facile à dicter ou recopier sur un téléphone. */
export function generateProvisionalPassword(length = 10) {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const chars = [letters[randomInt(letters.length)], digits[randomInt(digits.length)]];
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  // Mélange (Fisher-Yates) pour ne pas commencer toujours par une lettre.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const PHONE_LOGIN_ROLES = ['patient', 'pharmacist', 'admin', 'governor'];
let dummy;
const dummyHash = async () => (dummy ||= await bcrypt.hash(randomUUID(), 12));

// Rôles soumis à la double authentification (Authenticator). Par défaut médecin et administrateur ;
// MFA_REQUIRED_ROLES=doctor,admin,pharmacist,governor l'étend aux pharmaciens et aux autorités.
export const MFA_REQUIRED_ROLES = String(process.env.MFA_REQUIRED_ROLES || 'doctor,admin').split(',').map((r) => r.trim())
  .filter((r) => ['doctor', 'admin', 'pharmacist', 'governor'].includes(r));
if (!MFA_REQUIRED_ROLES.includes('doctor')) MFA_REQUIRED_ROLES.push('doctor');
if (!MFA_REQUIRED_ROLES.includes('admin')) MFA_REQUIRED_ROLES.push('admin');

const INVALID_PHONE_LOGIN = { error: 'invalid_credentials', message: 'Numéro ou mot de passe incorrect.' };

function toSessionUser(user) {
  return {
    id: user.id,
    role: user.role,
    patientId: user.patient_id || null,
    doctorId: user.doctor_id || null,
    pharmacyId: user.pharmacy_id || null,
    name: user.name,
    avatar: user.avatar,
  };
}

/**
 * Règles de mot de passe : 8 caractères avec lettre et chiffre pour les patients
 * et pharmaciens ; 12 caractères avec majuscule, minuscule, chiffre et symbole pour admin, gouverneur et médecin.
 * Renvoie un message d'erreur, ou null si le mot de passe est accepté.
 */
export const STRONG_PASSWORD_ROLES = ['admin', 'doctor', 'governor'];

export function passwordPolicyError(role, password) {
  const value = String(password || '');
  if (isPublicPassword(value)) {
    return 'Ce mot de passe a été publié et n’est plus accepté. Choisissez-en un autre.';
  }
  if (STRONG_PASSWORD_ROLES.includes(role)) {
    if (value.length < 12 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
      return '12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.';
    }
    return null;
  }
  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return '8 caractères minimum, avec au moins une lettre et un chiffre.';
  }
  return null;
}

export async function startPhonePasswordLogin(identifier, password) {
  const email = String(identifier || '').trim().toLowerCase();
  const byEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const cleaned = byEmail ? email : normalizePhone(identifier);
  if (!cleaned) return INVALID_PHONE_LOGIN;
  const [[user]] = await pool.execute(
    `SELECT u.*, d.email AS doctor_email
     FROM nova_users u LEFT JOIN nova_doctors d ON d.id = u.doctor_id
     WHERE ${byEmail ? "u.login_email = ? AND u.role = 'admin'" : 'u.phone = ?'}
       AND u.deleted_at IS NULL AND u.disabled_at IS NULL LIMIT 1`,
    [cleaned]
  );
  if (!user) {
    // Même coût qu'une vraie vérification : le temps de réponse ne révèle pas si le compte existe.
    await bcrypt.compare(String(password || ''), await dummyHash());
    return INVALID_PHONE_LOGIN;
  }
  if (!PHONE_LOGIN_ROLES.includes(user.role) && user.role !== 'doctor') return INVALID_PHONE_LOGIN;

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { error: 'account_locked', message: 'Trop d’essais. Compte bloqué 15 minutes.' };
  }
  if (!user.password_hash) {
    return { error: 'no_password', message: 'Ce compte n’a pas encore de mot de passe. Demandez-le à votre médecin ou à l’administrateur.' };
  }

  const valid = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!valid) {
    await pool.execute(
      `UPDATE nova_users
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE WHEN failed_login_attempts >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE NULL END
       WHERE id = ?`,
      [user.id]
    );
    return INVALID_PHONE_LOGIN;
  }

  if (isPublicPassword(password) && !publicPasswordAllowedAtLogin()) {
    // Mot de passe de démonstration publié : aucune session ni enrôlement MFA possible avec lui.
    return { error: 'compromised_password', message: 'Ce mot de passe n’est plus accepté. Contactez l’administrateur pour obtenir un nouvel accès.' };
  }

  if (user.must_change_password && user.activation_expires_at && new Date(user.activation_expires_at).getTime() <= Date.now()) {
    return { error: 'activation_expired', message: 'Ce code d’activation a expiré. Demandez un nouveau code à votre médecin.' };
  }

  await pool.execute('UPDATE nova_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

  if (user.must_change_password) {
    return {
      nextAction: 'change_password',
      challengeId: await createPasswordChangeChallenge(user.id),
      expiresIn: 600,
      role: user.role,
    };
  }
  if (MFA_REQUIRED_ROLES.includes(user.role)) {
    const next = !user.mfa_enabled || !user.mfa_secret_enc ? await startTotpEnrollment(user) : await startTotpLogin(user.id);
    return { ...next, role: user.role };
  }
  return { user: toSessionUser(user) };
}

/** Changement volontaire de son propre mot de passe (utilisateur connecté). */
export async function changeOwnPassword(userId, currentPassword, newPassword) {
  const [[user]] = await pool.execute('SELECT id, role, password_hash FROM nova_users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (!user) throw Object.assign(new Error('Compte introuvable.'), { status: 404 });
  const valid = user.password_hash && await bcrypt.compare(String(currentPassword || ''), user.password_hash);
  if (!valid) throw Object.assign(new Error('Mot de passe actuel incorrect.'), { status: 400, code: 'wrong_password' });
  const policyError = passwordPolicyError(user.role, newPassword);
  if (policyError) throw Object.assign(new Error(policyError), { status: 422, code: 'weak_password' });
  await pool.execute(
    'UPDATE nova_users SET password_hash = ?, must_change_password = 0, password_changed_at = NOW(), session_version=session_version+1 WHERE id = ?',
    [await bcrypt.hash(newPassword, 12), user.id]
  );
  await pool.execute('UPDATE nova_auth_challenges SET used_at=NOW() WHERE user_id=? AND used_at IS NULL',[userId]);
  return { ok: true };
}

/** Remplace le mot de passe provisoire puis ouvre la session (hors médecins, qui passent par TOTP). */
export async function changeInitialPassword(challengeId, newPassword) {
  const pending = await getPasswordChangeChallenge(challengeId);
  if (!PHONE_LOGIN_ROLES.includes(pending.role)) {
    throw Object.assign(new Error('Demande invalide.'), { status: 400, code: 'invalid_challenge' });
  }
  const policyError = passwordPolicyError(pending.role, newPassword);
  if (policyError) throw Object.assign(new Error(policyError), { status: 422, code: 'weak_password' });

  const row = await consumePasswordChangeChallenge(challengeId);
  const [[user]] = await pool.execute('SELECT * FROM nova_users WHERE id = ? AND deleted_at IS NULL', [row.user_id]);
  if (!user) throw Object.assign(new Error('Demande invalide.'), { status: 400, code: 'invalid_challenge' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  // Activation unique : seule la première demande aboutit. Le code provisoire, les autres demandes de
  // changement en cours et toute session antérieure deviennent invalides.
  const [activated] = await pool.execute(
    `UPDATE nova_users
     SET password_hash = ?, must_change_password = 0, password_changed_at = NOW(),
         failed_login_attempts = 0, locked_until = NULL, activation_expires_at = NULL,
         session_version = session_version + 1
     WHERE id = ? AND must_change_password = 1 AND deleted_at IS NULL AND disabled_at IS NULL
       AND (activation_expires_at IS NULL OR activation_expires_at > NOW(3))`,
    [passwordHash, user.id]
  );
  await pool.execute('UPDATE nova_auth_challenges SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [user.id]);
  if (!activated.affectedRows) {
    throw Object.assign(new Error('Ce compte a déjà été activé ou le code a expiré. Reconnectez-vous.'), { status: 409, code: 'activation_unavailable' });
  }
  user.session_version = Number(user.session_version || 0) + 1;
  if (MFA_REQUIRED_ROLES.includes(user.role)) {
    const next = user.mfa_enabled && user.mfa_secret_enc
      ? await startTotpLogin(user.id)
      : await startTotpEnrollment(user);
    return { ...next, role: user.role };
  }
  return { user: toSessionUser(user) };
}

export async function phoneExists(phone) {
  const cleaned = phone.replace(/\s/g, '');
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE phone = ?', [cleaned]);
  return !!user;
}

/**
 * Cleanup expired OTPs (call periodically or via cron).
 */
export async function cleanupExpiredOtps() {
  await pool.execute('DELETE FROM nova_otp WHERE expires_at < NOW()');
}

function recoveryDigest(code) {
  return createHash('sha256').update(String(code).replace(/[\s-]/g, '').toUpperCase()).digest('hex');
}

export async function issuePatientRecoveryCode(userId, currentPassword) {
  const [[user]] = await pool.execute(
    "SELECT password_hash FROM nova_users WHERE id = ? AND role = 'patient' AND disabled_at IS NULL AND deleted_at IS NULL",
    [userId]
  );
  if (!user?.password_hash || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw Object.assign(new Error('Mot de passe actuel incorrect.'), { status: 400 });
  }
  const code = randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g).join('-');
  const [updated] = await pool.execute(
    "UPDATE nova_users SET patient_recovery_hash = ? WHERE id = ? AND password_hash = ? AND role = 'patient' AND disabled_at IS NULL AND deleted_at IS NULL",
    [recoveryDigest(code), userId, user.password_hash]
  );
  if (updated.affectedRows !== 1) throw Object.assign(new Error('Le compte a changé. Reconnectez-vous.'), { status: 409 });
  return { code };
}

export async function recoverPatientPassword(phone, code, newPassword) {
  const policyError = passwordPolicyError('patient', newPassword);
  if (policyError) throw Object.assign(new Error(policyError), { status: 422 });
  const hash = recoveryDigest(code);
  const invalid = () => Object.assign(new Error('Numéro ou code de secours invalide.'), { status: 400, code: 'invalid_recovery' });
  const [[account]] = await pool.execute(
    "SELECT id FROM nova_users WHERE phone = ? AND patient_recovery_hash = ? AND role = 'patient' AND disabled_at IS NULL AND deleted_at IS NULL",
    [normalizePhone(phone), hash]
  );
  if (!account) throw invalid();
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [updated] = await conn.execute(
      `UPDATE nova_users SET password_hash = ?, patient_recovery_hash = NULL,
          must_change_password = 0, password_changed_at = NOW(), failed_login_attempts = 0,
          locked_until = NULL, session_version = session_version + 1
       WHERE id = ? AND patient_recovery_hash = ? AND role = 'patient'
         AND disabled_at IS NULL AND deleted_at IS NULL`,
      [passwordHash, account.id, hash]
    );
    if (updated.affectedRows !== 1) throw invalid();
    await conn.execute('UPDATE nova_auth_challenges SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [account.id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return { ok: true };
}
