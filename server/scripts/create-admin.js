import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { initDb, pool } from '../db/database.js';
import { normalizePhone } from '../services/phone.js';

const phone = normalizePhone(process.env.ADMIN_PHONE);
const name = String(process.env.ADMIN_NAME || 'Administrateur NOVA').trim();

if (!phone) {
  console.error('ADMIN_PHONE est requis : numero a 10 chiffres (ex. 0749157741).');
  process.exit(1);
}

try {
  await initDb();
  const [[existing]] = await pool.execute('SELECT id, role FROM nova_users WHERE phone = ?', [phone]);
  if (existing && existing.role !== 'admin') throw new Error('Ce numero appartient deja a un compte non administrateur.');

  const unusableLegacyHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  // Mot de passe provisoire affiché une seule fois ; à changer à la première connexion.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  // ADMIN_PASSWORD (optionnel) : mot de passe définitif choisi par le propriétaire, jamais affiché.
  const chosen = process.env.ADMIN_PASSWORD || '';
  if (chosen && (chosen.length < 8 || !/[A-Za-z]/.test(chosen) || !/\d/.test(chosen))) {
    throw new Error('ADMIN_PASSWORD : 8 caracteres minimum avec lettres et chiffres.');
  }
  const provisional = chosen || `${Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join('')}a7K!`;
  const mustChange = chosen ? 0 : 1;
  const passwordHash = await bcrypt.hash(provisional, 12);
  const now = new Date().toISOString();
  if (existing) {
    // Relancer le script sur un admin existant sert aussi à réinitialiser son mot de passe.
    await pool.execute(
      `UPDATE nova_users SET name = ?, password_hash = ?, must_change_password = ?,
         failed_login_attempts = 0, locked_until = NULL, deleted_at = NULL, updated_at = ? WHERE id = ?`,
      [name, passwordHash, mustChange, now, existing.id]
    );
    console.log(`Administrateur existant, mot de passe reinitialise: ${phone}`);
  } else {
    await pool.execute(
      `INSERT INTO nova_users (id, phone, code_hash, password_hash, must_change_password, role, name, avatar, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'admin', ?, 'AD', ?, ?)`,
      [randomUUID(), phone, unusableLegacyHash, passwordHash, mustChange, name, now, now]
    );
    console.log(`Administrateur cree: ${phone}`);
  }
  if (chosen) console.log('Mot de passe defini depuis ADMIN_PASSWORD (non affiche).');
  else console.log(`Mot de passe provisoire (affiche une seule fois) : ${provisional}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
