import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { pool } from '../db/database.js';
import { securityEvent } from '../middleware/logging.js';

const CHALLENGE_MINUTES = 10;
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encryptionKey() {
  const source = process.env.MFA_ENCRYPTION_KEY
    || (process.env.NODE_ENV !== 'production' ? process.env.JWT_SECRET : '');
  if (!source || source.length < 32) {
    throw Object.assign(new Error('MFA_ENCRYPTION_KEY doit contenir au moins 32 caractères.'), { status: 500 });
  }
  return createHash('sha256').update(source).digest();
}

function encrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decrypt(value) {
  const [ivText, tagText, encryptedText] = String(value || '').split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Secret MFA invalide.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function toBase32(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

function fromBase32(value) {
  const clean = String(value).toUpperCase().replace(/=+$/g, '').replace(/\s/g, '');
  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Secret TOTP invalide.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totpAt(secret, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', fromBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** TOTP_DIGITS);
  return String(binary).padStart(TOTP_DIGITS, '0');
}

export function generateTotpCode(secret, now = Date.now()) {
  return totpAt(secret, Math.floor(now / 1000 / TOTP_STEP_SECONDS));
}

// Renvoie le pas TOTP correspondant au code (ou null) : sert à refuser un code déjà utilisé.
export function matchTotpCounter(secret, code, now = Date.now()) {
  const value = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(value)) return null;
  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(totpAt(secret, counter + drift));
    const received = Buffer.from(value);
    if (expected.length === received.length && timingSafeEqual(expected, received)) return counter + drift;
  }
  return null;
}

export function verifyTotpCode(secret, code, now = Date.now()) {
  return matchTotpCounter(secret, code, now) !== null;
}

// Au-delà de MFA_ACCOUNT_MAX_FAILURES échecs consécutifs (tous challenges confondus), compte bloqué 15 minutes.
export const MFA_ACCOUNT_MAX_FAILURES = 10;

function recoveryHash(code) {
  return createHmac('sha256', encryptionKey()).update(String(code).toUpperCase()).digest('hex');
}

function generateRecoveryCodes() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => {
    let value = '';
    const bytes = randomBytes(8);
    for (let i = 0; i < 8; i += 1) value += alphabet[bytes[i] % alphabet.length];
    return `${value.slice(0, 4)}-${value.slice(4)}`;
  });
}

async function createChallenge(userId, type, secretEnc = null) {
  await pool.execute(
    'UPDATE nova_auth_challenges SET used_at = NOW() WHERE user_id = ? AND type = ? AND used_at IS NULL',
    [userId, type]
  );
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO nova_auth_challenges (id, user_id, type, secret_enc, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [id, userId, type, secretEnc, CHALLENGE_MINUTES]
  );
  return id;
}

async function getChallenge(id, type) {
  const [[row]] = await pool.execute(
    `SELECT c.*, u.role, u.patient_id, u.doctor_id, u.pharmacy_id, u.name, u.avatar,
            u.mfa_secret_enc, u.recovery_codes_json, u.mfa_last_counter, u.locked_until
     FROM nova_auth_challenges c
     JOIN nova_users u ON u.id = c.user_id
     WHERE c.id = ? AND c.type = ? AND c.used_at IS NULL AND c.expires_at > NOW()
       AND u.deleted_at IS NULL AND u.disabled_at IS NULL
     LIMIT 1`,
    [id, type]
  );
  if (!row || row.attempts >= row.max_attempts) {
    throw Object.assign(new Error('Challenge expiré ou invalide. Recommencez la connexion.'), { status: 401, code: 'invalid_challenge' });
  }
  return row;
}

// Réserve une tentative de façon atomique : des requêtes parallèles ne peuvent pas dépasser max_attempts.
async function reserveAttempt(row) {
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    throw Object.assign(new Error('Trop d’essais. Compte bloqué 15 minutes.'), { status: 423, code: 'account_locked' });
  }
  const [r] = await pool.execute(
    'UPDATE nova_auth_challenges SET attempts = attempts + 1 WHERE id = ? AND used_at IS NULL AND attempts < max_attempts AND expires_at > NOW()',
    [row.id]
  );
  if (r.affectedRows !== 1) {
    throw Object.assign(new Error('Challenge expiré ou invalide. Recommencez la connexion.'), { status: 401, code: 'invalid_challenge' });
  }
}

