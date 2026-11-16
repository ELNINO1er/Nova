// Transmet next au gestionnaire (sendFile, téléchargements) et route toute erreur, même synchrone,
// vers le gestionnaire d'erreurs Express au lieu d'une exception non interceptée.
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve().then(() => fn(req, res, next)).catch(next);

// Portrait privé (photo médecin ou patient) : absent ou introuvable = 204, autre erreur = gestionnaire d'erreurs.
export function sendPortrait(res, file, next) {
  res.set('Cache-Control', 'private, no-store');
  if (!file) return res.status(204).end();
  res.sendFile(file, (err) => {
    if (!err || res.headersSent) return;
    if (err.status === 404 || err.code === 'ENOENT' || err.code === 'ENOTDIR') return res.status(204).end();
    next(err);
  });
}

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      // Message lisible : le message métier du schéma s'il est en français, sinon le champ concerné.
      const issue = parsed.error.issues[0];
      const custom = issue?.message && !/^(Invalid|Expected|Required|String|Too|Number|Array)/.test(issue.message);
      const field = issue?.path?.length ? ` (${issue.path.join('.')})` : '';
      return res.status(422).json({
        error: 'validation_error',
        message: custom ? issue.message : `Donnée invalide${field}. Vérifiez le formulaire.`,
        details: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };
}
