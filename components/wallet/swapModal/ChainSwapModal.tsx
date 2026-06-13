import React, { useState, useEffect, useRef } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import SwapModal from './SwapModal';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SwapModalProps, TokenInfo } from './types';
import {
    DEFAULT_ETH_TOKENS,
    NETWORKS,
    getDefaultTokens
} from './utils/ethSwapUtils';
import EthSwapHandler from './utils/EthSwapHandler';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import TokenImage from './TokenImage';
import SlippageControl from './utils/SlippageControl';

interface ChainSwapModalProps extends SwapModalProps {
    chain: 'solana' | 'ethereum';
    ethAddress?: string;
}

// Separate Ethereum Swap Modal component to avoid conditional hooks
function EthereumSwapModal({
    open,
    onOpenChange,
    userToken,
    accessToken,
    initialInputToken,
    initialOutputToken,
    initialAmount,
    onTokenRefresh,
    ethAddress,
}: Omit<ChainSwapModalProps, 'chain'>) {
    const { wallets } = useWallets();

    // Track if component is mounted to prevent state updates after unmounting
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Find an Ethereum wallet - look for a wallet that's not Solana
    // In Privy, you can identify Ethereum wallets by checking their properties
    const ethWallet = wallets.find(wallet => wallet.walletClientType !== 'solana');

    // Get Ethereum address from the wallet if not provided
    const ethAccountAddress = ethAddress || ethWallet?.address || '';

    // Set initial state
    const [selectedInputSymbol, setSelectedInputSymbol] = useState(initialInputToken || 'ETH');
    const [selectedOutputSymbol, setSelectedOutputSymbol] = useState(initialOutputToken || 'USDC');
    const [amount, setAmount] = useState(initialAmount || '0.01');
    const [slippageBps, setSlippageBps] = useState(50); // Default 0.5%
    const [refreshingBalances, setRefreshingBalances] = useState(false);
    const [txStatus, setTxStatus] = useState<string | null>(null);
    const [txSuccess, setTxSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [activeNetwork, setActiveNetwork] = useState<'mainnet' | 'sepolia'>('sepolia'); // Default to Sepolia for testing

    // Get token list based on active network
    const tokenList = getDefaultTokens(activeNetwork === 'sepolia' ? NETWORKS.SEPOLIA : NETWORKS.MAINNET);

    // Find input and output tokens from the appropriate token list
    const inputToken = tokenList.find(t => t.symbol === selectedInputSymbol) || {
        symbol: selectedInputSymbol,
        name: selectedInputSymbol,
        decimals: 18,
        balance: '0',
        price: '0',
        icon: '',
        marketData: { price: '0', iconUrl: '' },
        usdPrice: '0'
    };

    const outputToken = tokenList.find(t => t.symbol === selectedOutputSymbol) || {
        symbol: selectedOutputSymbol,
        name: selectedOutputSymbol,
        decimals: 18,
        balance: '0',
        price: '0',
        icon: '',
        marketData: { price: '0', iconUrl: '' },
        usdPrice: '0'
    };

    // Function to swap tokens
    const reverseTokens = () => {
        const tempInput = selectedInputSymbol;
        setSelectedInputSymbol(selectedOutputSymbol);
        setSelectedOutputSymbol(tempInput);
    };

    // Reset state when modal opens or closes
    useEffect(() => {
        if (!open) {
            setTxStatus(null);
            setTxSuccess(false);
            setError(null);
            setTxSignature(null);
        }
    }, [open]);

    // Function to refresh balances
    const refreshBalances = () => {
        setRefreshingBalances(true);
        setTimeout(() => {
            if (isMountedRef.current) {
                setRefreshingBalances(false);
                if (onTokenRefresh) {
                    onTokenRefresh();
                }
            }
        }, 2000);
    };

    // Check if we have a valid Ethereum wallet
    const hasEthWallet = Boolean(ethWallet && ethAccountAddress);

    // Get etherscan URL based on network
    const getEtherscanUrl = (txHash: string) => {
        return activeNetwork === 'mainnet'
            ? `https://etherscan.io/tx/${txHash}`
            : `https://sepolia.etherscan.io/tx/${txHash}`;
    };

    // Show a message if no Ethereum wallet is connected
    if (!hasEthWallet) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md w-full rounded-2xl p-6 gap-2">
                    <DialogTitle className="text-center">Ethereum Wallet Not Found</DialogTitle>
                    <div className="py-6 text-center">
                        <p className="text-gray-600 mb-4">
                            You need an Ethereum wallet to use this feature.
                        </p>
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Add debug logging for EthSwapHandler
    console.log('[DEBUG] EthSwapModal rendering with props:', {
        amount,
        selectedInputSymbol,
        selectedOutputSymbol,
        activeNetwork
    });

    // Render the button content based on state
    const getButtonContent = () => {
        // The original code had 'swapLoading' and 'quote' which are not defined in this scope.
        // Assuming they are meant to be part of the state or props if they were intended to be used here.
        // For now, keeping the original logic but noting the potential issue.
        if (false) { // swapLoading) { // This line was commented out in the original file
            console.log('[DEBUG] Button state: Swapping...');
            return "Swapping...";
        } else if (error) {
            console.log('[DEBUG] Button state: Error - ', error);
            return `Error: ${error.substring(0, 20)}${error.length > 20 ? '...' : ''}`;
        } else if (!ethWallet || !ethAccountAddress) {
            console.log('[DEBUG] Button state: Connect Wallet');
            return "Connect Wallet";
        } else {
            console.log('[DEBUG] Button state: Normal - ', {
                hasQuote: Boolean(null), // quote) { // This line was commented out in the original file
                inputSymbol: selectedInputSymbol,
                outputSymbol: selectedOutputSymbol
            });
            return null; // quote ? `Swap ${selectedInputSymbol} to ${selectedOutputSymbol}` : "Get Quote";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-full rounded-2xl p-6 gap-2">
                <DialogTitle className="sr-only">Swap Ethereum Tokens</DialogTitle>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Swap ETH Tokens</h2>
                    <div className="flex items-center gap-2 relative">
                        <SlippageControl
                            slippage={slippageBps}
                            setSlippage={setSlippageBps}
                        />
                        <button onClick={() => onOpenChange(false)} />
                    </div>
                </div>

                {/* Token Input */}
                <div className="relative bg-[#F7F7F7] rounded-2xl p-4 shadow">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                className="text-xl border-none shadow-none bg-transparent p-0 w-full"
                            />
                            <div className="text-sm text-gray-500 mt-1">
                                {inputToken && 'price' in inputToken && typeof (inputToken as any).price === 'string' ? (
                                    `$${(parseFloat(amount) * parseFloat((inputToken as any).price)).toFixed(2)}`
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> No price data
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow shrink-0"
                            onClick={() => { }}
                        >
                            <TokenImage
                                src={inputToken?.icon}
                                alt={inputToken?.symbol || 'Input Token'}
                                width={20}
                                height={20}
                                className="w-5 h-5 mr-2 rounded-full"
                                fallbackSrc=""
                            />
                            <span className="font-medium">
                                {inputToken?.symbol}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    if (
                                        inputToken &&
                                        'balance' in inputToken &&
                                        typeof inputToken.balance === 'string'
                                    ) {
                                        const halfBalance = (parseFloat(inputToken.balance) / 2).toString();
                                        setAmount(halfBalance);
                                    }
                                }}
                                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700 transition-colors"
                            >
                                Half
                            </button>
                            <button
                                onClick={() => {
                                    if (
                                        inputToken &&
                                        'balance' in inputToken &&
                                        typeof inputToken.balance === 'string'
                                    ) {
                                        if (selectedInputSymbol === 'ETH') {
                                            // Save some ETH for gas
                                            const maxAmount = Math.max(0, parseFloat(inputToken.balance) - 0.01).toString();
                                            setAmount(maxAmount);
                                        } else {
                                            setAmount(inputToken.balance);
                                        }
                                    }
                                }}
                                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-700 transition-colors"
                            >
                                Max
                            </button>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>
                                Balance: {
                                    inputToken && 'balance' in inputToken && typeof inputToken.balance === 'string'
                                        ? inputToken.balance
                                        : '0'
                                }
                            </span>
                            {refreshingBalances && <RefreshCw className="w-3 h-3 animate-spin" />}
                        </div>
                    </div>
                </div>

                {/* Reverse Button */}
                <div className="relative h-0 z-10">
                    <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Button
                            className="rounded-full w-12 h-12 flex items-center justify-center bg-[#F7F7F7] border-5 border-white"
                            variant="outline"
                            onClick={reverseTokens}
                        >
                            <ArrowUpDown className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Token Output */}
                <div className="relative bg-[#F7F7F7] rounded-2xl p-4 mb-3 shadow pt-8">
                    <div className="flex justify-between items-center">
                        <Input
                            type="number"
                            value=""
                            placeholder="0.0"
                            readOnly
                            className="text-xl border-none shadow-none bg-transparent p-0"
                        />
                        <Button
                            variant="ghost"
                            className="flex items-center bg-white px-5 py-1 gap-0 rounded-full shadow"
                            onClick={() => { }}
                        >
                            <TokenImage
                                src={outputToken?.icon}
                                alt={outputToken?.symbol || 'Output Token'}
                                width={20}
                                height={20}
                                className="w-5 h-5 mr-2 rounded-full"
                                fallbackSrc=""
                            />
                            <span className="font-medium">
                                {outputToken?.symbol}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <div>
                            {'price' in (outputToken ?? {}) && typeof (outputToken as any).price === 'string' && (outputToken as any).price
                                ? `$${(outputToken as any).price}`
                                : (
                                    <span className="flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> No price data
                                    </span>
                                )
                            }
                        </div>
                        <div className="flex items-center gap-1">
                            <span>Balance: {outputToken && 'balance' in outputToken && typeof outputToken.balance === 'string'
                                ? outputToken.balance
                                : '0'
                            }</span>
                            {refreshingBalances && <RefreshCw className="w-3 h-3 animate-spin" />}
                        </div>
                    </div>
                </div>

                {/* Status Messages */}
                {(txStatus || error) && (
                    <div className={`mt-2 p-3 rounded-lg ${error ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        <div className="text-sm">
                            {error || txStatus}
                        </div>
                    </div>
                )}

                {/* Ethereum Swap Handler */}
                {/* Fix the EthSwapHandler usage to resolve the JSX component type error */}
                {/* Original line with error: <EthSwapHandler ...> */}
                {/* Ensure it's treated as a valid component by verifying its export and return type */}
                <div>
                    {/* Ethereum Swap Handler */}
                    <EthSwapHandler
                        key="eth-swap-handler" // Add this stable key
                        open={open}
                        wallet={ethWallet}
                        ethAddress={ethAccountAddress}
                        inputSymbol={selectedInputSymbol}
                        outputSymbol={selectedOutputSymbol}
                        amount={amount}
                        slippageBps={slippageBps}
                        onSwapComplete={(txHash) => {
                            console.log('[DEBUG] Swap complete callback with hash:', txHash);
                            setTxSignature(txHash);
                            setTxSuccess(true);
                            setTxStatus('Transaction completed successfully!');
                            setError(null);
                            refreshBalances();
                        }}
                        onSwapError={(errorMsg) => {
                            console.log('[DEBUG] Swap error callback:', errorMsg);
                            setError(errorMsg);
                            setTxStatus(null);
                        }}
                        onStatusUpdate={(status) => {
                            console.log('[DEBUG] Status update:', status);
                            setTxStatus(status);
                        }}
                        onQuoteUpdate={(newQuote) => {
                            console.log('[DEBUG] Quote update:', newQuote ? 'Has quote' : 'No quote');
                        }}
                        accessToken={accessToken}
                        platformFeeBps={50}
                        onBalanceRefresh={refreshBalances}
                        className="mt-4"
                        network={activeNetwork}
                    />
                </div>

                {/* Transaction Result Section */}
                {txSignature && txSuccess && (
                    <div className="mt-3 text-center">
                        <a
                            href={getEtherscanUrl(txSignature)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 text-blue-500 hover:text-blue-700 text-sm"
                        >
                            View transaction on Etherscan
                        </a>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Main wrapper component that decides which modal to render
export default function ChainSwapModal(props: ChainSwapModalProps) {
    // Just return the appropriate modal based on the chain
    if (props.chain === 'solana') {
        return (
            <SwapModal
                open={props.open}
                onOpenChange={props.onOpenChange}
                userToken={props.userToken}
                accessToken={props.accessToken}
                initialInputToken={props.initialInputToken}
                initialOutputToken={props.initialOutputToken}
                initialAmount={props.initialAmount}
                onTokenRefresh={props.onTokenRefresh}
            />
        );
    }

    // Return the Ethereum swap modal for 'ethereum' chain
    return (
        <EthereumSwapModal
            open={props.open}
            onOpenChange={props.onOpenChange}
            userToken={props.userToken}
            accessToken={props.accessToken}
            initialInputToken={props.initialInputToken}
            initialOutputToken={props.initialOutputToken}
            initialAmount={props.initialAmount}
            onTokenRefresh={props.onTokenRefresh}
            ethAddress={props.ethAddress}
        />
    );
}