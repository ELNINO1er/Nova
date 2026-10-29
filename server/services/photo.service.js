import path from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pool } from '../db/database.js';
import { uploadDir } from '../middleware/upload.js';

/*
 * Photo de profil du patient : envoyée en data URL (réduite côté navigateur),
 * vérifiée (type déclaré + signature réelle + taille), stockée hors de tout dossier public
 * et servie uniquement par l'API, au patient lui-même.
 */
export const MAX_PHOTO_BYTES = 600 * 1024;
const TYPES = {
  'image/jpeg': { ext: '.jpg', sig: [0xff, 0xd8, 0xff] },
  'image/png': { ext: '.png', sig: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { ext: '.webp', sig: [0x52, 0x49, 0x46, 0x46] },
};

const invalid = (message) => Object.assign(new Error(message), { status: 422, code: 'invalid_photo' });

export function decodePhoto(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw invalid('Photo invalide : formats acceptés JPG, PNG ou WEBP.');
  const type = TYPES[match[1]];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) throw invalid('Photo trop lourde (600 Ko maximum).');
  if (!type.sig.every((byte, i) => buffer[i] === byte)) throw invalid('Le contenu de la photo ne correspond pas à son format.');
  if (match[1] === 'image/webp' && buffer.subarray(8, 12).toString('ascii') !== 'WEBP') throw invalid('Le contenu de la photo ne correspond pas à son format.');
  return { buffer, ext: type.ext };
}

function resolveInUploads(relative) {
  const target = path.resolve(uploadDir, relative);
  return target.startsWith(path.resolve(uploadDir) + path.sep) ? target : null;
}

/* Enregistre la nouvelle photo puis supprime l'ancienne ; `photo` est une data URL ou une photo déjà décodée. */
export async function savePatientPhoto(patientId, photo) {
  const { buffer, ext } = typeof photo === 'string' ? decodePhoto(photo) : photo;
  const relative = path.join(patientId, `photo-${randomUUID()}${ext}`);
  const target = resolveInUploads(relative);
  if (!target) throw invalid('Emplacement de photo invalide.');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  const [[previous]] = await pool.execute('SELECT photo_path FROM nova_patients WHERE id = ?', [patientId]);
  await pool.execute('UPDATE nova_patients SET photo_path = ?, updated_at = ? WHERE id = ?', [relative, new Date().toISOString(), patientId]);
  await removeFile(previous?.photo_path);
  return { hasPhoto: true };
}

export async function removePatientPhoto(patientId) {
  const [[row]] = await pool.execute('SELECT photo_path FROM nova_patients WHERE id = ?', [patientId]);
  await pool.execute('UPDATE nova_patients SET photo_path = NULL, updated_at = ? WHERE id = ?', [new Date().toISOString(), patientId]);
  await removeFile(row?.photo_path);
  return { hasPhoto: false };
}

export async function patientPhotoFile(patientId) {
  const [[row]] = await pool.execute('SELECT photo_path FROM nova_patients WHERE id = ? AND deleted_at IS NULL', [patientId]);
  return row?.photo_path ? resolveInUploads(row.photo_path) : null;
}

async function removeFile(relative) {
  const target = relative && resolveInUploads(relative);
  if (target) await unlink(target).catch(() => {});
}
