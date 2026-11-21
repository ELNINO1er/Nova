import HeartLoader from '../../components/HeartLoader.jsx';
import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Save, Shield, Trash2, X } from 'lucide-react';
import { doctorApi } from '../../api/doctorApi.js';
import { confirmDialog } from '../../components/dialogs.jsx';

export default function DSignature({ data, loading, onSave, notify, doctorName, doctorSpec, card, sub, border, darkMode }) {
  const canvasRef = useRef(null);
  const [drawing,      setDrawing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  // Tracé présent sur la zone (une zone vide n'est jamais enregistrée).
  const [hasInk, setHasInk] = useState(false);

  // Charger signature existante dans le canvas
  useEffect(() => {
    const sig = data?.signatureData;
    if (!sig) return;
    setSignatureData(sig);
    setHasInk(true);
    if (!canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = sig;
  }, [data]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setSaved(false);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    // Encre foncée sur fond blanc, quel que soit le thème : la signature reste lisible une fois imprimée.
    ctx.strokeStyle = '#1e293b';
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setSaved(false);
  };

  const removeSaved = async () => {
    const ok = await confirmDialog({ title: 'Supprimer la signature enregistrée ?', message: 'L’image de votre signature sera effacée de votre compte.', confirmLabel: 'Supprimer', cancelLabel: 'Garder', danger: true });
    if (!ok) return;
    setSaving(true);
    try {
      await doctorApi.saveSignature({ signatureData: null });
      clearCanvas();
      setSignatureData(null);
      notify('Signature supprimée');
      onSave();
    } catch (e) { notify(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!hasInk) return notify('Dessinez votre signature avant de l’enregistrer.', 'error');
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setSaving(true);
    try {
      await doctorApi.saveSignature({ signatureData: dataUrl });
      setSignatureData(dataUrl);
      setSaved(true);
      notify('Signature enregistrée');
      onSave();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <HeartLoader darkMode={darkMode} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Edit3 className="w-6 h-6 text-red-600" aria-hidden="true" /> Signature manuscrite</h2>
        <p className={`text-sm ${sub}`}>Image de votre signature, conservée sur votre compte. Elle n’est pas encore apposée sur les ordonnances.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pad de signature */}
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">Dessiner votre signature</h3>
            <button onClick={clearCanvas}
              className={`text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg border ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}>
              <Trash2 className="w-3 h-3" /> Effacer
            </button>
          </div>
          <div className={`rounded-xl border-2 border-dashed overflow-hidden bg-white ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
            <canvas
              ref={canvasRef}
              width={400} height={160}
              role="img" aria-label="Zone de signature : dessinez à la souris ou au doigt"
              className="w-full touch-none cursor-crosshair block"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
          </div>
          <p className={`text-xs ${sub} text-center`}>Signez avec votre souris ou votre doigt (écran tactile)</p>
          {signatureData && <button type="button" onClick={removeSaved} disabled={saving} className={`w-full py-2 rounded-xl border text-xs font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Supprimer la signature enregistrée</button>}
          <button onClick={handleSave} disabled={saving || !hasInk}
            className={`w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all
              ${saved ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement...</>
              : saved
                ? <><CheckCircle2 className="w-4 h-4" />Signature enregistrée !</>
                : <><Save className="w-4 h-4" />Enregistrer la signature</>}
          </button>
        </div>

        {/* Prévisualisation */}
        <div className={`${card} border rounded-2xl p-5 space-y-4`}>
          <h3 className="font-bold text-sm">Aperçu (exemple fictif)</h3>
          <div className="rounded-xl border p-4 space-y-3 bg-white border-slate-200 text-slate-900 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{doctorName || 'Votre nom'}</p>
                <p className="text-xs text-slate-500">{doctorSpec || 'Spécialité'}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-red-600 tracking-widest text-base">ORDONNANCE</p>
                <p className="text-xs text-slate-500">{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="text-xs text-slate-500 space-y-0.5">
              <p><strong>Patient :</strong> (exemple)</p>
              <p className="mt-2 font-semibold">Prescriptions :</p>
              <p>1. Médicament — posologie — durée</p>
            </div>
            <div className="flex justify-end pt-2">
              <div className="w-36 text-right">
                {signatureData ? (
                  <img src={signatureData} alt="Votre signature enregistrée" className="h-12 ml-auto mb-1" />
                ) : (
                  <div className="h-12 flex items-end justify-center text-slate-400">
                    <p className="text-xs italic">Signature</p>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1">
                  <p className="text-[10px] text-slate-500">Signature & cachet</p>
                </div>
              </div>
            </div>
          </div>
          {!signatureData && (
            <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${darkMode ? 'bg-red-900/20 border-red-700/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Aucune signature enregistrée. Dessinez-la puis enregistrez-la pour la conserver sur votre compte.</span>
            </div>
          )}
        </div>
      </div>

      {/* Infos légales */}
      <div className={`${card} border rounded-2xl p-4`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-red-600" /> Ce que fait (et ne fait pas) cette signature</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '🖊️', t: 'Image enregistrée', d: 'Votre tracé est conservé sur votre compte, accessible à vous seul.' },
            { icon: '📋', t: 'Ordonnances', d: 'Pas encore apposée automatiquement sur les ordonnances imprimées.' },
            { icon: '⚠️', t: 'Pas une signature certifiée', d: 'Ce n’est pas une signature électronique qualifiée : elle n’a pas, seule, de valeur légale.' },
          ].map((item, i) => (
            <div key={i} className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className="text-2xl mb-1">{item.icon}</p>
              <p className="font-bold text-sm">{item.t}</p>
              <p className={`text-xs ${sub} mt-0.5`}>{item.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
