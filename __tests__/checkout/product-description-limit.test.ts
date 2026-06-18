import {
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  limitProductDescription,
  normalizeProductDescription,
} from '@/lib/marketplace/product-description';

describe('product description limits', () => {
  it('caps pasted or agent-prefilled descriptions at the NFT template limit', () => {
    const longDescription = 'a'.repeat(PRODUCT_DESCRIPTION_MAX_LENGTH + 75);

    const limited = limitProductDescription(longDescription);

    expect(limited).toHaveLength(PRODUCT_DESCRIPTION_MAX_LENGTH);
    expect(limited).toBe('a'.repeat(PRODUCT_DESCRIPTION_MAX_LENGTH));
  });

  it('trims before building the marketplace create payload', () => {
    const normalized = normalizeProductDescription('  Short product copy  ');

    expect(normalized).toBe('Short product copy');
  });
});
