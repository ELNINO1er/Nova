import { useEffect, useState } from 'react';
import { patientApi } from '../api/patientApi.js';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_ACCEPT = ACCEPTED.join(',');
const SIZE = 512;

/* Recadre la photo au centre en carré 512 px et la compresse en JPEG (quelques dizaines de Ko). */
export async function preparePhoto(file) {
  if (!file || !ACCEPTED.includes(file.type)) throw new Error('Choisissez une image JPG, PNG ou WEBP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image trop lourde (10 Mo maximum).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image illisible.'));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const announcePhotoChange = () => window.dispatchEvent(new Event('nova:photo-changed'));

/* URL locale de la photo du patient connecté (null s'il n'en a pas) ; suit les changements. */
export function usePatientPhoto(enabled) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let current = null;
    let alive = true;
    const load = () => patientApi.photo()
      .then((blob) => {
        if (!alive) return;
        if (!blob?.size) throw new Error('no_photo');
        const next = URL.createObjectURL(blob);
        if (current) URL.revokeObjectURL(current);
        current = next;
        setSrc(next);
      })
      .catch(() => { if (alive) { if (current) URL.revokeObjectURL(current); current = null; setSrc(null); } });
    load();
    window.addEventListener('nova:photo-changed', load);
    return () => { alive = false; window.removeEventListener('nova:photo-changed', load); if (current) URL.revokeObjectURL(current); };
  }, [enabled]);
  return src;
}
