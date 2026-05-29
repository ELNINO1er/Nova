import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nova-secret-dev-2026';

export function requirePatient(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token manquant.' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (payload.role !== 'patient') {
      return res.status(403).json({ error: 'forbidden', message: 'Accès réservé aux patients.' });
    }
    req.user = { id: payload.id, role: payload.role, patientId: payload.patientId };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token', message: 'Token invalide ou expiré.' });
  }
}
