import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { initDb } from './db/database.js';
import patientRoutes from './routes/patient.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { openApiSpec } from './openapi.js';
import { uploadDir } from './middleware/upload.js';

const app = express();
const port = Number(process.env.API_PORT || 4001);

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5174' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nova-api' });
});

app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'NOVA API Docs',
}));

app.use('/api/patient/me', patientRoutes);
app.use('/uploads', express.static(uploadDir));

app.use(notFoundHandler);
app.use(errorHandler);

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`NOVA API running on http://localhost:${port}`);
      console.log(`Base de données : MySQL (sika_sante)`);
    });
  })
  .catch((err) => {
    console.error('Erreur connexion MySQL :', err.message);
    process.exit(1);
  });
