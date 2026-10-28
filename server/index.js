import { invalidateAfterMutation } from './middleware/cache.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db/database.js';
import { pool } from './db/database.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes  from './routes/doctor.routes.js';
import authRoutes     from './routes/auth.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import governorRoutes from './routes/governor.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { openApiSpec } from './openapi.js';

const app = express();
const port = Number(process.env.API_PORT || 4001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

const isProduction = process.env.NODE_ENV === 'production';
// Le code SMS de démo n'est exposé que si la connexion par SMS est réactivée.
const isDemoMode = process.env.SEED_DEMO === 'true'
  || (process.env.OTP_LOGIN_ENABLED === 'true' && (process.env.SMS_PROVIDER || 'demo').toLowerCase() === 'demo');
if (isProduction && isDemoMode && process.env.ALLOW_INSECURE_DEMO !== 'true') {
  throw new Error(
    'Configuration refusée : le mode démo est interdit en production. '
    + 'Utilisez un environnement de staging ou définissez explicitement ALLOW_INSECURE_DEMO=true pour un pilote privé.'
  );
}
if (isProduction && (!process.env.MFA_ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY.length < 32)) {
  throw new Error('MFA_ENCRYPTION_KEY doit contenir au moins 32 caractères en production.');
}
if (isProduction && process.env.COOKIE_SECURE === 'false' && process.env.ALLOW_INSECURE_DEMO !== 'true') {
  throw new Error('COOKIE_SECURE=false est réservé aux pilotes privés explicitement autorisés.');
}

if (isProduction) app.set('trust proxy', 1);

app.use(compression());
app.use(helmet());
const allowedOrigins = (process.env.WEB_ORIGIN || 'http://localhost:5174')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin non autorisee.');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
// Journal d'accès : format standard en production (lisible via `docker compose logs api`).
app.use(morgan(isProduction ? 'combined' : 'dev'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'too_many_requests', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Ne jamais limiter les endpoints de session appelés automatiquement par le SPA
    // (sinon un usage normal épuise le quota et bloque toute l'application).
    if (req.path === '/refresh' || req.path === '/me' || req.path === '/logout') return true;
    // Désactiver la limite hors production pour faciliter le dev et les démos.
    return process.env.NODE_ENV !== 'production';
  },
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'nova-api', database: 'up' });
  } catch {
    res.status(503).json({ ok: false, service: 'nova-api', database: 'down' });
  }
});

if (!isProduction || process.env.ENABLE_API_DOCS === 'true') {
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'NOVA API Docs',
  }));
}

app.use('/api',invalidateAfterMutation);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patient/me',  patientRoutes);
app.use('/api/doctor/me',   doctorRoutes);
app.use('/api/pharmacy/me', pharmacyRoutes);
app.use('/api/admin/me',    adminRoutes);
app.use('/api/governor/me', governorRoutes);

if (isProduction) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

// Filet de sécurité : une promesse rejetée non gérée ne doit pas arrêter l'API.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

initDb()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`NOVA API running on http://localhost:${port}`);
      console.log(`Base de données : MySQL (${process.env.DB_NAME || 'nova'})`);
    });

    const shutdown = async () => {
      console.log('\nArrêt en cours...');
      server.close();
      await pool.end();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('Erreur connexion MySQL :', err.message);
    process.exit(1);
  });
