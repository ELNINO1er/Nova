// Copie les documents vers le dossier persistant (UPLOAD_DIR), avec vérification sha256. Ne supprime jamais
// la source et n'écrase jamais un fichier existant. Simulation par défaut ; sortie : compteurs et chemins
// relatifs techniques seulement (noms UUID), aucun contenu.
//
//   node server/scripts/copy-uploads.js --from <ancien dossier> --to <dossier persistant>          simulation
//   node server/scripts/copy-uploads.js --from <ancien dossier> --to <dossier persistant> --apply  copie + contrôle
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

export function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && !e.name.startsWith('.health-')) out.push(path.relative(root, full));
    }
  };
  if (existsSync(root)) walk(root);
  return out.sort();
}

export function copyUploads(from, to, { apply = false } = {}) {
  const src = path.resolve(from); const dst = path.resolve(to);
  if (src === dst) throw new Error('Source et destination identiques.');
  if (!existsSync(src)) throw new Error(`Source introuvable : ${src}`);
  const report = { total: 0, toCopy: 0, alreadyIdentical: 0, conflicts: [], copied: 0, bytes: 0 };
  for (const rel of listFiles(src)) {
    report.total++;
    const a = path.join(src, rel); const b = path.join(dst, rel);
    if (existsSync(b)) {
      if (sha(a) === sha(b)) report.alreadyIdentical++;
      else report.conflicts.push(rel); // jamais écrasé : à examiner
      continue;
    }
    report.toCopy++;
    report.bytes += statSync(a).size;
    if (!apply) continue;
    mkdirSync(path.dirname(b), { recursive: true, mode: 0o700 });
    copyFileSync(a, b, constants.COPYFILE_EXCL);
    if (sha(a) !== sha(b)) throw new Error(`Contrôle sha256 échoué : ${rel}`);
    report.copied++;
  }
  return report;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const from = arg('--from'); const to = arg('--to') || process.env.UPLOAD_DIR;
    if (!from || !to) throw new Error('Usage : --from <ancien dossier> --to <dossier persistant> [--apply]');
    const apply = process.argv.includes('--apply');
    const r = copyUploads(from, to, { apply });
    console.log(apply ? '== COPIE ==' : '== SIMULATION (ajoutez --apply pour copier) ==');
    console.log(`fichiers source : ${r.total} ; à copier : ${r.toCopy} (${(r.bytes / 1048576).toFixed(1)} Mo) ; déjà identiques : ${r.alreadyIdentical} ; conflits : ${r.conflicts.length}`);
    for (const c of r.conflicts) console.log(`  conflit (non écrasé) : ${c}`);
    if (apply) {
      const missing = listFiles(from).filter((rel) => !existsSync(path.join(to, rel)));
      console.log(`copiés et vérifiés (sha256) : ${r.copied} ; manquants à destination : ${missing.length}`);
      if (missing.length || r.conflicts.length) process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
