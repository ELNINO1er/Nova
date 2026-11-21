import React, { Component } from 'react';
import { HeartPulse } from 'lucide-react';

/**
 * Isole un plantage de rendu.
 * - resetKey : réinitialise l'erreur quand la valeur change (ex. la page courante).
 * - fallback : rendu de remplacement (null = ne rien afficher) ; défaut : écran d'erreur.
 * - onError  : appelé après le plantage (ex. fermer une modale).
 * - fullPage : écran d'erreur plein écran avec rechargement (filet de sécurité racine).
 */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
    this.props.onError?.(error);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    const { fullPage } = this.props;
    return (
      <div className={`flex flex-col items-center justify-center ${fullPage ? 'min-h-screen' : 'min-h-[60vh]'} gap-4 text-center p-8`}>
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <HeartPulse className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-lg font-bold">Une erreur est survenue</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          {fullPage ? 'Rechargez la page pour continuer.' : 'Cette page a rencontré un problème. Réessayez ou changez de page.'}
        </p>
        <button
          onClick={() => (fullPage ? window.location.reload() : this.setState({ hasError: false }))}
          className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
          {fullPage ? 'Recharger' : 'Réessayer'}
        </button>
      </div>
    );
  }
}
