'use client';

import { LiFiWidget, WidgetConfig } from '@lifi/widget';
import { WidgetEvent, useWidgetEvents } from '@lifi/widget';
import { useEffect, useMemo, useState } from 'react';
import { ChainId } from '@lifi/widget';
import { useWallets, useSolanaWallets } from '@privy-io/react-auth';
import { useWallet } from '@solana/wallet-adapter-react';
import { PrivySolanaSync } from './PrivySolanaSync';

interface LiFiModalProps {
    config: any;
    onSwapComplete?: () => void;
    integrator?: string;
}

export default function LiFiModal({
    config,
    onSwapComplete,
    integrator = 'nextjs-example'
}: LiFiModalProps) {
    const { wallets } = useWallets();
    const { wallets: solWallets } = useSolanaWallets();
    const { connected: solanaConnected, publicKey: solanaPublicKey } = useWallet();
    const [preferSolana, setPreferSolana] = useState(false);
    const [widgetKey, setWidgetKey] = useState(0);

    const widgetEvents = useWidgetEvents();

    useEffect(() => {
        const onRouteExecutionCompleted = () => {
            console.log('Swap completed successfully');
            if (onSwapComplete) {
                onSwapComplete();
            }
        };

        const onRouteExecutionFailed = () => {
            console.log('Swap failed');
        };

        const onWalletConnected = (wallet: any) => {
            console.log('LiFi wallet connected:', wallet);
        };

        widgetEvents.on(WidgetEvent.RouteExecutionCompleted, onRouteExecutionCompleted);
        widgetEvents.on(WidgetEvent.RouteExecutionFailed, onRouteExecutionFailed);
        widgetEvents.on(WidgetEvent.WalletConnected, onWalletConnected);

        return () => {
            widgetEvents.off(WidgetEvent.RouteExecutionCompleted, onRouteExecutionCompleted);
            widgetEvents.off(WidgetEvent.RouteExecutionFailed, onRouteExecutionFailed);
            widgetEvents.off(WidgetEvent.WalletConnected, onWalletConnected);
        };
    }, [widgetEvents, onSwapComplete]);

    // Find Ethereum and Solana wallets
    const ethWallet = wallets.find(wallet =>
        wallet.walletClientType === 'privy' &&
        wallet.chainId && wallet.chainId.includes('eip155:')
    );

    const solWallet = solWallets && solWallets.length > 0 ? solWallets[0] : null;

    // Force widget re-render when switching wallets or connection changes
    useEffect(() => {
        setWidgetKey(prev => prev + 1);
    }, [preferSolana, solanaConnected]);

    // Use the preferred wallet based on selection or availability
    const activeWallet = preferSolana ? solWallet : (ethWallet || solWallet);
    const activeAddress = activeWallet?.address || '';
    const isEthereumWallet = activeWallet === ethWallet;

    // Build LiFi widget config
    const widgetConfig = useMemo(() => {
        const baseConfig = {
            variant: 'expandable',
            appearance: 'light',
            containerStyle: {
                width: '100%',
                height: '100%',
                border: 'none',
            },
            theme: {
                container: {
                    border: '1px solid rgb(234, 234, 234)',
                    borderRadius: '16px',
                },
            },
            integrator,
            sdkConfig: {
                rpcUrls: {
                    [ChainId.SOL]: [
                        'https://chaotic-restless-putty.solana-mainnet.quiknode.pro/',
                        'https://dacey-pp61jd-fast-mainnet.helius-rpc.com/',
                        'https://api.mainnet-beta.solana.com',
                    ],
                }
            }
        };
        // For Solana wallet
        if (preferSolana && solWallet) {
            return {
                ...baseConfig,
                fromChain: ChainId.SOL,
                chains: {
                    allow: [ChainId.SOL],
                    deny: []
                }
            };
        } 
        // For Ethereum wallet
        else if (ethWallet) {
            return {
                ...baseConfig,
                fromChain: ChainId.ETH,
                chains: {
                    allow: [ChainId.ETH, ChainId.POL, ChainId.BSC, ChainId.ARB, ChainId.OPT]
                }
            };
        }

        return baseConfig;
    }, [preferSolana, solWallet, ethWallet, integrator]);

    // Log available wallets for debugging
    useEffect(() => {
        console.log("Debug - Wallet info:", {
            ethWallet: ethWallet ? {
                address: ethWallet.address,
                type: ethWallet.type,
                walletClientType: ethWallet.walletClientType,
                chainId: ethWallet.chainId
            } : null,
            solWallet: solWallet ? {
                address: solWallet.address
            } : null,
            solanaAdapterConnected: solanaConnected,
            solanaAdapterPublicKey: solanaPublicKey?.toBase58(),
            activeAddress,
            preferSolana,
            isEthereumWallet,
            hasWalletConfig: 'NO'
        });
    }, [wallets, solWallets, activeAddress, isEthereumWallet, preferSolana, ethWallet, solWallet, solanaConnected, solanaPublicKey]);

    // Toggle between Ethereum and Solana wallets
    const toggleWallet = () => {
        setPreferSolana(!preferSolana);
    };

    return (
        <div className="w-full">
            {/* Include Privy Solana Sync */}
            <PrivySolanaSync />
            
            {/* Wallet Selection UI */}
            <div className="mb-4 flex flex-col gap-2">
                <div className="text-sm font-medium">Connected Wallets:</div>
                <div className="flex gap-2 mb-3">
                    {ethWallet && (
                        <button
                            onClick={() => setPreferSolana(false)}
                            className={`px-3 py-1 text-sm rounded-md flex gap-1 items-center ${!preferSolana ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            ETH: {ethWallet.address.slice(0, 6)}...{ethWallet.address.slice(-4)}
                        </button>
                    )}
                    {solWallet && (
                        <button
                            onClick={() => setPreferSolana(true)}
                            className={`px-3 py-1 text-sm rounded-md flex gap-1 items-center ${preferSolana ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            SOL: {solWallet.address.slice(0, 6)}...{solWallet.address.slice(-4)}
                            {solanaConnected && <span className="text-xs">✓</span>}
                        </button>
                    )}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                    Using {isEthereumWallet ? 'Ethereum' : 'Solana'} wallet for this swap.
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

            {/* Show current active wallet info for debugging */}
            <div className="mb-2 p-2 bg-gray-100 text-xs rounded">
                <strong>Debug:</strong> Active Address: {activeAddress} |
                Wallet Type: {isEthereumWallet ? 'ETH' : 'SOL'} |
                Prefer Solana: {preferSolana.toString()} |
                Solana Adapter Connected: {solanaConnected.toString()} |
                Adapter PublicKey: {solanaPublicKey?.toBase58() || 'None'} |
                Has Wallet Config: NO |
                Config Keys: {Object.keys(widgetConfig).join(', ')}
            </div>

            {/* Only render widget if we have an active address */}
            {activeAddress ? (
                <LiFiWidget
                    key={`${widgetKey}-${preferSolana ? 'sol' : 'eth'}-${activeAddress}-${solanaConnected}`}
                    config={widgetConfig as Partial<WidgetConfig>}
                    integrator={integrator}
                />
            ) : (
                <div className="p-4 text-center text-gray-500">
                    Please connect a wallet to continue
                </div>
            )}
        </div>
    );
}