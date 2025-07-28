'use client';

import { LiFiWidget } from '@lifi/widget';
import { WidgetEvent, useWidgetEvents } from '@lifi/widget';
import { useEffect, useMemo, useState } from 'react';
import { ChainId } from '@lifi/widget';
import { useWallets, useSolanaWallets } from '@privy-io/react-auth';

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
    // Get Privy wallets directly
    const { wallets } = useWallets();
    const { wallets: solWallets } = useSolanaWallets();
    const [preferSolana, setPreferSolana] = useState(false);

    // Handle LiFi widget events
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

    // Alternative: Force wallet connection on switch
    useEffect(() => {
        if (preferSolana && solWallet && widgetEvents) {
            // Force LiFi to recognize the Solana wallet
            console.log('Forcing Solana wallet connection...');
            // You might need to trigger a custom event here
        }
    }, [preferSolana, solWallet, widgetEvents]);

    // Use the preferred wallet based on selection or availability
    const activeWallet = preferSolana ? solWallet : (ethWallet || solWallet);
    const activeAddress = activeWallet?.address || '';
    const isEthereumWallet = activeWallet === ethWallet;

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
            activeAddress,
            preferSolana,
            isEthereumWallet
        });
    }, [wallets, solWallets, activeAddress, isEthereumWallet, preferSolana, ethWallet, solWallet]);

    // Build LiFi widget config with proper Solana wallet configuration
    const widgetConfig = useMemo(() => {
        const baseConfig = {
            ...config,
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
            // Set default chains based on preference
            fromChain: preferSolana ? ChainId.SOL : ChainId.ETH,

            // Enhanced SDK config
            sdkConfig: {
                ...config.sdkConfig,
                rpcUrls: {
                    ...(config.sdkConfig?.rpcUrls || {}),
                    [ChainId.SOL]: [
                        'https://chaotic-restless-putty.solana-mainnet.quiknode.pro/',
                        'https://dacey-pp61jd-fast-mainnet.helius-rpc.com/',
                        'https://api.mainnet-beta.solana.com',
                    ],
                }
            }
        };

        // Configure wallet management differently for Solana vs Ethereum
        if (preferSolana && solWallet) {
            return {
                ...baseConfig,
                walletManagement: {
                    connect: {
                        external: true,
                        enabled: false, // Disable wallet connection UI since we're managing externally
                    },
                    signer: {
                        external: true,
                        enabled: true,
                    }
                },
                // For Solana, we need to provide wallet info in a specific format
                wallet: {
                    address: activeAddress,
                    chainId: ChainId.SOL,
                    provider: solWallet, // Pass the actual wallet object
                },
                // Also set walletAddress for backward compatibility
                walletAddress: activeAddress,
                // Set destination address to same as source for Solana
                toAddress: activeAddress,
            };
        } else if (ethWallet) {
            return {
                ...baseConfig,
                walletManagement: {
                    connect: {
                        external: true,
                        enabled: false, // Disable since we're managing externally
                    },
                    signer: {
                        external: true,
                        enabled: true,
                    }
                },
                walletAddress: activeAddress,
            };
        }

        // Fallback configuration
        return {
            ...baseConfig,
            walletManagement: {
                connect: {
                    external: false,
                    enabled: true,
                }
            }
        };
    }, [config, activeAddress, preferSolana, solWallet, ethWallet]);

    // Toggle between Ethereum and Solana wallets
    const toggleWallet = () => {
        setPreferSolana(!preferSolana);
    };

    return (
        <div className="w-full">
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
                Config Keys: {Object.keys(widgetConfig).join(', ')}
            </div>

            {/* Only render widget if we have an active address */}
            {activeAddress ? (
                <LiFiWidget
                    config={widgetConfig}
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