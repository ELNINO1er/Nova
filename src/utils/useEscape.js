import { useEffect, useRef } from 'react';

/** Ferme une fenêtre avec la touche Échap tant qu'elle est ouverte (le gestionnaire le plus récent est utilisé). */
export function useEscape(active, onClose) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') ref.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}
