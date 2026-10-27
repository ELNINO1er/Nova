import multer from 'multer';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'not_found',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

const DEFAULT_CODES = {
  400: 'bad_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found',
  409: 'conflict', 413: 'payload_too_large', 415: 'unsupported_media_type',
  422: 'validation_error', 429: 'too_many_requests',
};

// Erreurs MySQL causées par une saisie invalide : ce sont des 4xx, pas des pannes.
const MYSQL_INPUT_ERRORS = {
  ER_NO_REFERENCED_ROW_2:   [422, 'Référence inconnue.'],
  ER_TRUNCATED_WRONG_VALUE: [422, 'Valeur invalide.'],
  ER_WRONG_VALUE:           [422, 'Valeur invalide.'],
  ER_DATA_TOO_LONG:         [422, 'Valeur trop longue.'],
  ER_DUP_ENTRY:             [409, 'Cet élément existe déjà.'],
};

function normalize(err) {
  if (err?.name === 'ZodError') {
    return { status: 422, code: 'validation_error', message: 'Données invalides.', details: err.flatten?.() };
  }
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? { status: 413, code: 'file_too_large', message: 'Fichier trop volumineux (10 Mo maximum).' }
      : { status: 400, code: 'invalid_upload', message: 'Envoi de fichier invalide.' };
  }
  if (err?.type === 'entity.parse.failed') {
    return { status: 400, code: 'invalid_json', message: 'Corps de requête JSON invalide.' };
  }
  if (MYSQL_INPUT_ERRORS[err?.code]) {
    const [status, message] = MYSQL_INPUT_ERRORS[err.code];
    return { status, code: 'invalid_input', message };
  }
  const status = err?.status || err?.statusCode || 500;
  if (status >= 500) return { status, code: 'server_error', message: 'Erreur interne du serveur' };
  // Ne renvoyer que des codes applicatifs (snake_case), jamais un code technique brut.
  const code = typeof err.code === 'string' && /^[a-z][a-z_]*$/.test(err.code) ? err.code : (DEFAULT_CODES[status] || 'error');
  return { status, code, message: err.message || 'Requête invalide.' };
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const { status, code, message, details } = normalize(err);
  if (status >= 500) console.error('[ERROR]', err);
  res.status(status).json({ error: code, message, ...(details ? { details } : {}) });
}
