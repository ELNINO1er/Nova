import { Server } from 'socket.io';
import { resolveAccessToken, getCookie } from './middleware/auth.js';
import { pool } from './db/database.js';

// Temps réel (Socket.IO) : messages et notifications poussés aux utilisateurs connectés.
// Chaque socket rejoint la salle « user:<id> » ; rien n'est diffusé en dehors de ces salles.
// Socket.IO bascule seul en long polling si l'hébergeur ne relaie pas les WebSockets.
let io = null;

const REVERIFY_MS = 5 * 60 * 1000;

export function initRealtime(httpServer, { allowedOrigins = [] } = {}) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: allowedOrigins, credentials: true },
    serveClient: false,
    maxHttpBufferSize: 10_000, // le client n'envoie rien d'utile : pas de gros paquets
  });

  io.use(async (socket, next) => {
    try {
      const token = getCookie(socket.request, 'nova_access_token') || socket.handshake.auth?.token;
      if (!token) return next(Object.assign(new Error('unauthorized'), { data: { code: 'unauthorized' } }));
      const result = await resolveAccessToken(token);
      if (result.error) return next(Object.assign(new Error('unauthorized'), { data: { code: result.error } }));
      socket.data.user = result.payload;
      return next();
    } catch {
      return next(Object.assign(new Error('unauthorized'), { data: { code: 'invalid_token' } }));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);
    // Jeton expiré ou session révoquée : la connexion est fermée ; le client renouvelle sa session puis se reconnecte.
    const expiresIn = Math.max(0, user.exp * 1000 - Date.now());
    const expiry = setTimeout(() => { socket.emit('session:expired'); socket.disconnect(true); }, Math.min(expiresIn, 2_147_483_647));
    const recheck = setInterval(async () => {
      try {
        const [[account]] = await pool.execute('SELECT session_version FROM nova_users WHERE id=? AND deleted_at IS NULL AND disabled_at IS NULL', [user.id]);
        if (!account || Number(account.session_version) !== Number(user.sessionVersion || 0)) { socket.emit('session:expired'); socket.disconnect(true); }
      } catch { /* base indisponible : on réessaiera */ }
    }, REVERIFY_MS);
    socket.on('disconnect', () => { clearTimeout(expiry); clearInterval(recheck); });
  });
  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function closeRealtime() {
  return new Promise((resolve) => { if (!io) return resolve(); io.close(() => resolve()); io = null; });
}
