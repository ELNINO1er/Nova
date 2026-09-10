import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'node:crypto';
import { initDb, pool } from '../db/database.js';

const phone = String(process.env.ADMIN_PHONE || '').replace(/\s/g, '');
const name = String(process.env.ADMIN_NAME || 'Administrateur NOVA').trim();

if (!/^\d{8,15}$/.test(phone)) {
  console.error('ADMIN_PHONE est requis (8 a 15 chiffres, sans indicatif +).');
  process.exit(1);
}

try {
  await initDb();
  const [[existing]] = await pool.execute('SELECT id, role FROM nova_users WHERE phone = ?', [phone]);
  if (existing && existing.role !== 'admin') throw new Error('Ce numero appartient deja a un compte non administrateur.');

  const hash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  const now = new Date().toISOString();
  if (existing) {
    await pool.execute('UPDATE nova_users SET name = ?, deleted_at = NULL, updated_at = ? WHERE id = ?', [name, now, existing.id]);
    console.log(`Administrateur deja present: ${phone}`);
  } else {
    await pool.execute(
      `INSERT INTO nova_users (id, phone, code_hash, role, name, avatar, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', ?, 'AD', ?, ?)`,
      [randomUUID(), phone, hash, name, now, now]
    );
    console.log(`Administrateur cree: ${phone}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
