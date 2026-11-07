import { describe, expect, it } from 'vitest';
import { dimensionsReduites, rectangleCarre } from './avatar';

describe('rectangleCarre : recadrage centré en carré', () => {
  it('image large : on garde le centre', () => expect(rectangleCarre(400, 300)).toEqual({ x: 50, y: 0, cote: 300 }));
  it('image haute : on garde le centre', () => expect(rectangleCarre(300, 400)).toEqual({ x: 0, y: 50, cote: 300 }));
  it('image déjà carrée : rien à couper', () => expect(rectangleCarre(500, 500)).toEqual({ x: 0, y: 0, cote: 500 }));
  it('dimensions impaires : coordonnées entières', () => expect(rectangleCarre(401, 300)).toEqual({ x: 50, y: 0, cote: 300 }));
});

describe('dimensionsReduites : réduire une image sans la déformer', () => {
  it('garde les proportions et limite le plus long côté', () => {
    expect(dimensionsReduites(1284, 2778, 720)).toEqual({ largeur: 333, hauteur: 720 });
    expect(dimensionsReduites(2000, 1000, 720)).toEqual({ largeur: 720, hauteur: 360 });
  });

  it('n\'agrandit jamais une petite image', () => {
    expect(dimensionsReduites(300, 200, 720)).toEqual({ largeur: 300, hauteur: 200 });
  });

  it('ne donne jamais une dimension nulle', () => {
    expect(dimensionsReduites(5000, 1, 720).hauteur).toBe(1);
  });
});

