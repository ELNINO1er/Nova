// Après une restauration (base + documents) dans un environnement ISOLÉ : vérifie qu'un document
// redevient lisible par l'application elle-même, via la vraie route authentifiée du patient.
//   DB_NAME=nova_restore_test UPLOAD_DIR=/chemin/documents-restaures JWT_SECRET=... node deploy/hostinger/verifier-document-restaure.mjs [identifiant-document]
// Sortie : identifiants techniques, tailles et empreintes uniquement (aucun contenu, aucun nom).
import 'dotenv/config';
import express from 'express';
import { createHash, randomUUID } from 'node:crypto';

if (!/_test$|restore/.test(process.env.DB_NAME || '')) {
  console.error('Refusé : utilisez une base isolée (nom contenant « restore » ou finissant par « _test »).');
  process.exit(2);
}
const { pool } = await import('../../server/db/database.js');
const { signAccessToken } = await import('../../server/middleware/auth.js');
const { default: patientRoutes } = await import('../../server/routes/patient.routes.js');
const { errorHandler } = await import('../../server/middleware/errors.js');

const wanted = process.argv[2];
const [[doc]] = await pool.execute(
  `SELECT d.id, d.patient_id, d.size_bytes, d.file_path, u.id AS user_id, u.session_version FROM nova_documents d
   JOIN nova_users u ON u.patient_id = d.patient_id AND u.role = 'patient' AND u.deleted_at IS NULL
   WHERE d.file_path IS NOT NULL ${wanted ? 'AND d.id = ?' : ''} ORDER BY d.created_at DESC LIMIT 1`, wanted ? [wanted] : []
);
if (!doc) { console.error('Aucun document avec fichier dans la base restaurée.'); await pool.end(); process.exit(1); }

const app = express();
app.use('/api/patient/me', patientRoutes);
app.use(errorHandler);
const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
const token = signAccessToken({ id: doc.user_id, role: 'patient', patientId: doc.patient_id, sessionVersion: Number(doc.session_version) || 0 });
const res = await fetch(`http://127.0.0.1:${server.address().port}/api/patient/me/documents/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
const body = Buffer.from(await res.arrayBuffer());
console.log(JSON.stringify({ document: doc.id, http: res.status, octets: body.length, sha256: createHash('sha256').update(body).digest('hex').slice(0, 16), session: randomUUID().slice(0, 4) }));
server.close(); await pool.end();
process.exit(res.status === 200 && body.length > 0 ? 0 : 1);
