import { buildVaultItems } from '@/components/wallet/nft/nft-details-view';

describe('NFT detail holder content', () => {
  it('does not invent holder content for regular wallet NFTs', () => {
    expect(buildVaultItems(false)).toEqual([]);
  });

  it('shows receipt-gated holder content for receipt NFTs', () => {
    const items = buildVaultItems(true);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      id: 'receipt-download',
      kind: 'receipt',
      cta: 'Open',
    });
  });
});
