import {describe,it,expect} from 'vitest';
import {readFileSync,mkdtempSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
function cleanup(dir){const target=resolve(dir);if(dirname(target)!==resolve(tmpdir())||!/^nova-backup-test-/.test(basename(target)))throw new Error('Répertoire temporaire non autorisé');rmSync(target,{recursive:true,force:true});}
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const shell=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/sh';
function run(dump,uploads=true){
 const dir=mkdtempSync(join(tmpdir(),'nova-backup-test-'));mkdirSync(join(dir,'backups'));if(uploads)mkdirSync(join(dir,'uploads'));
 const source=readFileSync(new URL('../../deploy/backup.sh',import.meta.url),'utf8').split('while true;')[0].replaceAll('/backups/','./backups/').replaceAll('/backups ','./backups ').replace('-C /uploads','-C ./uploads');
 const result=spawnSync(shell,[],{cwd:dir,input:`mysqldump() { ${dump}; }
export DB_HOST=localhost DB_NAME=fake
${source}
run_backup
`,encoding:'utf8'});
 return {dir,result};
}
describe('Sauvegardes',()=>{
 it('refuse un dump interrompu sans annoncer de succès',()=>{const {dir,result}=run("printf 'partiel';return 1");try{expect(result.error).toBeUndefined();expect(result.status).toBe(1);expect(result.stdout).not.toContain('base sauvegardée');expect(readdirSync(join(dir,'backups'))).toEqual([]);}finally{cleanup(dir);}});
 it('vérifie une archive compressée après un dump réussi',()=>{const {dir,result}=run("printf 'CREATE TABLE fictive(id INT);'");try{expect(result.status,result.stderr).toBe(0);const files=readdirSync(join(dir,'backups'));expect(files).toHaveLength(2);const dump=files.find(n=>n.endsWith('.sql.gz'));expect(gunzipSync(readFileSync(join(dir,'backups',dump))).toString()).toContain('CREATE TABLE fictive');}finally{cleanup(dir);}});
 it('signale une archive de documents manquante',()=>{const {dir,result}=run("printf 'SQL fictif'",false);try{expect(result.status).toBe(1);expect(result.stdout).not.toContain('documents sauvegardés');}finally{cleanup(dir);}});
});
