import { useEffect, useState } from 'react';
import { patientApi } from '../api/patientApi.js';
import { doctorApi } from '../api/doctorApi.js';

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

export function usePrivatePhoto(load, key) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    let generation = 0;
    let url = null;
    const refresh = async () => {
      const current = ++generation;
      let blob;
      try { blob = await load(); } catch { /* Les initiales restent disponibles. */ }
      if (!alive || current !== generation) return;
      if (url) URL.revokeObjectURL(url);
      url = blob?.size ? URL.createObjectURL(blob) : null;
      setResult({ key, src: url });
    };
    refresh();
    window.addEventListener('nova:photo-changed', refresh);
    return () => {
      alive = false;
      window.removeEventListener('nova:photo-changed', refresh);
      if (url) URL.revokeObjectURL(url);
    };
  }, [load, key]);
  return key && result?.key === key ? result.src : null;
}

export function usePatientPhoto(userId) {
  return usePrivatePhoto(patientApi.photo, userId);
}

export function useDoctorPhoto(userId) {
  return usePrivatePhoto(doctorApi.photo, userId);
}
