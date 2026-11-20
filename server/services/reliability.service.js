import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../db/database.js';
import { uploadDir, uploadDirIsExternal } from '../middleware/upload.js';

export const CHECK_MAX_AGE_DAYS = { backup: 2, restore: 90 };

export function reliabilityCheckStatus(kind, verifiedAt, now = Date.now()) {
  if (!verifiedAt) return 'missing';
  const timestamp = new Date(verifiedAt).getTime();
  if (!Number.isFinite(timestamp) || timestamp > now) return 'missing';
  return now - timestamp > CHECK_MAX_AGE_DAYS[kind] * 86400000 ? 'overdue' : 'current';
}

export async function checkUploadsWritable() {
  const probe = path.join(uploadDir, `.health-${randomUUID()}`);
  try {
    await fs.writeFile(probe, '', { flag: 'wx', mode: 0o600 });
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

export async function getReliability() {
  const rows = await Promise.all(Object.keys(CHECK_MAX_AGE_DAYS).map(async (kind) => {
    const [[row]] = await pool.execute(
      `SELECT id, kind, verified_at AS verifiedAt, reference, created_at AS createdAt
       FROM nova_reliability_checks WHERE kind = ? ORDER BY verified_at DESC, created_at DESC LIMIT 1`, [kind]
    );
    return row;
  }));
  return {
    uploads: await checkUploadsWritable() ? 'writable' : 'read-only',
    uploadsStorage: uploadDirIsExternal ? 'external' : 'app',
    checks: Object.entries(CHECK_MAX_AGE_DAYS).map(([kind, maxAgeDays]) => {
      const last = rows.find((row) => row?.kind === kind);
      return { kind, maxAgeDays, status: reliabilityCheckStatus(kind, last?.verifiedAt), last: last || null };
    }),
  };
}

export async function recordReliabilityCheck(userId, { kind, verifiedAt, reference }) {
  const date = new Date(verifiedAt);
  if (!Object.hasOwn(CHECK_MAX_AGE_DAYS, kind) || !Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
    throw Object.assign(new Error('Type ou date du contrôle invalide. La date doit être passée.'), { status: 422 });
  }
  const id = randomUUID();
  await pool.execute(
    'INSERT INTO nova_reliability_checks (id, kind, verified_at, reference, verified_by) VALUES (?, ?, ?, ?, ?)',
    [id, kind, date, reference.trim(), userId]
  );
  return { id, kind, verifiedAt: date.toISOString(), reference: reference.trim() };
}
