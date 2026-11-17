import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Champ mot de passe avec un œil pour afficher ou masquer la saisie.
// `inline` : rendu sans conteneur, pour les champs déjà en ligne (icône à droite).
export default function PasswordInput({ inline = false, className = '', ...props }) {
  const [shown, setShown] = useState(false);
  const toggle = (
    <button type="button" onClick={() => setShown((s) => !s)} aria-pressed={shown}
      aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={shown ? 'Masquer' : 'Afficher'}
      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">
      {shown ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );
  const input = <input {...props} type={shown ? 'text' : 'password'} autoCapitalize="off" autoCorrect="off" spellCheck={false} className={inline ? className : `${className} pr-11`} />;
  if (inline) return <>{input}{toggle}</>;
  return <span className="relative block">{input}<span className="absolute right-1.5 bottom-0 top-0 flex items-center">{toggle}</span></span>;
}
