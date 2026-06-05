import { describe, expect, it } from 'vitest';
import { ensureDestinationNameStructure, getDestinationBaseName } from '@/lib/string-utils';

describe('destination name structure', () => {
  it('adds the ticket prefix and province suffix', () => {
    expect(ensureDestinationNameStructure('Đại Nội', 'Huế')).toBe('vé_Đại Nội_Huế');
  });

  it('does not duplicate an existing suffix', () => {
    expect(ensureDestinationNameStructure('vé_Đại Nội_Huế', 'Huế')).toBe('vé_Đại Nội_Huế');
  });

  it('replaces the old province suffix when province changes', () => {
    expect(ensureDestinationNameStructure('vé_Đại Nội_Huế', 'Đà Nẵng', 'Huế'))
      .toBe('vé_Đại Nội_Đà Nẵng');
  });

  it('returns the base destination name without known structure parts', () => {
    expect(getDestinationBaseName('vé_Phố cổ Hội An_Quảng Nam', ['Quảng Nam']))
      .toBe('Phố cổ Hội An');
  });
});
