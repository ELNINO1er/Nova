export const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

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
