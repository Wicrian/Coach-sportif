import { describe, expect, it } from 'vitest';
import { rectangleCarre } from './avatar';

describe('rectangleCarre : recadrage centré en carré', () => {
  it('image large : on garde le centre', () => expect(rectangleCarre(400, 300)).toEqual({ x: 50, y: 0, cote: 300 }));
  it('image haute : on garde le centre', () => expect(rectangleCarre(300, 400)).toEqual({ x: 0, y: 50, cote: 300 }));
  it('image déjà carrée : rien à couper', () => expect(rectangleCarre(500, 500)).toEqual({ x: 0, y: 0, cote: 500 }));
  it('dimensions impaires : coordonnées entières', () => expect(rectangleCarre(401, 300)).toEqual({ x: 50, y: 0, cote: 300 }));
});
