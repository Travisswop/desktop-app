import {
  getStoredWalletData,
  getPortfolioEvmWalletInput,
  selectPreferredWallet,
  shouldPreferEmbeddedWallets,
  tradingWalletSelectionOptions,
} from '@/components/wallet/hooks/useWalletData';
import { selectHyperliquidMasterWallet } from '@/components/wallet/perps/hyperliquidAgentSelection';

const wallets = [
  {
    address: '0xExternal',
    walletClientType: 'metamask',
    connectorType: 'injected',
  },
  {
    address: '0xEmbedded',
    walletClientType: 'privy',
    connectorType: 'embedded',
  },
];

describe('trading wallet selection', () => {
  const originalExternalWalletFlag =
    process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;

  afterEach(() => {
    if (originalExternalWalletFlag === undefined) {
      delete process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;
    } else {
      process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS =
        originalExternalWalletFlag;
    }
  });

  it('defaults trading surfaces to the embedded Privy wallet', () => {
    delete process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;

    expect(shouldPreferEmbeddedWallets()).toBe(true);
    expect(
      selectPreferredWallet(
        wallets,
        '0xExternal',
        tradingWalletSelectionOptions(),
      )?.address,
    ).toBe('0xEmbedded');
  });

  it('prefers the primary embedded wallet when multiple embedded wallets exist', () => {
    delete process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;

    const multipleEmbeddedWallets = [
      {
        address: '0xEmptyEmbedded',
        walletClientType: 'privy',
        connectorType: 'embedded',
      },
      {
        address: '0xFundedEmbedded',
        walletClientType: 'privy-v2',
        connectorType: 'embedded',
      },
    ];

    expect(
      selectPreferredWallet(
        multipleEmbeddedWallets,
        '0xFundedEmbedded',
        tradingWalletSelectionOptions(),
      )?.address,
    ).toBe('0xFundedEmbedded');
  });

  it('prefers the backend canonical wallet before Privy linked-account order', () => {
    delete process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;

    const multipleEmbeddedWallets = [
      {
        address: '0xInaccessibleEmbedded',
        walletClientType: 'privy',
        connectorType: 'embedded',
      },
      {
        address: '0xFundedLocalEmbedded',
        walletClientType: 'privy',
        connectorType: 'embedded',
      },
    ];

    expect(
      selectPreferredWallet(
        multipleEmbeddedWallets,
        '0xInaccessibleEmbedded',
        {
          ...tradingWalletSelectionOptions(),
          preferredAddresses: ['0xFundedLocalEmbedded'],
        },
      )?.address,
    ).toBe('0xFundedLocalEmbedded');
  });

  it('ignores preferred external wallets for embedded-only trading surfaces', () => {
    delete process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;

    expect(
      selectPreferredWallet(wallets, '0xExternal', {
        ...tradingWalletSelectionOptions(),
        preferredAddresses: ['0xExternal'],
      })?.address,
    ).toBe('0xEmbedded');
  });

  it('allows explicit external wallet testing', () => {
    process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS = 'true';

    expect(shouldPreferEmbeddedWallets()).toBe(false);
    expect(
      selectPreferredWallet(
        wallets,
        '0xExternal',
        tradingWalletSelectionOptions(),
      )?.address,
    ).toBe('0xExternal');
  });

  it('uses every linked EVM wallet for portfolio balance totals', () => {
    expect(
      getPortfolioEvmWalletInput('0xEmbedded', [
        '0xEmbedded',
        '0xExternal',
      ]),
    ).toEqual(['0xEmbedded', '0xExternal']);
  });

  it('falls back to the preferred EVM wallet when no address list exists', () => {
    expect(getPortfolioEvmWalletInput('0xEmbedded')).toBe(
      '0xEmbedded',
    );
  });

  it('builds wallet data from backend-stored wallet addresses', () => {
    expect(
      getStoredWalletData({
        ethereumWallet: '0xStoredEvm',
        solanaWallet: 'storedSolana',
      }),
    ).toEqual([
      { address: 'storedSolana', isActive: false, isEVM: false },
      { address: '0xStoredEvm', isActive: false, isEVM: true },
    ]);
  });

  it('rehydrates the Hyperliquid wallet that already has a saved agent key', () => {
    delete process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;

    const multipleEmbeddedWallets = [
      {
        address: '0xFreshEmbedded',
        walletClientType: 'privy',
        connectorType: 'embedded',
      },
      {
        address: '0xSavedAgentEmbedded',
        walletClientType: 'privy-v2',
        connectorType: 'embedded',
      },
    ];

    expect(
      selectHyperliquidMasterWallet({
        wallets: multipleEmbeddedWallets,
        preferredAddresses: ['0xFreshEmbedded'],
        options: tradingWalletSelectionOptions(),
        hasSavedAgentKey: (address) =>
          address.toLowerCase() === '0xsavedagentembedded',
      })?.address,
    ).toBe('0xSavedAgentEmbedded');
  });

  it('falls back to the preferred Hyperliquid wallet when no saved agent exists', () => {
    delete process.env.NEXT_PUBLIC_PRIVY_ENABLE_EXTERNAL_WALLETS;

    expect(
      selectHyperliquidMasterWallet({
        wallets,
        preferredAddresses: ['0xEmbedded'],
        options: tradingWalletSelectionOptions(),
        hasSavedAgentKey: () => false,
      })?.address,
    ).toBe('0xEmbedded');
  });
});
