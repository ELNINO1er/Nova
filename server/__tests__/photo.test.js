import { describe, expect, it } from 'vitest';
import { decodePhoto, MAX_PHOTO_BYTES } from '../services/photo.service.js';

const dataUrl = (type, bytes) => `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10];

describe('Photo de profil', () => {
  it('accepte une image dont le contenu correspond au format', () => {
    expect(decodePhoto(dataUrl('image/jpeg', JPEG))).toMatchObject({ ext: '.jpg' });
  });

  it('refuse un autre format, un contenu déguisé et une image trop lourde', () => {
    expect(() => decodePhoto(dataUrl('image/gif', [0x47, 0x49, 0x46]))).toThrow(/formats acceptés/);
    expect(() => decodePhoto(dataUrl('image/png', JPEG))).toThrow(/ne correspond pas/);
    expect(() => decodePhoto(dataUrl('image/jpeg', [...JPEG, ...new Array(MAX_PHOTO_BYTES)]))).toThrow(/trop lourde/);
    expect(() => decodePhoto('javascript:alert(1)')).toThrow();
  });
});
