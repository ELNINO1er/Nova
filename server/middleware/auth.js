import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env variable is required. Set it in .env');

function verifyToken(req, res) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Token manquant.' });
    return null;
  }
  try {
    return jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    res.status(401).json({ error: 'invalid_token', message: 'Token invalide ou expiré.' });
    return null;
  }
}

export function requirePatient(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'patient') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux patients.' });
  }
  req.user = { id: payload.id, role: payload.role, patientId: payload.patientId };
  next();
}

export function requireDoctor(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;
  if (payload.role !== 'doctor') {
    return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux médecins.' });
  }
  req.user = { id: payload.id, role: payload.role, doctorId: payload.doctorId };
  next();
}