// Échec compté sur le compte : au 10e échec consécutif, blocage 15 minutes et fin des challenges ouverts.
async function failChallenge(row) {
  await pool.execute(
    `UPDATE nova_users SET failed_mfa_attempts = failed_mfa_attempts + 1,
       locked_until = CASE WHEN failed_mfa_attempts >= ? THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE locked_until END
     WHERE id = ?`,
    [MFA_ACCOUNT_MAX_FAILURES, row.user_id]
  );
  const [[u]] = await pool.execute('SELECT failed_mfa_attempts FROM nova_users WHERE id = ?', [row.user_id]);
  if (Number(u?.failed_mfa_attempts) >= MFA_ACCOUNT_MAX_FAILURES) {
    await pool.execute('UPDATE nova_auth_challenges SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [row.user_id]);
    securityEvent('security.mfa_lockout', { userId: row.user_id });
  }
}

async function consumeChallenge(row) {
  const [result] = await pool.execute(
    'UPDATE nova_auth_challenges SET used_at = NOW() WHERE id = ? AND used_at IS NULL',
    [row.id]
  );
  if (result.affectedRows !== 1) {
    throw Object.assign(new Error('Challenge déjà utilisé.'), { status: 401 });
  }
}

export function mapMfaUser(row) {
  return {
    id: row.user_id || row.id,
    role: row.role,
    patientId: row.patient_id || null,
    doctorId: row.doctor_id || null,
    pharmacyId: row.pharmacy_id || null,
    name: row.name,
    avatar: row.avatar,
  };
}

export async function createPasswordChangeChallenge(userId) {
  return createChallenge(userId, 'password_change');
}

/** Lit le challenge sans le consommer (pour valider la saisie avant de l'utiliser). */
export async function getPasswordChangeChallenge(challengeId) {
  return getChallenge(challengeId, 'password_change');
}

export async function consumePasswordChangeChallenge(challengeId) {
  const row = await getChallenge(challengeId, 'password_change');
  await consumeChallenge(row);
  return row;
}

export async function startTotpEnrollment(user) {
  const secret = toBase32(randomBytes(20));
  const issuer = 'NOVA Santé';
  const label = encodeURIComponent(`${issuer}:${user.doctor_email || user.name || user.id}`);
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
  const challengeId = await createChallenge(user.id, 'totp_enrollment', encrypt(secret));
  return {
    nextAction: 'enroll_totp',
    challengeId,
    secret,
    qrCodeDataUrl: await QRCode.toDataURL(uri, { width: 220, margin: 1, errorCorrectionLevel: 'M' }),
    expiresIn: CHALLENGE_MINUTES * 60,
  };
}

export async function verifyTotpEnrollment(challengeId, code) {
  const row = await getChallenge(challengeId, 'totp_enrollment');
  await reserveAttempt(row);
  const secret = decrypt(row.secret_enc);
  const counter = matchTotpCounter(secret, code);
  if (counter === null) {
    await failChallenge(row);
    throw Object.assign(new Error('Code Authenticator incorrect.'), { status: 401 });
  }
  await consumeChallenge(row);
  const recoveryCodes = generateRecoveryCodes();
  await pool.execute(
    `UPDATE nova_users
     SET mfa_enabled = 1, mfa_secret_enc = ?, recovery_codes_json = ?, failed_login_attempts = 0, failed_mfa_attempts = 0,
         locked_until = NULL, mfa_last_counter = ?
     WHERE id = ?`,
    [encrypt(secret), JSON.stringify(recoveryCodes.map(recoveryHash)), counter, row.user_id]
  );
  return { user: mapMfaUser(row), recoveryCodes };
}

export async function startTotpLogin(userId) {
  return {
    nextAction: 'verify_totp',
    challengeId: await createChallenge(userId, 'totp_login'),
    expiresIn: CHALLENGE_MINUTES * 60,
  };
}

export async function verifyTotpLogin(challengeId, code) {
  const row = await getChallenge(challengeId, 'totp_login');
  await reserveAttempt(row);
  let valid = false;
  let remainingRecovery = null;
  let counter = null;

  if (/^\d{6}$/.test(String(code || ''))) {
    counter = row.mfa_secret_enc ? matchTotpCounter(decrypt(row.mfa_secret_enc), code) : null;
    // Anti-rejeu : un code (pas TOTP) déjà accepté pour ce compte est refusé.
    valid = counter !== null && (row.mfa_last_counter == null || counter > Number(row.mfa_last_counter));
  } else {
    const hashes = JSON.parse(row.recovery_codes_json || '[]');
    const hash = recoveryHash(String(code || '').trim());
    const index = hashes.findIndex((candidate) => {
      const a = Buffer.from(candidate);
      const b = Buffer.from(hash);
      return a.length === b.length && timingSafeEqual(a, b);
    });
    if (index >= 0) {
      valid = true;
      remainingRecovery = hashes.filter((_, current) => current !== index);
    }
  }

  if (!valid) {
    await failChallenge(row);
    throw Object.assign(new Error('Code Authenticator ou code de récupération incorrect.'), { status: 401 });
  }
  await consumeChallenge(row);
  if (remainingRecovery) {
    // Code de récupération à usage unique, même en cas de connexions simultanées (comparer-et-écrire).
    const [r] = await pool.execute(
      'UPDATE nova_users SET recovery_codes_json = ? WHERE id = ? AND recovery_codes_json = ?',
      [JSON.stringify(remainingRecovery), row.user_id, row.recovery_codes_json]
    );
    if (r.affectedRows !== 1) throw Object.assign(new Error('Code de récupération déjà utilisé.'), { status: 401 });
  }
  const [ok] = await pool.execute(
    `UPDATE nova_users SET failed_login_attempts = 0, failed_mfa_attempts = 0, locked_until = NULL,
       mfa_last_counter = COALESCE(?, mfa_last_counter)
     WHERE id = ? AND (? IS NULL OR mfa_last_counter IS NULL OR mfa_last_counter < ?)`,
    [counter, row.user_id, counter, counter]
  );
  if (counter !== null && ok.affectedRows !== 1) throw Object.assign(new Error('Code Authenticator déjà utilisé.'), { status: 401 });
  return { user: mapMfaUser(row), usedRecoveryCode: Boolean(remainingRecovery) };
}
