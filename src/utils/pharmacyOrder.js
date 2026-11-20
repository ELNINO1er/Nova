export function orderIsPartial(order) {
  return ['pending', 'ready', 'unavailable'].includes(order.status) && order.lastDispenseStatus === 'partial';
}

export function pharmacyOrderLabel(order) {
  if (orderIsPartial(order)) return {
    pending: 'Délivrance partielle · reste à préparer',
    ready: 'Complément prêt à retirer',
    unavailable: 'Complément indisponible',
  }[order.status];
  return { pending: 'Envoyée · en attente', ready: 'Prête à retirer', unavailable: 'Indisponible', dispensed: 'Délivrée', cancelled: 'Annulée' }[order.status] || order.status;
}

export function pharmacyOrderTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
