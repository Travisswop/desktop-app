import { solanaWalletConnectorOptions } from '@/lib/privy/solanaWalletConnectors';

describe('Privy Solana wallet connectors', () => {
  it('auto-connects the signed-in user wallet so the main Solana wallet can sign by default', () => {
    expect(solanaWalletConnectorOptions.shouldAutoConnect).toBe(true);
  });
});
