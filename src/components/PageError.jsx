import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Affiché à la place d'une page dont le chargement a échoué, pour éviter un squelette infini.
export default function PageError({ message, onRetry, card = 'bg-white border-slate-200', sub = 'text-slate-500' }) {
  return (
    <div className={`${card} border rounded-2xl p-8 text-center space-y-3`}>
      <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
      <p className="font-bold">Impossible de charger cette page</p>
      {message && <p className={`text-sm ${sub}`}>{message}</p>}
      <button onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
        <RefreshCw className="w-4 h-4" /> Réessayer
      </button>
    </div>
  );
}
