import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Check, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { confirmDialog } from '../../components/dialogs.jsx';
import { formatDate } from '../../utils/format.js';

const URGENCY = { low: 'Faible', medium: 'Normale', high: 'Élevée', urgent: 'Urgente' };

/** Transferts de patients reçus d'un confrère : accepter ou refuser (le confrère est prévenu). */
export default function DReferrals({ card, sub, notify, onChanged }) {
  const [received, setReceived] = useState([]);
  const [busy, setBusy] = useState('');
  const load = () => doctorApi.referrals().then((r) => setReceived((r?.received || []).filter((x) => x.status === 'pending'))).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!received.length) return null;

  const answer = async (ref, accept) => {
    if (!accept && !(await confirmDialog({ title: 'Refuser ce transfert ?', message: `Dr. ${ref.doctorName.replace(/^Dr\. /, '')} sera informé de votre refus pour ${ref.patientName}.`, confirmLabel: 'Refuser', cancelLabel: 'Annuler', danger: true }))) return;
    setBusy(ref.id);
    try {
      await (accept ? doctorApi.acceptReferral(ref.id) : doctorApi.declineReferral(ref.id));
      notify?.(accept ? 'Transfert accepté' : 'Transfert refusé');
      await load();
      onChanged?.();
    } catch (e) { notify?.(e.message, 'error'); }
    finally { setBusy(''); }
  };

  return (
    <section className={`${card} border rounded-2xl p-4 space-y-3`} aria-label="Transferts reçus">
      <h3 className="font-bold text-sm flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-red-600" aria-hidden="true" />Transferts reçus ({received.length})</h3>
      {received.map((r) => (
        <div key={r.id} className="border-t pt-3 first:border-0 first:pt-0 space-y-1">
          <p className="text-sm font-semibold">{r.patientName}</p>
          <p className={`text-xs ${sub}`}>De {r.doctorName}{r.doctorSpecialty ? ` (${r.doctorSpecialty})` : ''} · {formatDate(r.createdAt)} · Urgence {(URGENCY[r.urgency] || 'normale').toLowerCase()}</p>
          <p className="text-xs"><strong>Motif :</strong> {r.reason}</p>
          {r.notes && <p className={`text-xs ${sub}`}>{r.notes}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" disabled={busy === r.id} onClick={() => answer(r, true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"><Check className="w-3 h-3" aria-hidden="true" />Accepter</button>
            <button type="button" disabled={busy === r.id} onClick={() => answer(r, false)} className="px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-50 flex items-center gap-1"><X className="w-3 h-3" aria-hidden="true" />Refuser</button>
          </div>
        </div>
      ))}
    </section>
  );
}
