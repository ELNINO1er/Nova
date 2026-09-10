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
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { openApiSpec } from './openapi.js';

const app = express();
const port = Number(process.env.API_PORT || 4001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

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
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nova-api' });
});

app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'NOVA API Docs',
}));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patient/me',  patientRoutes);
app.use('/api/doctor/me',   doctorRoutes);
app.use('/api/pharmacy/me', pharmacyRoutes);
app.use('/api/admin/me',    adminRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

initDb()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`NOVA API running on http://localhost:${port}`);
      console.log(`Base de données : MySQL (sika_sante)`);
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
