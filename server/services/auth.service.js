import bcrypt from 'bcrypt';
import { randomUUID, randomInt } from 'node:crypto';
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
           locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE NULL END
       WHERE id = ?`,
      [user.id]
    );
    return { error: 'invalid_credentials', message: 'Identifiants médecin invalides.' };
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

export async function startPhonePasswordLogin(phone, password) {
  const cleaned = normalizePhone(phone);
  if (!cleaned) return INVALID_PHONE_LOGIN;
  const [[user]] = await pool.execute(
    `SELECT u.*, d.email AS doctor_email
     FROM nova_users u LEFT JOIN nova_doctors d ON d.id = u.doctor_id
     WHERE u.phone = ? AND u.deleted_at IS NULL AND u.disabled_at IS NULL LIMIT 1`,
    [cleaned]
  );
  if (!user) return INVALID_PHONE_LOGIN;
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
           locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE NULL END
       WHERE id = ?`,
      [user.id]
    );
    return INVALID_PHONE_LOGIN;
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
  if (user.role === 'doctor') {
    const next = !user.mfa_enabled || !user.mfa_secret_enc ? await startTotpEnrollment(user) : await startTotpLogin(user.id);
    return { ...next, role: 'doctor' };
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
  await pool.execute(
    `UPDATE nova_users
     SET password_hash = ?, must_change_password = 0, password_changed_at = NOW(),
         failed_login_attempts = 0, locked_until = NULL
     WHERE id = ?`,
    [passwordHash, user.id]
  );
  return toSessionUser(user);
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
