import React from 'react';

export default function HeartLoader({ darkMode = false, fullPage = false, compact = false, label = 'Chargement de NOVA…' }) {
  return (
    <div role="status" aria-live="polite" className={`nova-heart-loader ${fullPage ? 'nova-heart-loader--full' : ''} ${compact ? 'nova-heart-loader--compact' : ''} ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
      <span className="nova-heart-loader__halo" aria-hidden="true">
        <img src="/nova-icon.svg" alt="" width="64" height="64" className="nova-heart-loader__logo" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
