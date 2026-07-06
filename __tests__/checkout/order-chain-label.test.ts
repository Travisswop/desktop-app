import { orderChainLabel, type MarketplaceOrder } from '@/lib/marketplace-api';

describe('orderChainLabel', () => {
  it('uses the recorded payment source chain when present', () => {
    const order = {
      payment: { validation: { details: { rail: 'lifi', sourceChain: '137' } } },
    } as MarketplaceOrder;
    expect(orderChainLabel(order)).toBe('Polygon');
  });

  it('maps a solana source chain', () => {
    const order = {
      payment: { validation: { details: { rail: 'solana', sourceChain: 'solana' } } },
    } as MarketplaceOrder;
    expect(orderChainLabel(order)).toBe('Solana');
  });

  it('falls back to the EVM settlement chain for older intent orders', () => {
    const order = {
      payment: { validation: { details: { rail: 'lifi' } } },
      settlement: { payoutRail: 'evm', destinationChain: '137' },
    } as MarketplaceOrder;
    expect(orderChainLabel(order)).toBe('Polygon');
  });

  it('labels an unknown EVM chain id without inventing a name', () => {
    const order = {
      settlement: { payoutRail: 'evm', destinationChain: '59144' },
    } as MarketplaceOrder;
    expect(orderChainLabel(order)).toBe('Chain 59144');
  });

  it('defaults legacy orders to Solana', () => {
    const order = {
      financial: { currency: 'USDC' },
      settlement: { payoutRail: 'solana' },
    } as MarketplaceOrder;
    expect(orderChainLabel(order)).toBe('Solana');
  });
});
