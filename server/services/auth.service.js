import bcrypt from 'bcrypt';
import { pool } from '../db/database.js';

export async function loginUser(phone, code) {
  const cleaned = phone.replace(/\s/g, '');
  const [[user]] = await pool.execute('SELECT * FROM nova_users WHERE phone = ?', [cleaned]);
  if (!user) return null;
  const valid = await bcrypt.compare(code, user.code_hash);
  if (!valid) return null;
  return {
    id:        user.id,
    role:      user.role,
    patientId: user.patient_id,
    name:      user.name,
    avatar:    user.avatar,
  };
}

export async function phoneExists(phone) {
  const cleaned = phone.replace(/\s/g, '');
  const [[user]] = await pool.execute('SELECT id FROM nova_users WHERE phone = ?', [cleaned]);
  return !!user;
}
