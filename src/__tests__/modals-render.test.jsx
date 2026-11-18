import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CreatePatientModal, VideoModal } from '../modals/index.jsx';

// Les fenêtres doivent s'afficher sans planter (une erreur au rendu les ferme aussitôt, sans message).
const props = { onClose: () => {}, darkMode: false, sub: 'text-slate-500', border: 'border-slate-200' };

describe('fenêtres de l’espace médecin', () => {
  it('« Nouveau patient » s’affiche à l’étape 1 avec le sexe à choisir', () => {
    const html = renderToString(<CreatePatientModal {...props} role="doctor" />).replace(/<!-- -->/g, '');
    expect(html).toContain('Nouveau patient');
    expect(html).toContain('Étape 1/3');
    expect(html).toContain('Choisir…');
  });

  it('la fenêtre vidéo s’adresse au médecin', () => {
    expect(renderToString(<VideoModal {...props} role="doctor" />)).toContain('indiquez au patient');
  });
});
