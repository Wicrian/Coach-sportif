import { describe, expect, it } from 'vitest';
import { nf, texteMontage } from './format';

describe('format', () => {
  it('nombres à la française, sans décimale inutile', () => {
    expect(nf(6.2)).toBe('6,2');
    expect(nf(8)).toBe('8');
    expect(nf(1.5978)).toBe('1,6');
  });

  it('texte du montage des disques', () => {
    expect(texteMontage([], 'paire')).toBe('Barre seule');
    expect(texteMontage([{ poids: 2.3, quantite: 1 }], 'paire')).toBe('Barre + 1 disque de 2,3 kg de chaque côté');
    expect(texteMontage([{ poids: 1.1, quantite: 2 }, { poids: 2.3, quantite: 2 }], 'unique')).toBe('Barre + 2 disques de 1,1 kg et 2 disques de 2,3 kg de chaque côté');
    expect(texteMontage(null, 'paire')).toBe('');
  });
});
