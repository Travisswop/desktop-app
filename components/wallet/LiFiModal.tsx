'use client';

import { LiFiWidget, WidgetConfig } from '@lifi/widget';
import { WidgetEvent, useWidgetEvents } from '@lifi/widget';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChainId } from '@lifi/widget';
import { EVM } from '@lifi/sdk';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import { createWalletClient, custom } from 'viem';
import { mainnet, polygon, base, arbitrum, optimism, bsc } from 'viem/chains';
import { PrivySolanaSync } from './PrivySolanaSync';
import { PrivyWalletAdapter } from './PrivyWalletAdapter'; // Import your adapter
import { PrivyTransactionSignerProvider } from './PrivyTransactionSigner';
import SwapModal from './swapModal/SwapModal';
import { useSwapStore } from '@/zustandStore/tokenSwapProps';

// Map numeric chainId → viem Chain object so wallet clients are properly typed.
// Add chains here whenever new networks are supported.
const VIEM_CHAIN_MAP: Record<number, Parameters<typeof createWalletClient>[0]['chain']> = {
  [mainnet.id]:   mainnet,
  [polygon.id]:   polygon,
  [base.id]:      base,
  [arbitrum.id]:  arbitrum,
  [optimism.id]:  optimism,
  [bsc.id]:       bsc,
};

const defaultConfig = {
  variant: 'compact',
  subvariant: 'split',
  appearance: 'light',
  theme: {
    typography: {},
    header: {
      overflow: 'visible',
    },
    container: {
      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
      borderRadius: '24px',
    },
    shape: {
      borderRadius: 12,
      borderRadiusSecondary: 16,
    },
    colorSchemes: {
      light: {
        palette: {
          primary: {
            main: '#140925',
          },
          secondary: {
            main: '#8700B8',
          },
          background: {
            default: '#fafafa',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#000000',
            secondary: '#818084',
          },
          grey: {
            200: '#ECEBF0',
            300: '#E5E1EB',
            700: '#70767A',
            800: '#4B4F52',
          },
          playground: {
            main: '#F3EBFF',
          },
        },
      },
      dark: {
        palette: {
          primary: {
            main: '#653BA3',
          },
          secondary: {
            main: '#D35CFF',
          },
          background: {
            default: '#24203D',
            paper: '#302B52',
          },
          text: {
            primary: '#ffffff',
            secondary: '#9490a5',
          },
          grey: {
            200: '#ECEBF0',
            300: '#DDDCE0',
            700: '#70767A',
            800: '#3c375c',
          },
          playground: {
            main: '#120F29',
          },
        },
      },
    },
    components: {
      MuiCard: {
        defaultProps: {
          variant: 'elevation',
        },
      },
    },
  },
};

interface LiFiModalProps {
  config: any;
  onSwapComplete?: () => void;
  integrator?: string;
}

