import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { initDb } from './db/database.js';
import { pool } from './db/database.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes  from './routes/doctor.routes.js';
import authRoutes    from './routes/auth.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { openApiSpec } from './openapi.js';
import { uploadDir } from './middleware/upload.js';
import { requirePatient } from './middleware/auth.js';

const app = express();
const port = Number(process.env.API_PORT || 4001);

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5174' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_requests', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
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
app.use('/api/patient/me', patientRoutes);
app.use('/api/doctor/me',  doctorRoutes);
app.use('/uploads', requirePatient, express.static(uploadDir));

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
