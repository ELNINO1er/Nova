import { pool } from '../db/database.js';

/**
 * Audit log middleware — logs successful actions to nova_audit_logs.
 * Usage: router.post('/prescriptions', auditLog('prescription.create', 'prescription'), ...)
 */
export function auditLog(action, resourceType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Log only successful responses
      if (res.statusCode < 400 && req.user) {
        const resourceId = req.params?.id || body?.id || null;
        pool.execute(
          `INSERT INTO nova_audit_logs (user_id, user_role, action, resource_type, resource_id, details, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            req.user.role,
            action,
            resourceType || null,
            resourceId,
            JSON.stringify({ method: req.method, path: req.originalUrl }),
            req.ip || req.connection?.remoteAddress || null,
            (req.headers['user-agent'] || '').slice(0, 500),
          ]
        ).catch(() => {}); // Never block the response
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Log when a doctor accesses a patient's data.
 * Usage: router.get('/patients/:id', accessLog('patient_record'), ...)
 */
export function accessLog(dataAccessed){
 return (req,res,next)=>{
  const originalJson=res.json.bind(res);
  res.json=function(body){
   if(res.statusCode>=400||!req.user)return originalJson(body);
   const rows=Array.isArray(body)?body:[body];
   const ids=[...new Set(dataAccessed==='patient_record'?[req.params.id]:rows.map(r=>r?.patientId||(dataAccessed==='patient_directory'?r?.id:null)).filter(Boolean))];
   if(!ids.length)return originalJson(body);
   const values=ids.map(id=>[id,req.user.id,req.user.role,dataAccessed]);
   // Un dossier n'est renvoyé qu'après l'enregistrement de sa consultation.
   pool.query('INSERT INTO nova_access_logs(patient_id,accessor_id,accessor_role,data_accessed) VALUES ?',[values])
    .then(()=>originalJson(body)).catch(()=>{res.status(503);originalJson({error:'audit_unavailable',message:'Historique des accès indisponible. Réessayez.'});});
   return res;
  };next();
 };
}