export default function LiFiModal({
  config = defaultConfig,
  onSwapComplete,
  integrator = 'SWOP',
}: LiFiModalProps) {
  const { wallets } = useWallets();
  const { wallets: solWallets } = useSolanaWallets();
  const { connected: solanaConnected, publicKey: solanaPublicKey } =
    useWallet();
  const [preferSolana, setPreferSolana] = useState(false);
  const [widgetKey, setWidgetKey] = useState(0);
  const [privyAdapter, setPrivyAdapter] =
    useState<PrivyWalletAdapter | null>(null);

  // Tracks the chainId last set by switchEvmChain so getEvmWalletClient
  // can include the correct chain object on every wallet client it returns.
  // LiFi always calls switchChain(id) before getWalletClient(), so this ref
  // is always populated by the time a transaction is sent.
  const activeEvmChainIdRef = useRef<number>(ChainId.ETH);

  const widgetEvents = useWidgetEvents();

  // Find Ethereum and Solana wallets
  const ethWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === 'privy' &&
      wallet.chainId &&
      wallet.chainId.includes('eip155:'),
  );

  // ─── Custom EVM provider for LiFi SDK ──────────────────────────────────
  // Bypasses wagmi's connector chain-switching entirely.
  // Privy's EIP-1193 provider natively supports all EVM chains, so
  // signTypedData (used for EIP-2612 permits) always uses the correct domain.
  const getEvmWalletClient = useCallback(async () => {
    // Prefer external wallet (MetaMask/Rabby) for master-account bridging;
    // fall back to Privy embedded EVM wallet.
    const evmWallet =
      wallets.find((w) => w.walletClientType !== 'privy') ??
      wallets.find((w) => w.chainId?.includes('eip155:'));
    if (!evmWallet) throw new Error('No EVM wallet connected');
    const provider = await evmWallet.getEthereumProvider();
    // chain MUST be set — viem's sendTransaction (used for approve) asserts
    // that the wallet client has a chain or throws "No chain was provided".
    // activeEvmChainIdRef is kept in sync by switchEvmChain which LiFi always
    // calls before requesting a wallet client for a new chain.
    const chain = VIEM_CHAIN_MAP[activeEvmChainIdRef.current] ?? VIEM_CHAIN_MAP[ChainId.ETH];
    return createWalletClient({
      account: evmWallet.address as `0x${string}`,
      chain,
      transport: custom(provider),
    });
  }, [wallets]);

  const switchEvmChain = useCallback(async (chainId: number) => {
    const evmWallet =
      wallets.find((w) => w.walletClientType !== 'privy') ??
      wallets.find((w) => w.chainId?.includes('eip155:'));
    if (!evmWallet) throw new Error('No EVM wallet connected');
    // For external wallets, explicitly request the chain switch so
    // MetaMask/Rabby shows the correct network before signing permits.
    if (evmWallet.walletClientType !== 'privy') {
      await evmWallet.switchChain(chainId);
    }
    // Persist so getEvmWalletClient returns a client on the correct chain.
    activeEvmChainIdRef.current = chainId;
    const provider = await evmWallet.getEthereumProvider();
    return createWalletClient({
      account: evmWallet.address as `0x${string}`,
      chain: VIEM_CHAIN_MAP[chainId],
      transport: custom(provider),
    });
  }, [wallets]);

  const solWallet =
    solWallets && solWallets.length > 0 ? solWallets[0] : null;

  // Create and manage Privy Wallet Adapter for Solana
  useEffect(() => {
    if (solWallet) {
      console.log('Creating PrivyWalletAdapter for wallet:', {
        address: solWallet.address,
        chainType: (solWallet as any).chainType,
        walletClientType: (solWallet as any).walletClientType,
      });

      const adapter = new PrivyWalletAdapter({
        wallet: solWallet as any,
      });
      setPrivyAdapter(adapter);

      // Clean up previous adapter
      return () => {
        if (adapter.connected) {
          adapter.disconnect().catch(console.error);
        }
      };
    } else {
      setPrivyAdapter(null);
    }
  }, [solWallet]);

  // Connect the adapter when needed
  useEffect(() => {
    if (privyAdapter && preferSolana && !privyAdapter.connected) {
      console.log('Connecting PrivyWalletAdapter...');
      privyAdapter.connect().catch((error) => {
        console.error('Failed to connect PrivyWalletAdapter:', error);
      });
    }
  }, [privyAdapter, preferSolana]);

  useEffect(() => {
    const onRouteExecutionCompleted = () => {
      console.log('Swap completed successfully');
      if (onSwapComplete) {
        onSwapComplete();
      }
    };

    const onRouteExecutionFailed = (error: any) => {
      console.error('Swap failed with error:', error);
      alert(
        `Swap failed: ${error?.message || 'Unknown error occurred'}`,
      );
    };

    const onWalletConnected = (wallet: any) => {
      console.log('LiFi wallet connected:', wallet);
    };

    const onSignatureRequired = (signatureData: any) => {
      console.warn(
        'Signature required for transaction:',
        signatureData,
      );
      alert(
        'Please sign the transaction in your Solana wallet to complete the swap',
      );
    };

    const onTransactionUpdated = (transactionData: any) => {
      console.log('Transaction updated:', transactionData);
    };

    widgetEvents.on(
      WidgetEvent.RouteExecutionCompleted,
      onRouteExecutionCompleted,
    );
    widgetEvents.on(
      WidgetEvent.RouteExecutionFailed,
      onRouteExecutionFailed,
    );
    widgetEvents.on(WidgetEvent.WalletConnected, onWalletConnected);
    widgetEvents.on('signature_required' as any, onSignatureRequired);
    widgetEvents.on(
      'transaction_updated' as any,
      onTransactionUpdated,
    );

    return () => {
      widgetEvents.off(
        WidgetEvent.RouteExecutionCompleted,
        onRouteExecutionCompleted,
      );
      widgetEvents.off(
        WidgetEvent.RouteExecutionFailed,
        onRouteExecutionFailed,
      );
      widgetEvents.off(
        WidgetEvent.WalletConnected,
        onWalletConnected,
      );
      widgetEvents.off(
        'signature_required' as any,
        onSignatureRequired,
      );
      widgetEvents.off(
        'transaction_updated' as any,
        onTransactionUpdated,
      );
    };
  }, [widgetEvents, onSwapComplete]);

  // Force widget re-render when switching wallets or connection changes
  useEffect(() => {
    setWidgetKey((prev) => prev + 1);
  }, [preferSolana, solanaConnected, privyAdapter?.connected]);

  // Use the preferred wallet based on selection or availability
  const activeWallet = preferSolana
    ? solWallet
    : ethWallet || solWallet;
  const activeAddress = activeWallet?.address || '';
  const isEthereumWallet = activeWallet === ethWallet;

  // Build LiFi widget config with wallet management
  const widgetConfig = useMemo(() => {
    const baseConfig = {
      ...defaultConfig,
      integrator,
      sdkConfig: {
        // Provide private RPC URLs for all chains LiFi can route through.
        // Without these, the LiFi SDK falls back to public RPCs which are
        // rate-limited and can return stale nonces, causing permit failures.
        rpcUrls: {
          [ChainId.ETH]: [process.env.NEXT_PUBLIC_ALCHEMY_ETH_URL!].filter(Boolean),
          [ChainId.POL]: [process.env.NEXT_PUBLIC_ALCHEMY_POLYGON_URL!].filter(Boolean),
          [ChainId.BAS]: [process.env.NEXT_PUBLIC_ALCHEMY_BASE_URL!].filter(Boolean),
          [ChainId.ARB]: [process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM_URL!].filter(Boolean),
          [ChainId.SOL]: [process.env.NEXT_PUBLIC_SOLANA_RPC_URL!].filter(Boolean),
        },
      },
    };

    // For Solana wallet with custom adapter
    if (preferSolana && solWallet && privyAdapter) {
      return {
        ...baseConfig,
        fromChain: ChainId.SOL,
        chains: {
          allow: [ChainId.SOL],
          deny: [],
        },
        // Configure wallet management for Solana
        walletConfig: {
          onConnect: async () => {
            console.log('LiFi requesting wallet connection...');
            if (!privyAdapter.connected) {
              await privyAdapter.connect();
            }
            return {
              account: privyAdapter.publicKey?.toBase58() || '',
              chainId: ChainId.SOL,
            };
          },
          onDisconnect: async () => {
            console.log('LiFi requesting wallet disconnection...');
            if (privyAdapter.connected) {
              await privyAdapter.disconnect();
            }
          },
        },
        // Custom Solana signer
        walletManagement: {
          signer: privyAdapter.connected
            ? {
                signTransaction: async (transaction: any) => {
                  console.log(
                    'LiFi requesting transaction signature...',
                    {
                      transaction,
                      walletAddress:
                        privyAdapter.publicKey?.toBase58(),
                      connected: privyAdapter.connected,
                      readyState: privyAdapter.readyState,
                    },
                  );
                  try {
                    const signed =
                      await privyAdapter.signTransaction(transaction);
                    console.log('Transaction signed successfully');
                    return signed;
                  } catch (error) {
                    console.error(
                      'Failed to sign transaction:',
                      error,
                    );
                    throw error;
                  }
                },
                signAllTransactions: async (transactions: any[]) => {
                  console.log(
                    'LiFi requesting multiple transaction signatures...',
                  );
                  return await privyAdapter.signAllTransactions(
                    transactions,
                  );
                },
                publicKey: privyAdapter.publicKey,
                connected: privyAdapter.connected,
              }
            : undefined,
        },
      };
    }
    // For Ethereum wallet — inject a custom EVM provider so LiFi's SDK uses
    // Privy's EIP-1193 provider directly for ALL signing operations.
    // Also set disableMessageSigning=true because Privy embedded wallets are
    // EIP-7702 smart accounts: their eth_signTypedData_v4 signs with a session
    // sub-key, so ecrecover on-chain returns the sub-key address, not the
    // account address → EIP2612: invalid signature.
    // disableMessageSigning forces LiFi to use the standard approve+transferFrom
    // flow instead of EIP-2612 native permits or Permit2.
    else if (ethWallet) {
      return {
        ...baseConfig,
        fromChain: ChainId.ETH,
        chains: {
          allow: [
            ChainId.ETH,
            ChainId.POL,
            ChainId.BAS,
            ChainId.ARB,
            ChainId.OPT,
          ],
        },
        sdkConfig: {
          ...baseConfig.sdkConfig,
          executionOptions: {
            // Disable EIP-2612 native permits and Permit2 message signing.
            // This is the official LiFi flag for smart contract wallets that
            // cannot produce a raw ECDSA signature compatible with ecrecover.
            disableMessageSigning: true,
          },
          providers: [
            EVM({
              getWalletClient: getEvmWalletClient,
              switchChain: switchEvmChain,
            }),
          ],
        },
      };
    }

    return baseConfig;
  }, [preferSolana, solWallet, ethWallet, integrator, privyAdapter, getEvmWalletClient, switchEvmChain]);

  // Log debug information
  useEffect(() => {
    console.log('Debug - Enhanced wallet info:', {
      ethWallet: ethWallet
        ? {
            address: ethWallet.address,
            type: ethWallet.type,
            walletClientType: ethWallet.walletClientType,
            chainId: ethWallet.chainId,
          }
        : null,
      solWallet: solWallet
        ? {
            address: solWallet.address,
            chainType: (solWallet as any).chainType,
            walletClientType: (solWallet as any).walletClientType,
          }
        : null,
      privyAdapter: privyAdapter
        ? {
            connected: privyAdapter.connected,
            publicKey: privyAdapter.publicKey?.toBase58(),
            readyState: privyAdapter.readyState,
          }
        : null,
      solanaAdapterConnected: solanaConnected,
      solanaAdapterPublicKey: solanaPublicKey?.toBase58(),
      activeAddress,
      preferSolana,
      isEthereumWallet,
      hasWalletConfig: preferSolana && privyAdapter ? 'YES' : 'NO',
    });
  }, [
    wallets,
    solWallets,
    activeAddress,
    isEthereumWallet,
    preferSolana,
    ethWallet,
    solWallet,
    solanaConnected,
    solanaPublicKey,
    privyAdapter,
  ]);

  // Toggle between Ethereum and Solana wallets
  const toggleWallet = () => {
    setPreferSolana(!preferSolana);
  };

  const {
    userToken,
    accessToken,
    initialInputToken,
    initialOutputToken,
    initialAmount,
    onTokenRefresh,
  } = useSwapStore();

  return (
    <div className="w-full">
      {/* Wallet Selection UI */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="text-sm font-medium">Connected Wallets:</div>
        <div className="flex gap-2 mb-3">
          {ethWallet && (
            <button
              onClick={() => setPreferSolana(false)}
              className={`px-3 py-1 text-sm rounded-md flex gap-1 items-center ${
                !preferSolana
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              ETH: {ethWallet.address.slice(0, 6)}...
              {ethWallet.address.slice(-4)}
            </button>
          )}
          {solWallet && (
            <button
              onClick={() => setPreferSolana(true)}
              className={`px-3 py-1 text-sm rounded-md flex gap-1 items-center ${
                preferSolana
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              SOL: {solWallet.address.slice(0, 6)}...
              {solWallet.address.slice(-4)}
              {privyAdapter?.connected && (
                <span className="text-xs">✓</span>
              )}
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 mb-2">
          Using {isEthereumWallet ? 'Ethereum' : 'Solana'} wallet for
          this swap.
          {ethWallet && solWallet && (
            <button
              onClick={toggleWallet}
              className="text-blue-500 ml-1 underline"
            >
              Switch to {isEthereumWallet ? 'Solana' : 'Ethereum'}
            </button>
          )}
        </div>
      </div>
      {preferSolana ? (
        <SwapModal
          userToken={userToken}
          accessToken={accessToken || ''}
          initialInputToken={initialInputToken || ''}
          initialOutputToken={initialOutputToken || ''}
          initialAmount={initialAmount || ''}
          onTokenRefresh={onTokenRefresh}
        />
      ) : (
        <PrivyTransactionSignerProvider>
          {/* <PrivySolanaSync /> */}
          {/* Only render widget if we have an active address */}
          {activeAddress ? (
            <LiFiWidget
              key={`${widgetKey}-${
                preferSolana ? 'sol' : 'eth'
              }-${activeAddress}-${privyAdapter?.connected}`}
              config={widgetConfig as Partial<WidgetConfig>}
              integrator={integrator}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              Please connect a wallet to continue
            </div>
          )}
        </PrivyTransactionSignerProvider>
      )}
    </div>
  );
}
